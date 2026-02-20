"""
Keras Binary Damage Classifier
═══════════════════════════════
Role: Secondary texture-damage detector.
  • Input : raw image bytes
  • Output: single float `confidence` ∈ [0, 1] = probability of road damage
  • Called ONLY from predict_hybrid.py when YOLO finds nothing.
  • Keras should NOT make the final "is_road / not_road" decision on its own —
    that judgement is made in the hybrid pipeline using BOTH models.
"""

import os
import numpy as np
from PIL import Image
import io
from typing import Dict, Any

try:
    import tensorflow as tf
    from tensorflow import keras
    KERAS_AVAILABLE = True
except ImportError:
    KERAS_AVAILABLE = False
    print("WARNING: TensorFlow not installed.")

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "road_damage_model (1).keras"
)

_model = None


def load_model():
    global _model
    if not KERAS_AVAILABLE:
        raise RuntimeError("TensorFlow is not installed.")
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Keras model not found at {MODEL_PATH}")
        print(f"Loading Keras model from {MODEL_PATH}...")
        _model = keras.models.load_model(MODEL_PATH)
        print(f"Keras model ready. Input: {_model.input_shape}")
    return _model


def preprocess_image(image: Image.Image, target_size=(224, 224)) -> np.ndarray:
    image = image.resize(target_size, Image.Resampling.LANCZOS)
    arr   = np.array(image).astype("float32") / 255.0
    return np.expand_dims(arr, axis=0)


def predict_damage(image_data: bytes) -> Dict[str, Any]:
    """
    Run the Keras binary classifier.

    Returns a flat dict with:
      confidence (float): raw sigmoid output, 0=clean 1=damaged
      detected   (bool):  confidence >= 0.65
    """
    if not KERAS_AVAILABLE:
        return _error("TensorFlow not installed.")

    try:
        model = load_model()

        image = Image.open(io.BytesIO(image_data))
        if image.mode != "RGB":
            image = image.convert("RGB")
        orig_w, orig_h = image.size

        if orig_w < 50 or orig_h < 50:
            return _error("Image too small (min 50×50).")

        target = model.input_shape[1:3]          # (H, W)
        arr    = preprocess_image(image, target_size=target)
        prob   = float(model.predict(arr, verbose=0)[0][0])

        print(f"DEBUG [Keras] damage_probability={prob:.4f}")

        detected = prob >= 0.65

        return {
            "success":        True,
            "is_road":        None,         # decided by hybrid pipeline
            "detected":       detected,
            "confidence":     prob,
            "image_size":     {"width": orig_w, "height": orig_h},
            "model_type":     "keras_binary",
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return _error(f"Keras error: {e}")


def _error(msg: str) -> Dict[str, Any]:
    return {
        "success":    False,
        "is_road":    None,
        "detected":   False,
        "confidence": 0.0,
        "message":    msg,
    }


# ── Utility helpers (used elsewhere) ─────────────────────────────────────────

def get_severity_level(score: float) -> str:
    if score < 0.33: return "low"
    if score < 0.66: return "medium"
    return "high"


def get_severity_color(score: float) -> str:
    if score < 0.33: return "#00FF00"
    if score < 0.66: return "#FFFF00"
    return "#FF0000"


def get_model_info() -> Dict[str, Any]:
    info = {
        "available":    KERAS_AVAILABLE,
        "model_path":   MODEL_PATH,
        "model_exists": os.path.exists(MODEL_PATH),
        "role":         "Secondary: texture-damage binary classifier (used when YOLO finds nothing)",
    }
    if KERAS_AVAILABLE and os.path.exists(MODEL_PATH):
        try:
            m = load_model()
            info["input_shape"]    = str(m.input_shape)
            info["output_shape"]   = str(m.output_shape)
            info["num_parameters"] = m.count_params()
        except Exception as e:
            info["load_error"] = str(e)
    return info
