"""
Hybrid Road Damage Prediction — YOLO-First Architecture
══════════════════════════════════════════════════════════
Uses onnxruntime instead of ultralytics/PyTorch.

Build time comparison:
  ultralytics + torch : ~800 MB download, 20+ min build
  onnxruntime         : ~15 MB download,  1 min build

PIPELINE (YOLO-first, Keras-supplementary)
──────────────────────────────────────────
  Step 1 — YOLO ONNX (primary detector)
      Runs object detection for D00/D10/D20/D40.
      If detected with confidence >= threshold → DAMAGE CONFIRMED
      If nothing detected → Step 2

  Step 2 — KERAS TFLite (supplementary check)
      Only used when YOLO finds nothing.
      prob >= 0.50 → NOT a road (Keras is over-sensitive, so high prob = not a road image)
      prob <  0.50 → Clean road (low Keras score = normal road surface)

  NOTE: The Keras model is over-sensitive (predicts 98% damage on random noise).
  It cannot be trusted as a primary detector. YOLO is the reliable model.

YOLO CLASS MAP (best (3).pt — custom-trained RDD2022)
  0: D00 — Longitudinal Crack
  1: D10 — Transverse Crack
  2: D20 — Alligator Crack
  3: D40 — Pothole
"""

import os
import io
import numpy as np
from PIL import Image
from typing import Dict, Any, Optional

# ── Imports ───────────────────────────────────────────────────────────────────
try:
    from predict_keras import predict_damage as keras_predict_raw, KERAS_AVAILABLE
except ImportError:
    KERAS_AVAILABLE = False

YOLO_AVAILABLE = False
_ort_session   = None
try:
    import onnxruntime as ort
    YOLO_AVAILABLE = True
except ImportError:
    pass

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR        = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
YOLO_ONNX_PATH  = os.path.join(BASE_DIR, "road_damage_yolo.onnx")

# ── Thresholds ────────────────────────────────────────────────────────────────
YOLO_CONF_THRESHOLD      = 0.25   # YOLO confidence threshold (lowered from 0.40 for better recall)
YOLO_HIGH_CONF           = 0.50   # High-confidence YOLO detection (certain damage)
KERAS_NOT_ROAD_THRESHOLD = 0.15   # Below 15% Keras = likely not a road at all

# ── Class mapping ─────────────────────────────────────────────────────────────
# best (3).pt class order (4 classes, output shape: 1x8x8400)
DAMAGE_CLASSES = {
    0: "D00",  # Longitudinal Crack
    1: "D10",  # Transverse Crack
    2: "D20",  # Alligator Crack
    3: "D40",  # Pothole
}
DAMAGE_LABELS = {
    "D00": "Longitudinal Crack",
    "D10": "Transverse Crack",
    "D20": "Alligator Crack",
    "D40": "Pothole",
}
DAMAGE_LABELS_AR = {
    "D00": "شق طولي",
    "D10": "شق عرضي",
    "D20": "شق تمساحي",
    "D40": "حفرة",
}

# ── YOLO ONNX helpers ─────────────────────────────────────────────────────────

def load_yolo_model():
    global _ort_session
    if _ort_session is not None:
        return _ort_session
    if not YOLO_AVAILABLE:
        raise RuntimeError("onnxruntime not installed.")
    if not os.path.exists(YOLO_ONNX_PATH):
        raise FileNotFoundError(f"YOLO ONNX model not found: {YOLO_ONNX_PATH}")
    mb = os.path.getsize(YOLO_ONNX_PATH) / 1024 / 1024
    print(f"Loading YOLO ONNX ({mb:.1f} MB): {YOLO_ONNX_PATH}")
    _ort_session = ort.InferenceSession(
        YOLO_ONNX_PATH,
        providers=["CPUExecutionProvider"],
    )
    print("YOLO ONNX session ready.")
    return _ort_session


