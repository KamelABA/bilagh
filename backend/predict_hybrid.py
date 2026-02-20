"""
Hybrid Road Damage Prediction
══════════════════════════════════════════════════════════
PIPELINE (2-step)
─────────────────
  Step 1 ─ KERAS (binary damage detector)
      "Is there damage on this road?"
       prob ≥ 0.65  → damage detected → go to Step 2
       prob 0.20–0.64 → clean road, no damage
       prob < 0.20   → not a road image

  Step 2 ─ YOLO (type classifier + danger calculator)
       Only runs when Keras confirms damage.
       "What TYPE of damage and HOW dangerous is it?"
       Detected → D00/D10/D20/D40 + danger score
       Not detected → fallback to D20 (texture/alligator crack) with Keras conf

YOLO CLASS MAP (ozair23/yolov8-road-damage-detector, RDD2022)
  0: alligator crack   → D20
  1: transverse crack  → D10
  2: longitudinal crack → D00
  3: other corruption  → D20
  4: Pothole           → D40
"""

import os
import numpy as np
from PIL import Image
import io
from typing import Dict, Any, Optional

# ── Model imports ─────────────────────────────────────────────────────────────
try:
    from predict_keras import predict_damage as keras_predict_raw, KERAS_AVAILABLE
except ImportError:
    KERAS_AVAILABLE = False

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

# ── Paths ─────────────────────────────────────────────────────────────────────
MODEL_DIR       = os.path.dirname(os.path.dirname(__file__))
YOLO_MODEL_PATH = os.path.join(MODEL_DIR, "road_damage_yolo.pt")

# ── Thresholds ────────────────────────────────────────────────────────────────
KERAS_DAMAGE_THRESHOLD   = 0.65   # above this → damage detected
KERAS_ROAD_THRESHOLD     = 0.20   # below this → not a road
YOLO_CONF_THRESHOLD      = 0.35   # YOLO minimum confidence

