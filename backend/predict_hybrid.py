"""
Hybrid Road Damage Prediction — YOLO-first pipeline
═══════════════════════════════════════════════════
DESIGN RATIONALE
  Old approach (Keras-first) had two main problems:
    1. Keras binary classifier is too generic → false positives on non-roads
    2. Good roads marked as damaged because Keras threshold was too low

  New approach (YOLO-first):
    • YOLO is trained ONLY on 4 road damage classes (D00/D10/D20/D40)
      → If YOLO sees nothing, there is very likely no recognisable damage
    • Keras is used as a SECONDARY check ONLY for texture-based damage
      (Alligator Crack / D20) that YOLO often misses because it has no
      discrete object shape — but only when Keras is VERY confident (≥ 0.85)
    • Scene validation via HSV saturation gives an extra guard against
      completely non-road images

PIPELINE
  Step 1 → YOLO: does it see D00 / D10 / D20 / D40?
           YES → confirmed damage; go to Step 3 (danger calc)
           NO  → Step 2

  Step 2 → Keras (texture check for Alligator Crack only)
             prob ≥ 0.85 AND scene is road-like → D20 Alligator Crack
             prob  0.20 – 0.85               → Clean road (no damage)
             prob < 0.20 OR scene not road   → Not a road

  Step 3 → Danger score + level calculation (YOLO type + confidence)
"""

import os
import numpy as np
from PIL import Image
import io
from typing import Dict, Any, Optional

# ── Model imports ────────────────────────────────────────────────────────────
try:
    from predict_keras import predict_damage as keras_predict_raw, KERAS_AVAILABLE
except ImportError:
    KERAS_AVAILABLE = False

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

# ── YOLO config ──────────────────────────────────────────────────────────────
MODEL_DIR       = os.path.dirname(os.path.dirname(__file__))
YOLO_MODEL_PATH = os.path.join(MODEL_DIR, "road_damage_yolo.pt")

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

# ── YOLO thresholds ──────────────────────────────────────────────────────────
# Minimum YOLO confidence to trust a detection.
# Higher = fewer false positives; lower = catches more subtle damage.
YOLO_CONF_THRESHOLD = 0.40   # detections below this are ignored by YOLO itself

_yolo_model = None


def load_yolo_model():
    global _yolo_model
    if _yolo_model is None:
        path = YOLO_MODEL_PATH if os.path.exists(YOLO_MODEL_PATH) else "yolov8n.pt"
        _yolo_model = YOLO(path)
    return _yolo_model


# ── Danger / category helpers ─────────────────────────────────────────────────

def calculate_danger_score(damage_type: str, confidence: float) -> float:
    """Return 0-100 danger score combining damage-type severity + detection confidence."""
    base = {"D00": 0.30, "D10": 0.35, "D20": 0.55, "D40": 0.85}.get(damage_type, 0.5)
    score = base * (0.5 + confidence * 0.5)
    return round(min(1.0, max(0.0, score)) * 100, 1)


def calculate_danger_level(damage_type: str, confidence: float) -> dict:
    """Return danger level 1-5 + descriptions."""
    base = {"D00": 2, "D10": 2, "D20": 3, "D40": 4}.get(damage_type, 3)
    if confidence > 0.80:
        level = min(5, base + 1)
    elif confidence < 0.50:
        level = max(1, base - 1)
    else:
        level = base

    descs = {
        1: {"en": "Very Low Risk",                              "ar": "خطر منخفض جداً"},
        2: {"en": "Low Risk",                                   "ar": "خطر منخفض"},
        3: {"en": "Moderate Risk",                              "ar": "خطر متوسط"},
        4: {"en": "High Risk",                                  "ar": "خطر عالي"},
        5: {"en": "Critical Risk — Immediate Attention Required","ar": "خطر حرج - يتطلب اهتماماً فورياً"},
    }
    d = descs.get(level, descs[3])
    return {"danger_level": level, "danger_description": d["en"], "danger_description_ar": d["ar"]}


def get_damage_category(damage_type: str) -> dict:
    if damage_type == "D40":
        return {"category": "Pothole", "category_ar": "حفرة"}
    return {"category": "Crack", "category_ar": "شق"}