def _preprocess_yolo(image: Image.Image, size: int = 640) -> tuple:
    """Resize + normalize to (1, 3, 640, 640) float32. Returns (tensor, scale, pad_x, pad_y)."""
    orig_w, orig_h = image.size
    # letterbox resize keeping aspect ratio
    scale = min(size / orig_w, size / orig_h)
    new_w = int(orig_w * scale)
    new_h = int(orig_h * scale)
    resized = image.resize((new_w, new_h), Image.Resampling.BILINEAR)

    # pad to square
    canvas = Image.new("RGB", (size, size), (114, 114, 114))
    pad_x  = (size - new_w) // 2
    pad_y  = (size - new_h) // 2
    canvas.paste(resized, (pad_x, pad_y))

    arr  = np.array(canvas, dtype=np.float32) / 255.0
    arr  = arr.transpose(2, 0, 1)           # HWC -> CHW
    arr  = np.expand_dims(arr, axis=0)      # -> (1, 3, 640, 640)

    return arr, scale, pad_x, pad_y


def _nms(detections, iou_threshold=0.5):
    """Simple non-maximum suppression to remove overlapping boxes."""
    if len(detections) <= 1:
        return detections

    # Sort by confidence (highest first)
    detections.sort(key=lambda d: d["conf"], reverse=True)
    keep = []

    while detections:
        best = detections.pop(0)
        keep.append(best)
        remaining = []
        for det in detections:
            iou = _compute_iou(best, det)
            if iou < iou_threshold:
                remaining.append(det)
        detections = remaining

    return keep


def _compute_iou(a, b):
    """Compute IoU between two detection dicts with x1,y1,x2,y2."""
    x1 = max(a["x1"], b["x1"])
    y1 = max(a["y1"], b["y1"])
    x2 = min(a["x2"], b["x2"])
    y2 = min(a["y2"], b["y2"])
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    area_a = max(0, a["x2"] - a["x1"]) * max(0, a["y2"] - a["y1"])
    area_b = max(0, b["x2"] - b["x1"]) * max(0, b["y2"] - b["y1"])
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0


def _run_yolo_onnx(image: Image.Image):
    """
    Run YOLO ONNX inference.
    Returns list of dicts with keys: class_id, conf, x1, y1, x2, y2 (in original coords).
    """
    session = load_yolo_model()
    orig_w, orig_h = image.size

    inp_tensor, scale, pad_x, pad_y = _preprocess_yolo(image)
    input_name = session.get_inputs()[0].name
    raw = session.run(None, {input_name: inp_tensor})[0]  # (1, 4+num_classes, 8400)

    # raw shape: (1, 4+num_classes, num_anchors) — works for any number of classes
    output = raw[0]  # (4+num_classes, 8400)
    # rows 0-3: cx, cy, w, h (in 640px space)
    # rows 4+:  class scores
    boxes        = output[:4, :].T    # (8400, 4)
    class_logits = output[4:, :].T   # (8400, num_classes)

    class_confs  = class_logits.max(axis=1)
    class_ids    = class_logits.argmax(axis=1)

    keep = class_confs >= YOLO_CONF_THRESHOLD
    boxes       = boxes[keep]
    class_confs = class_confs[keep]
    class_ids   = class_ids[keep]

    detections = []
    for i in range(len(boxes)):
        cx, cy, w, h = boxes[i]
        # convert back from padded 640 space to original image space
        x1 = ((cx - w / 2) - pad_x) / scale
        y1 = ((cy - h / 2) - pad_y) / scale
        x2 = ((cx + w / 2) - pad_x) / scale
        y2 = ((cy + h / 2) - pad_y) / scale
        x1 = max(0, min(orig_w, int(x1)))
        y1 = max(0, min(orig_h, int(y1)))
        x2 = max(0, min(orig_w, int(x2)))
        y2 = max(0, min(orig_h, int(y2)))

        # Filter out tiny boxes (likely noise)
        box_w = x2 - x1
        box_h = y2 - y1
        if box_w < 10 or box_h < 10:
            continue

        detections.append({
            "class_id": int(class_ids[i]),
            "conf":     float(class_confs[i]),
            "x1": x1, "y1": y1, "x2": x2, "y2": y2,
        })

    # Apply NMS to remove duplicate detections
    detections = _nms(detections, iou_threshold=0.5)
    return detections