# ── Class mapping ─────────────────────────────────────────────────────────────
# Maps YOLO class IDs → project D-codes
DAMAGE_CLASSES = {
    0: "D20",   # alligator crack
    1: "D10",   # transverse crack
    2: "D00",   # longitudinal crack
    3: "D20",   # other corruption → closest to alligator crack
    4: "D40",   # pothole
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

_yolo_model = None


def load_yolo_model():
    global _yolo_model
    if _yolo_model is None:
        path = YOLO_MODEL_PATH if os.path.exists(YOLO_MODEL_PATH) else "yolov8n.pt"
        print(f"Loading YOLO from: {path}")
        _yolo_model = YOLO(path)
    return _yolo_model


# ── Danger helpers ────────────────────────────────────────────────────────────

def calculate_danger_score(damage_type: str, confidence: float) -> float:
    """Return 0–100 danger score."""
    base = {"D00": 0.30, "D10": 0.35, "D20": 0.55, "D40": 0.85}.get(damage_type, 0.5)
    score = base * (0.5 + confidence * 0.5)
    return round(min(1.0, max(0.0, score)) * 100, 1)


def calculate_danger_level(damage_type: str, confidence: float) -> dict:
    """Return danger level 1–5 + bilingual descriptions."""
    base = {"D00": 2, "D10": 2, "D20": 3, "D40": 4}.get(damage_type, 3)
    if confidence > 0.80:
        level = min(5, base + 1)
    elif confidence < 0.50:
        level = max(1, base - 1)
    else:
        level = base

    descs = {
        1: {"en": "Very Low Risk",                               "ar": "خطر منخفض جداً"},
        2: {"en": "Low Risk",                                    "ar": "خطر منخفض"},
        3: {"en": "Moderate Risk",                               "ar": "خطر متوسط"},
        4: {"en": "High Risk",                                   "ar": "خطر عالي"},
        5: {"en": "Critical Risk — Immediate Attention Required","ar": "خطر حرج - يتطلب اهتماماً فورياً"},
    }
    d = descs.get(level, descs[3])
    return {
        "danger_level":         level,
        "danger_description":   d["en"],
        "danger_description_ar":d["ar"],
    }


def get_damage_category(damage_type: str) -> dict:
    if damage_type == "D40":
        return {"category": "Pothole", "category_ar": "حفرة"}
    return {"category": "Crack", "category_ar": "شق"}


# ── Result builders ───────────────────────────────────────────────────────────

def _damage_result(
    damage_type: str,
    confidence: float,
    keras_confidence: float,
    image_w: int,
    image_h: int,
    bbox: Optional[dict] = None,
    model_type: str = "hybrid_keras_yolo",
    note: str = "",
) -> Dict[str, Any]:
    danger_score = calculate_danger_score(damage_type, confidence)
    danger_info  = calculate_danger_level(damage_type, confidence)
    category     = get_damage_category(damage_type)

    severity = "high" if confidence > 0.66 else "medium" if confidence > 0.33 else "low"
    color    = "#FF0000" if confidence > 0.66 else "#FFFF00" if confidence > 0.33 else "#FFA500"

    bbox_entry = {
        "class":      damage_type,
        "label":      DAMAGE_LABELS[damage_type],
        "label_ar":   DAMAGE_LABELS_AR[damage_type],
        "confidence": confidence,
        "bbox":       bbox or {"x1": 0, "y1": 0, "x2": image_w, "y2": image_h},
    }

    return {
        "success":               True,
        "is_road":               True,
        "detected":              True,
        "damage_type":           damage_type,
        "damage_label":          DAMAGE_LABELS[damage_type],
        "damage_label_ar":       DAMAGE_LABELS_AR[damage_type],
        "damage_category":       category["category"],
        "damage_category_ar":    category["category_ar"],
        "confidence":            confidence,
        "keras_confidence":      keras_confidence,
        "danger_score":          danger_score,
        "danger_level":          danger_info["danger_level"],
        "danger_description":    danger_info["danger_description"],
        "danger_description_ar": danger_info["danger_description_ar"],
        "severity_score":        confidence,
        "severity":              severity,
        "color":                 color,
        "bounding_boxes":        [bbox_entry],
        "all_predictions":       [{"class": damage_type, "label": DAMAGE_LABELS[damage_type], "confidence": confidence}],
        "detection_count":       1,
        "image_size":            {"width": image_w, "height": image_h},
        "message": (
            f"Road damage detected: {DAMAGE_LABELS[damage_type]} "
            f"(Confidence: {confidence:.1%} | Danger: {danger_score:.0f}/100 | "
            f"Level: {danger_info['danger_level']}/5)"
        ),
        "note":       note,
        "model_type": model_type,
    }


def _clean_road_result(image_w: int, image_h: int, keras_prob: float) -> Dict[str, Any]:
    return {
        "success":         True,
        "is_road":         True,
        "detected":        False,
        "damage_type":     None,
        "damage_label":    "No damage detected",
        "damage_label_ar": "لا يوجد ضرر",
        "confidence":      keras_prob,
        "danger_score":    0.0,
        "severity_score":  0.0,
        "severity":        "none",
        "color":           "#00CC44",
        "bounding_boxes":  [],
        "all_predictions": [],
        "detection_count": 0,
        "image_size":      {"width": image_w, "height": image_h},
        "message":         f"Road is in good condition. No damage found (Keras: {keras_prob:.1%}).",
        "note":            "Keras classifier: damage probability below threshold.",
        "model_type":      "keras_binary",
    }


def _not_road_result(image_w: int, image_h: int, keras_prob: float) -> Dict[str, Any]:
    return {
        "success":         True,
        "is_road":         False,
        "detected":        False,
        "damage_type":     None,
        "damage_label":    "Not a road",
        "damage_label_ar": "ليس طريقًا",
        "confidence":      keras_prob,
        "danger_score":    0.0,
        "severity_score":  0.0,
        "severity":        "none",
        "color":           "#999999",
        "bounding_boxes":  [],
        "all_predictions": [],
        "detection_count": 0,
        "image_size":      {"width": image_w, "height": image_h},
        "message":         "This image does not appear to be a road.",
        "note":            f"Keras probability too low ({keras_prob:.1%}) — likely not a road.",
        "model_type":      "keras_binary",
    }


# ── Main pipeline ─────────────────────────────────────────────────────────────

def predict_damage(image_data: bytes) -> Dict[str, Any]:
    """
    2-Step Hybrid Pipeline
    ──────────────────────
    Step 1 — KERAS: binary damage detection
        "Is there damage?"
        prob >= 0.65 → YES → Step 2
        prob 0.20-0.64 → clean road → return
        prob < 0.20 → not a road → return

    Step 2 — YOLO: damage type + danger calculation
        "What type? How dangerous?"
        Detected → full result with type, bounding box, danger score
        Not detected → Keras was right about damage, default to D20 (texture crack)
    """
    print(f"DEBUG [Hybrid] Image size: {len(image_data)} bytes")

    # Load image once
    try:
        img = Image.open(io.BytesIO(image_data))
        if img.mode != "RGB":
            img = img.convert("RGB")
        orig_w, orig_h = img.size
    except Exception as e:
        return {"success": False, "detected": False, "message": f"Invalid image: {e}"}

    # ══════════════════════════════════════════════════════════════════════════
    # STEP 1 — KERAS: Is there damage?
    # ══════════════════════════════════════════════════════════════════════════
    if not KERAS_AVAILABLE:
        # No Keras → fall back to YOLO-only
        print("DEBUG [Step1] Keras unavailable, using YOLO only")
        return _yolo_only(img, image_data, orig_w, orig_h)

    print("DEBUG [Step1 Keras] Running binary damage detection...")
    keras_result = keras_predict_raw(image_data)
    keras_prob   = keras_result.get("confidence", 0.0)
    print(f"DEBUG [Step1 Keras] prob={keras_prob:.4f}")

    # Not a road
    if keras_prob < KERAS_ROAD_THRESHOLD:
        print(f"DEBUG [Step1] → NOT A ROAD (prob={keras_prob:.2%})")
        return _not_road_result(orig_w, orig_h, keras_prob)

    # Clean road — no damage
    if keras_prob < KERAS_DAMAGE_THRESHOLD:
        print(f"DEBUG [Step1] → CLEAN ROAD (prob={keras_prob:.2%})")
        return _clean_road_result(orig_w, orig_h, keras_prob)

    # ══════════════════════════════════════════════════════════════════════════
    # STEP 2 — YOLO: Type classification + danger score
    # Keras confirmed damage (prob >= 0.65). Now identify the type.
    # ══════════════════════════════════════════════════════════════════════════
    print(f"DEBUG [Step1] → DAMAGE DETECTED (prob={keras_prob:.2%}) → launching YOLO...")

    if YOLO_AVAILABLE:
        try:
            model   = load_yolo_model()
            results = model.predict(source=img, conf=YOLO_CONF_THRESHOLD, verbose=False)

            if results and results[0].boxes is not None and len(results[0].boxes) > 0:
                boxes    = results[0].boxes
                best_idx = int(boxes.conf.argmax())
                yolo_conf = float(boxes.conf[best_idx].cpu().numpy())
                class_id  = int(boxes.cls[best_idx].cpu().numpy())
                x1, y1, x2, y2 = boxes.xyxy[best_idx].cpu().numpy()

                damage_type = DAMAGE_CLASSES.get(class_id, "D20")
                print(f"DEBUG [Step2 YOLO] type={damage_type}, conf={yolo_conf:.2%}")

                return _damage_result(
                    damage_type      = damage_type,
                    confidence       = yolo_conf,
                    keras_confidence = keras_prob,
                    image_w          = orig_w,
                    image_h          = orig_h,
                    bbox             = {"x1": int(x1), "y1": int(y1), "x2": int(x2), "y2": int(y2)},
                    model_type       = "hybrid_keras_yolo",
                    note             = (
                        f"Keras detected damage ({keras_prob:.1%}). "
                        f"YOLO classified as {DAMAGE_LABELS[damage_type]} ({yolo_conf:.1%})."
                    ),
                )

            # YOLO ran but found no bounding box
            # Keras is still confident → likely texture damage (Alligator Crack)
            print(f"DEBUG [Step2 YOLO] No box found → defaulting to D20 (texture damage)")
            return _damage_result(
                damage_type      = "D20",
                confidence       = keras_prob,
                keras_confidence = keras_prob,
                image_w          = orig_w,
                image_h          = orig_h,
                model_type       = "keras_texture",
                note             = (
                    f"Keras detected damage ({keras_prob:.1%}). "
                    "YOLO found no discrete object → Alligator Crack (texture-based damage)."
                ),
            )

        except Exception as e:
            print(f"DEBUG [Step2 YOLO] Error: {e}")

    # YOLO not available → use Keras result only
    print("DEBUG [Step2] YOLO unavailable → Keras-only result")
    return _damage_result(
        damage_type      = "D20",
        confidence       = keras_prob,
        keras_confidence = keras_prob,
        image_w          = orig_w,
        image_h          = orig_h,
        model_type       = "keras_only",
        note             = f"Keras detected damage ({keras_prob:.1%}). YOLO not available.",
    )


def _yolo_only(img: Image.Image, image_data: bytes, orig_w: int, orig_h: int) -> Dict[str, Any]:
    """YOLO-only fallback when Keras is unavailable."""
    if not YOLO_AVAILABLE:
        return {"success": False, "detected": False, "message": "No models available."}
    try:
        model   = load_yolo_model()
        results = model.predict(source=img, conf=YOLO_CONF_THRESHOLD, verbose=False)
        if results and results[0].boxes is not None and len(results[0].boxes) > 0:
            boxes    = results[0].boxes
            best_idx = int(boxes.conf.argmax())
            yolo_conf = float(boxes.conf[best_idx].cpu().numpy())
            class_id  = int(boxes.cls[best_idx].cpu().numpy())
            x1, y1, x2, y2 = boxes.xyxy[best_idx].cpu().numpy()
            damage_type = DAMAGE_CLASSES.get(class_id, "D20")
            return _damage_result(
                damage_type=damage_type, confidence=yolo_conf, keras_confidence=0.0,
                image_w=orig_w, image_h=orig_h,
                bbox={"x1": int(x1), "y1": int(y1), "x2": int(x2), "y2": int(y2)},
                model_type="yolo_only", note="Keras unavailable. YOLO-only result.",
            )
        return _clean_road_result(orig_w, orig_h, 0.0)
    except Exception as e:
        return {"success": False, "detected": False, "message": str(e)}


def get_model_info() -> Dict[str, Any]:
    yolo_path = YOLO_MODEL_PATH if os.path.exists(YOLO_MODEL_PATH) else "yolov8n.pt (fallback)"
    return {
        "pipeline":        "Keras (damage? yes/no) → YOLO (type + danger)",
        "keras_available": KERAS_AVAILABLE,
        "yolo_available":  YOLO_AVAILABLE,
        "yolo_model":      yolo_path,
        "yolo_classes":    DAMAGE_CLASSES,
        "thresholds": {
            "keras_damage": KERAS_DAMAGE_THRESHOLD,
            "keras_road":   KERAS_ROAD_THRESHOLD,
            "yolo_conf":    YOLO_CONF_THRESHOLD,
        },
        "damage_types": DAMAGE_LABELS,
        "damage_types_ar": DAMAGE_LABELS_AR,
    }