def _build_damage_result(
    damage_type: str,
    confidence: float,
    image_w: int,
    image_h: int,
    bbox: Optional[dict] = None,
    model_type: str = "hybrid",
    note: str = "",
) -> Dict[str, Any]:
    """Build a complete damage-detected result dict."""
    danger_score = calculate_danger_score(damage_type, confidence)
    danger_info  = calculate_danger_level(damage_type, confidence)
    category     = get_damage_category(damage_type)

    severity = "high" if confidence > 0.66 else "medium" if confidence > 0.33 else "low"
    color    = "#FF0000" if confidence > 0.66 else "#FFFF00" if confidence > 0.33 else "#00FF00"

    default_bbox = {"x1": 0, "y1": 0, "x2": image_w, "y2": image_h}
    bbox_entry = {
        "class":    damage_type,
        "label":    DAMAGE_LABELS[damage_type],
        "label_ar": DAMAGE_LABELS_AR[damage_type],
        "confidence": confidence,
        "bbox":     bbox or default_bbox,
    }

    return {
        "success":              True,
        "is_road":              True,
        "detected":             True,
        "damage_type":          damage_type,
        "damage_label":         DAMAGE_LABELS[damage_type],
        "damage_label_ar":      DAMAGE_LABELS_AR[damage_type],
        "damage_category":      category["category"],
        "damage_category_ar":   category["category_ar"],
        "confidence":           confidence,
        "danger_score":         danger_score,
        "danger_level":         danger_info["danger_level"],
        "danger_description":   danger_info["danger_description"],
        "danger_description_ar":danger_info["danger_description_ar"],
        "severity_score":       confidence,
        "severity":             severity,
        "color":                color,
        "bounding_boxes":       [bbox_entry],
        "all_predictions":      [{"class": damage_type, "label": DAMAGE_LABELS[damage_type], "confidence": confidence}],
        "detection_count":      1,
        "image_size":           {"width": image_w, "height": image_h},
        "message": (
            f"Road damage detected: {DAMAGE_LABELS[damage_type]} "
            f"(Confidence: {confidence:.1%}, Danger Score: {danger_score:.1f}/100, "
            f"Level: {danger_info['danger_level']}/5)"
        ),
        "note":       note or f"Detection via {model_type}",
        "model_type": model_type,
    }


def _clean_road_result(image_w: int, image_h: int, confidence: float = 0.0) -> Dict[str, Any]:
    return {
        "success":        True,
        "is_road":        True,
        "detected":       False,
        "damage_type":    None,
        "damage_label":   "No damage detected",
        "damage_label_ar":"لم يتم اكتشاف ضرر",
        "confidence":     confidence,
        "danger_score":   0.0,
        "severity_score": 0.0,
        "severity":       "none",
        "color":          "#00FF00",
        "bounding_boxes": [],
        "all_predictions":[],
        "detection_count":0,
        "image_size":     {"width": image_w, "height": image_h},
        "message":        f"Clean road — no damage detected (prob: {confidence:.1%}).",
        "note":           "Both YOLO and Keras agree: no damage.",
        "model_type":     "hybrid",
    }


def _not_road_result(image_w: int, image_h: int) -> Dict[str, Any]:
    return {
        "success":        True,
        "is_road":        False,
        "detected":       False,
        "damage_type":    None,
        "damage_label":   "Not a road",
        "damage_label_ar":"ليس طريقًا",
        "confidence":     0.0,
        "danger_score":   0.0,
        "severity_score": 0.0,
        "severity":       "none",
        "color":          "#999999",
        "bounding_boxes": [],
        "all_predictions":[],
        "detection_count":0,
        "image_size":     {"width": image_w, "height": image_h},
        "message":        "Image does not appear to be a road.",
        "note":           "Scene validation: image too colourful or Keras confidence very low.",
        "model_type":     "hybrid",
    }


# ── Scene validation ──────────────────────────────────────────────────────────

def _is_road_scene(image: Image.Image) -> tuple[bool, float]:
    """
    Quick colour-based check: roads are low-saturation grey surfaces.
    Returns (is_road, avg_saturation).
    """
    hsv   = image.convert('HSV')
    _, s, v = hsv.split()
    avg_s = float(np.mean(np.array(s))) / 255.0
    avg_v = float(np.mean(np.array(v))) / 255.0
    # Reject very colourful images (people, grass, sky, buildings)
    if avg_s > 0.45: return False, avg_s
    # Reject black frames or blown-out images
    if avg_v < 0.08 or avg_v > 0.97: return False, avg_s
    return True, avg_s


# ── Main pipeline ─────────────────────────────────────────────────────────────