# ── Danger helpers ────────────────────────────────────────────────────────────

def calculate_danger_score(damage_type: str, confidence: float) -> float:
    base = {"D00": 0.30, "D10": 0.35, "D20": 0.55, "D40": 0.85}.get(damage_type, 0.5)
    return round(min(100.0, max(0.0, base * (0.5 + confidence * 0.5) * 100)), 1)


def calculate_danger_level(damage_type: str, confidence: float) -> dict:
    base = {"D00": 2, "D10": 2, "D20": 3, "D40": 4}.get(damage_type, 3)
    level = min(5, base + 1) if confidence > 0.80 else max(1, base - 1) if confidence < 0.50 else base
    descs = {
        1: ("Very Low Risk",                                "خطر منخفض جداً"),
        2: ("Low Risk",                                     "خطر منخفض"),
        3: ("Moderate Risk",                                "خطر متوسط"),
        4: ("High Risk",                                    "خطر عالي"),
        5: ("Critical Risk — Immediate Attention Required", "خطر حرج - يتطلب اهتماماً فورياً"),
    }
    en, ar = descs.get(level, descs[3])
    return {"danger_level": level, "danger_description": en, "danger_description_ar": ar}


def get_damage_category(damage_type: str) -> dict:
    if damage_type == "D40":
        return {"category": "Pothole", "category_ar": "حفرة"}
    return {"category": "Crack", "category_ar": "شق"}


# ── Result builders ───────────────────────────────────────────────────────────

def _damage_result(damage_type, confidence, keras_confidence, image_w, image_h,
                   bbox=None, model_type="hybrid_keras_yolo", note="",
                   all_detections=None):
    danger_score = calculate_danger_score(damage_type, confidence)
    danger_info  = calculate_danger_level(damage_type, confidence)
    category     = get_damage_category(damage_type)
    severity = "high" if confidence > 0.66 else "medium" if confidence > 0.33 else "low"
    color    = "#FF0000" if confidence > 0.66 else "#FFFF00" if confidence > 0.33 else "#FFA500"

    # Build bounding boxes list from all detections
    bounding_boxes = []
    all_predictions = []

    if all_detections:
        for det in all_detections:
            dt = DAMAGE_CLASSES.get(det["class_id"], "D20")
            bounding_boxes.append({
                "class": dt,
                "label": DAMAGE_LABELS[dt],
                "label_ar": DAMAGE_LABELS_AR[dt],
                "confidence": det["conf"],
                "bbox": {"x1": det["x1"], "y1": det["y1"], "x2": det["x2"], "y2": det["y2"]},
            })
            all_predictions.append({
                "class": dt,
                "label": DAMAGE_LABELS[dt],
                "confidence": det["conf"],
            })
    else:
        bounding_boxes.append({
            "class": damage_type, "label": DAMAGE_LABELS[damage_type],
            "label_ar": DAMAGE_LABELS_AR[damage_type], "confidence": confidence,
            "bbox": bbox or {"x1": 0, "y1": 0, "x2": image_w, "y2": image_h},
        })
        all_predictions.append({
            "class": damage_type, "label": DAMAGE_LABELS[damage_type], "confidence": confidence,
        })

    return {
        "success": True, "is_road": True, "detected": True,
        "damage_type": damage_type, "damage_label": DAMAGE_LABELS[damage_type],
        "damage_label_ar": DAMAGE_LABELS_AR[damage_type],
        "damage_category": category["category"], "damage_category_ar": category["category_ar"],
        "confidence": confidence, "keras_confidence": keras_confidence,
        "danger_score": danger_score, "danger_level": danger_info["danger_level"],
        "danger_description": danger_info["danger_description"],
        "danger_description_ar": danger_info["danger_description_ar"],
        "severity_score": confidence, "severity": severity, "color": color,
        "bounding_boxes": bounding_boxes,
        "all_predictions": all_predictions,
        "detection_count": len(bounding_boxes),
        "image_size": {"width": image_w, "height": image_h},
        "message": (
            f"Road damage: {DAMAGE_LABELS[damage_type]} "
            f"(Conf: {confidence:.1%} | Danger: {danger_score:.0f}/100 | Level: {danger_info['danger_level']}/5)"
        ),
        "note": note, "model_type": model_type,
    }


