"""
Hybrid Road Damage Prediction — ONNX Runtime Version
══════════════════════════════════════════════════════════
Uses onnxruntime instead of ultralytics/PyTorch.

Build time comparison:
  ultralytics + torch : ~800 MB download, 20+ min build ❌
  onnxruntime         : ~15 MB download,  1 min build  ✅

PIPELINE (2-step)
─────────────────
  Step 1 ─ KERAS TFLite (binary damage detector)
      prob >= 0.65  → damage detected → Step 2
      0.20–0.64     → clean road
      < 0.20        → not a road

  Step 2 ─ YOLO ONNX (type + danger + bounding box)
      Detected → D00/D10/D20/D40 + danger score
      Not detected → default D20 (texture/alligator crack)

YOLO CLASS MAP (ozair23/yolov8-road-damage-detector — RDD2022)
  0: alligator crack   → D20
  1: transverse crack  → D10
  2: longitudinal crack → D00
  3: other corruption  → D20
  4: Pothole           → D40
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
KERAS_DAMAGE_THRESHOLD = 0.65
KERAS_ROAD_THRESHOLD   = 0.20
YOLO_CONF_THRESHOLD    = 0.35

# ── Class mapping ─────────────────────────────────────────────────────────────
DAMAGE_CLASSES = {
    0: "D20",  # alligator crack
    1: "D10",  # transverse crack
    2: "D00",  # longitudinal crack
    3: "D20",  # other corruption
    4: "D40",  # pothole
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
    """Resize + normalize to (1, 3, 640, 640) float32. Returns (tensor, scale_x, scale_y, pad_x, pad_y)."""
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
    arr  = arr.transpose(2, 0, 1)           # HWC → CHW
    arr  = np.expand_dims(arr, axis=0)      # → (1, 3, 640, 640)

    return arr, scale, pad_x, pad_y


def _run_yolo_onnx(image: Image.Image):
    """
    Run YOLO ONNX inference.
    Returns list of dicts with keys: class_id, conf, x1, y1, x2, y2 (in original coords).
    """
    session = load_yolo_model()
    orig_w, orig_h = image.size

    inp_tensor, scale, pad_x, pad_y = _preprocess_yolo(image)
    input_name = session.get_inputs()[0].name
    raw = session.run(None, {input_name: inp_tensor})[0]  # (1, 9, 8400)

    # raw shape: (1, num_classes+4, num_anchors)
    output = raw[0]  # (9, 8400)
    # rows 0-3: cx, cy, w, h (normalised to 640px)
    # rows 4-8: class scores (5 classes)
    boxes      = output[:4, :].T    # (8400, 4)
    class_logits = output[4:, :].T  # (8400, 5)

    class_confs  = class_logits.max(axis=1)
    class_ids    = class_logits.argmax(axis=1)

    keep = class_confs >= YOLO_CONF_THRESHOLD
    boxes      = boxes[keep]
    class_confs= class_confs[keep]
    class_ids  = class_ids[keep]

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
        detections.append({
            "class_id": int(class_ids[i]),
            "conf":     float(class_confs[i]),
            "x1": x1, "y1": y1, "x2": x2, "y2": y2,
        })

    # sort by confidence, return best
    detections.sort(key=lambda d: d["conf"], reverse=True)
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
                   bbox=None, model_type="hybrid_keras_yolo", note=""):
    danger_score = calculate_danger_score(damage_type, confidence)
    danger_info  = calculate_danger_level(damage_type, confidence)
    category     = get_damage_category(damage_type)
    severity = "high" if confidence > 0.66 else "medium" if confidence > 0.33 else "low"
    color    = "#FF0000" if confidence > 0.66 else "#FFFF00" if confidence > 0.33 else "#FFA500"
    bbox_entry = {
        "class": damage_type, "label": DAMAGE_LABELS[damage_type],
        "label_ar": DAMAGE_LABELS_AR[damage_type], "confidence": confidence,
        "bbox": bbox or {"x1": 0, "y1": 0, "x2": image_w, "y2": image_h},
    }
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
        "bounding_boxes": [bbox_entry],
        "all_predictions": [{"class": damage_type, "label": DAMAGE_LABELS[damage_type], "confidence": confidence}],
        "detection_count": 1, "image_size": {"width": image_w, "height": image_h},
        "message": (
            f"Road damage: {DAMAGE_LABELS[damage_type]} "
            f"(Conf: {confidence:.1%} | Danger: {danger_score:.0f}/100 | Level: {danger_info['danger_level']}/5)"
        ),
        "note": note, "model_type": model_type,
    }


def _clean_road(w, h, prob):
    return {
        "success": True, "is_road": True, "detected": False,
        "damage_type": None, "damage_label": "No damage detected",
        "damage_label_ar": "لا يوجد ضرر", "confidence": prob,
        "danger_score": 0.0, "severity_score": 0.0, "severity": "none", "color": "#00CC44",
        "bounding_boxes": [], "all_predictions": [], "detection_count": 0,
        "image_size": {"width": w, "height": h},
        "message": f"Road is in good condition. (Keras: {prob:.1%})",
        "note": "Keras: damage probability below threshold.", "model_type": "keras_binary",
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
        "note": f"Keras probability: {prob:.1%} (too low).", "model_type": "keras_binary",
    }


# ── Main pipeline ─────────────────────────────────────────────────────────────

def predict_damage(image_data: bytes) -> Dict[str, Any]:
    """
    Step 1 — KERAS TFLite: Is there damage? (binary yes/no)
    Step 2 — YOLO ONNX:    What type + danger score?
    """
    try:
        img = Image.open(io.BytesIO(image_data))
        if img.mode != "RGB":
            img = img.convert("RGB")
        orig_w, orig_h = img.size
    except Exception as e:
        return {"success": False, "detected": False, "message": f"Invalid image: {e}"}

    # ── Step 1: Keras TFLite ──────────────────────────────────────────────────
    if not KERAS_AVAILABLE:
        return _yolo_only(img, orig_w, orig_h)

    keras_result = keras_predict_raw(image_data)
    keras_prob   = keras_result.get("confidence", 0.0)
    print(f"DEBUG [Step1 Keras] prob={keras_prob:.4f}")

    if keras_prob < KERAS_ROAD_THRESHOLD:
        return _not_road(orig_w, orig_h, keras_prob)

    if keras_prob < KERAS_DAMAGE_THRESHOLD:
        return _clean_road(orig_w, orig_h, keras_prob)

    # ── Step 2: YOLO ONNX ────────────────────────────────────────────────────
    print(f"DEBUG [Step1] Damage confirmed ({keras_prob:.1%}) → YOLO ONNX...")

    if YOLO_AVAILABLE and os.path.exists(YOLO_ONNX_PATH):
        try:
            detections = _run_yolo_onnx(img)
            if detections:
                best = detections[0]
                damage_type = DAMAGE_CLASSES.get(best["class_id"], "D20")
                print(f"DEBUG [Step2 YOLO] {damage_type} conf={best['conf']:.2%}")
                return _damage_result(
                    damage_type=damage_type, confidence=best["conf"],
                    keras_confidence=keras_prob, image_w=orig_w, image_h=orig_h,
                    bbox={"x1": best["x1"], "y1": best["y1"], "x2": best["x2"], "y2": best["y2"]},
                    model_type="hybrid_keras_onnx",
                    note=f"Keras: {keras_prob:.1%} damage. YOLO ONNX: {DAMAGE_LABELS[damage_type]} ({best['conf']:.1%}).",
                )
            # YOLO found no box → texture damage
            print("DEBUG [Step2 YOLO] No box → D20 (texture damage)")
            return _damage_result(
                damage_type="D20", confidence=keras_prob, keras_confidence=keras_prob,
                image_w=orig_w, image_h=orig_h, model_type="keras_texture",
                note=f"Keras: {keras_prob:.1%} damage. YOLO found no box → Alligator Crack (texture).",
            )
        except Exception as e:
            print(f"DEBUG [Step2 YOLO] Error: {e}")

    # Fallback: Keras-only
    return _damage_result(
        damage_type="D20", confidence=keras_prob, keras_confidence=keras_prob,
        image_w=orig_w, image_h=orig_h, model_type="keras_only",
        note="YOLO unavailable. Keras-only result.",
    )


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
                model_type="yolo_onnx_only", note="Keras unavailable. YOLO ONNX only.",
            )
        return _clean_road(orig_w, orig_h, 0.0)
    except Exception as e:
        return {"success": False, "detected": False, "message": str(e)}


def get_model_info() -> Dict[str, Any]:
    return {
        "pipeline":       "Keras TFLite (damage? yes/no) → YOLO ONNX (type + danger)",
        "keras_available": KERAS_AVAILABLE,
        "yolo_available":  YOLO_AVAILABLE,
        "yolo_model":      YOLO_ONNX_PATH,
        "yolo_model_exists": os.path.exists(YOLO_ONNX_PATH),
        "thresholds": {
            "keras_damage": KERAS_DAMAGE_THRESHOLD,
            "keras_road":   KERAS_ROAD_THRESHOLD,
            "yolo_conf":    YOLO_CONF_THRESHOLD,
        },
        "damage_types":    DAMAGE_LABELS,
        "damage_types_ar": DAMAGE_LABELS_AR,
        "build_size": "onnxruntime ~15MB vs ultralytics ~800MB",
    }