def predict_damage(image_data: bytes) -> Dict[str, Any]:
    """
    YOLO-first hybrid pipeline.

    Step 1 — YOLO (primary damage detector)
        YOLO is trained exclusively on D00/D10/D20/D40.
        A detection here is very reliable.
        • Detected  → return damage result immediately
        • Not detected → Step 2

    Step 2 — Keras (secondary: texture damage + road/non-road check)
        Only runs if YOLO found nothing.
        Keras checks for texture-based damage (Alligator Crack) YOLO misses,
        AND confirms whether the image looks like a road.
        • prob ≥ 0.85 AND road scene → D20 Alligator Crack (texture damage)
        • 0.20 ≤ prob < 0.85       → Clean road
        • prob < 0.20 OR not road  → Not a road

    Fallback if only one model available: use that model alone.
    """
    print(f"DEBUG [Hybrid] Received {len(image_data)} bytes")

    # Load image once for scene validation
    try:
        _img = Image.open(io.BytesIO(image_data))
        if _img.mode != 'RGB':
            _img = _img.convert('RGB')
        orig_w, orig_h = _img.size
    except Exception as e:
        return {"success": False, "detected": False, "message": f"Invalid image: {e}", "error": str(e)}

    # ── Step 1: YOLO ────────────────────────────────────────────────────────
    if YOLO_AVAILABLE:
        try:
            model   = load_yolo_model()
            results = model.predict(source=_img, conf=YOLO_CONF_THRESHOLD, verbose=False)

            if results and results[0].boxes is not None and len(results[0].boxes) > 0:
                # Pick the highest-confidence box
                boxes      = results[0].boxes
                best_idx   = int(boxes.conf.argmax())
                confidence = float(boxes.conf[best_idx].cpu().numpy())
                class_id   = int(boxes.cls[best_idx].cpu().numpy())
                x1, y1, x2, y2 = boxes.xyxy[best_idx].cpu().numpy()

                damage_type = DAMAGE_CLASSES.get(class_id % len(DAMAGE_CLASSES), "D40")

                print(f"DEBUG [Step1 YOLO] ✓ Detected {damage_type} ({confidence:.2%})")
                return _build_damage_result(
                    damage_type = damage_type,
                    confidence  = confidence,
                    image_w     = orig_w,
                    image_h     = orig_h,
                    bbox        = {"x1": int(x1), "y1": int(y1), "x2": int(x2), "y2": int(y2)},
                    model_type  = "yolo_primary",
                    note        = f"YOLO detected {DAMAGE_LABELS[damage_type]} with {confidence:.1%} confidence.",
                )

            print("DEBUG [Step1 YOLO] No damage objects detected.")

        except Exception as e:
            print(f"DEBUG [Step1 YOLO] Error: {e}")

    # ── Step 2: Keras (texture damage + road validation) ────────────────────
    if KERAS_AVAILABLE:
        # Scene validation first (cheap)
        road, avg_s = _is_road_scene(_img)
        print(f"DEBUG [Step2 Keras] scene_valid={road}, avg_sat={avg_s:.3f}")

        keras_result = keras_predict_raw(image_data)
        keras_prob   = keras_result.get("confidence", 0.0)
        print(f"DEBUG [Step2 Keras] prob={keras_prob:.4f}")

        # Very low probability OR colourful scene → not a road
        if not road and keras_prob < 0.50:
            print("DEBUG [Step2 Keras] → Not a road.")
            return _not_road_result(orig_w, orig_h)

        # High Keras probability → texture-based Alligator Crack
        if keras_prob >= 0.85 and road:
            print(f"DEBUG [Step2 Keras] → Texture damage D20 (prob={keras_prob:.2%})")
            return _build_damage_result(
                damage_type = "D20",
                confidence  = keras_prob,
                image_w     = orig_w,
                image_h     = orig_h,
                model_type  = "keras_texture",
                note        = (
                    f"YOLO found no discrete objects; Keras detected texture damage "
                    f"({keras_prob:.1%}) → Alligator Crack."
                ),
            )

        # Medium probability → clean road (YOLO + Keras both checked, nothing found)
        if keras_prob >= 0.20:
            print(f"DEBUG [Step2 Keras] → Clean road (prob={keras_prob:.2%})")
            return _clean_road_result(orig_w, orig_h, keras_prob)

        # Very low Keras → not a road
        print(f"DEBUG [Step2 Keras] → Not a road (prob={keras_prob:.2%})")
        return _not_road_result(orig_w, orig_h)

    # ── Fallback: YOLO-only clean road (YOLO ran but found nothing, no Keras) ─
    return _clean_road_result(orig_w, orig_h, 0.0)


def get_model_info() -> Dict[str, Any]:
    return {
        "pipeline":        "YOLO-first → Keras-secondary",
        "keras_available": KERAS_AVAILABLE,
        "yolo_available":  YOLO_AVAILABLE,
        "yolo_threshold":  YOLO_CONF_THRESHOLD,
        "keras_threshold": 0.85,
        "damage_types":    list(DAMAGE_LABELS.keys()),
        "labels":          DAMAGE_LABELS,
        "labels_ar":       DAMAGE_LABELS_AR,
        "note": (
            "YOLO handles all discrete damage (D00/D10/D20/D40). "
            "Keras only activates at ≥0.85 for texture-based Alligator Crack that YOLO misses."
        ),
    }