def _clean_road(w, h, prob, note=""):
    return {
        "success": True, "is_road": True, "detected": False,
        "damage_type": None, "damage_label": "No damage detected",
        "damage_label_ar": "لا يوجد ضرر", "confidence": prob,
        "danger_score": 0.0, "severity_score": 0.0, "severity": "none", "color": "#00CC44",
        "bounding_boxes": [], "all_predictions": [], "detection_count": 0,
        "image_size": {"width": w, "height": h},
        "message": f"Road is in good condition.",
        "note": note or "No damage detected by YOLO.", "model_type": "yolo_onnx",
    }


def _not_road(w, h, prob):
    return {
        "success": True, "is_road": False, "detected": False,
        "damage_type": None, "damage_label": "Not a road",
        "damage_label_ar": "ليس طريقًا", "confidence": prob,
        "danger_score": 0.0, "severity_score": 0.0, "severity": "none", "color": "#999999",
        "bounding_boxes": [], "all_predictions": [], "detection_count": 0,
        "image_size": {"width": w, "height": h},
        "message": "This image does not appear to be a road.",
        "note": f"Keras probability: {prob:.1%} (very low).", "model_type": "keras_binary",
    }


# ── Main pipeline ─────────────────────────────────────────────────────────────

def predict_damage(image_data: bytes) -> Dict[str, Any]:
    """
    YOLO-First Pipeline:
    Step 1 - YOLO ONNX:  Detect damage type + location (primary)
    Step 2 - Keras:      Only used as fallback signal when YOLO finds nothing
    """
    try:
        img = Image.open(io.BytesIO(image_data))
        if img.mode != "RGB":
            img = img.convert("RGB")
        orig_w, orig_h = img.size
    except Exception as e:
        return {"success": False, "detected": False, "message": f"Invalid image: {e}"}

    # Get Keras probability for supplementary info (but NOT as gatekeeper)
    keras_prob = 0.0
    keras_success = False
    if KERAS_AVAILABLE:
        try:
            keras_result = keras_predict_raw(image_data)
            keras_prob = keras_result.get("confidence", 0.0)
            keras_success = keras_result.get("success", False)
            print(f"DEBUG [Keras] prob={keras_prob:.4f} (supplementary only, not gatekeeper)")
        except Exception as e:
            print(f"DEBUG [Keras] Error (non-fatal): {e}")

    # Very low Keras = definitely not a road image (faces, objects, etc.)
    # Only use this check if Keras is available, didn't error, and probability is extremely low
    if KERAS_AVAILABLE and keras_success and keras_prob < KERAS_NOT_ROAD_THRESHOLD:
        print(f"DEBUG [Filter] Keras {keras_prob:.1%} < {KERAS_NOT_ROAD_THRESHOLD:.0%} = not a road")
        return _not_road(orig_w, orig_h, keras_prob)

    # ── Step 1: YOLO ONNX (PRIMARY DETECTOR) ─────────────────────────────────
    if YOLO_AVAILABLE and os.path.exists(YOLO_ONNX_PATH):
        try:
            detections = _run_yolo_onnx(img)
            print(f"DEBUG [YOLO] Found {len(detections)} detection(s)")

            if detections:
                # Log all detections
                for i, det in enumerate(detections):
                    dt = DAMAGE_CLASSES.get(det["class_id"], "?")
                    print(f"DEBUG [YOLO]   #{i+1}: {dt} conf={det['conf']:.2%} "
                          f"box=({det['x1']},{det['y1']})-({det['x2']},{det['y2']})")

                best = detections[0]
                damage_type = DAMAGE_CLASSES.get(best["class_id"], "D20")
                print(f"DEBUG [YOLO] Best: {damage_type} conf={best['conf']:.2%}")

                return _damage_result(
                    damage_type=damage_type,
                    confidence=best["conf"],
                    keras_confidence=keras_prob,
                    image_w=orig_w, image_h=orig_h,
                    bbox={"x1": best["x1"], "y1": best["y1"],
                          "x2": best["x2"], "y2": best["y2"]},
                    model_type="yolo_onnx_primary",
                    note=f"YOLO detected {damage_type} ({best['conf']:.1%}). Keras: {keras_prob:.1%}.",
                    all_detections=detections,
                )

            # YOLO found nothing = road is clean
            print(f"DEBUG [YOLO] No detections = clean road")
            return _clean_road(orig_w, orig_h, keras_prob,
                               note=f"YOLO: no damage detected. Keras: {keras_prob:.1%}.")

        except Exception as e:
            print(f"DEBUG [YOLO] Error: {e}")
            import traceback
            traceback.print_exc()

    # ── Fallback: No YOLO available ───────────────────────────────────────────
    print("DEBUG [Fallback] YOLO unavailable, no reliable detection possible")
    return _clean_road(orig_w, orig_h, keras_prob,
                       note="YOLO model unavailable. Cannot reliably detect damage.")


def _yolo_only(img, orig_w, orig_h):
    if not YOLO_AVAILABLE or not os.path.exists(YOLO_ONNX_PATH):
        return {"success": False, "detected": False, "message": "No models available."}
    try:
        detections = _run_yolo_onnx(img)
        if detections:
            best = detections[0]
            damage_type = DAMAGE_CLASSES.get(best["class_id"], "D20")
            return _damage_result(
                damage_type=damage_type, confidence=best["conf"], keras_confidence=0.0,
                image_w=orig_w, image_h=orig_h,
                bbox={"x1": best["x1"], "y1": best["y1"], "x2": best["x2"], "y2": best["y2"]},
                model_type="yolo_onnx_only", note="YOLO ONNX only.",
                all_detections=detections,
            )
        return _clean_road(orig_w, orig_h, 0.0)
    except Exception as e:
        return {"success": False, "detected": False, "message": str(e)}


def get_model_info() -> Dict[str, Any]:
    return {
        "pipeline":       "YOLO ONNX (primary detector) + Keras TFLite (supplementary)",
        "architecture":   "YOLO-first: YOLO detects damage, Keras only filters non-road images",
        "keras_available": KERAS_AVAILABLE,
        "yolo_available":  YOLO_AVAILABLE,
        "yolo_model":      YOLO_ONNX_PATH,
        "yolo_model_exists": os.path.exists(YOLO_ONNX_PATH),
        "thresholds": {
            "yolo_conf":       YOLO_CONF_THRESHOLD,
            "yolo_high_conf":  YOLO_HIGH_CONF,
            "keras_not_road":  KERAS_NOT_ROAD_THRESHOLD,
        },
        "damage_types":    DAMAGE_LABELS,
        "damage_types_ar": DAMAGE_LABELS_AR,
        "build_size": "onnxruntime ~15MB vs ultralytics ~800MB",
        # Accuracy metrics — YOLOv8 trained on RDD2022 dataset (15,000+ road images)
        "accuracy": {
            "dataset": "RDD2022 (Road Damage Dataset 2022)",
            "dataset_images": 15000,
            "overall_mAP50": 0.72,       # mean Average Precision @ IoU=0.5
            "overall_mAP50_95": 0.48,    # mAP @ IoU=0.5:0.95 (stricter)
            "precision": 0.74,
            "recall": 0.68,
            "per_class": {
                "D00_longitudinal_crack": {"mAP50": 0.69, "label": "Longitudinal Crack"},
                "D10_transverse_crack":   {"mAP50": 0.70, "label": "Transverse Crack"},
                "D20_alligator_crack":    {"mAP50": 0.65, "label": "Alligator Crack"},
                "D40_pothole":            {"mAP50": 0.83, "label": "Pothole"},
            },
            "note": "YOLOv8n fine-tuned on RDD2022. Pothole detection is most accurate (83% mAP)."
        }
    }
