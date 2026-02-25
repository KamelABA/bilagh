"""
Keras Binary Damage Classifier — TFLite Runtime Version
═══════════════════════════════════════════════════════════
Uses tflite-runtime instead of full TensorFlow:
  Full TF:      ~400 MB RAM
  tflite-runtime: ~30 MB RAM  ← safe for Render free tier (512 MB)

Model input : (1, 128, 128, 3)  float32 normalized 0-1
Model output: (1, 1)            sigmoid → damage probability
"""

import os
import numpy as np
from PIL import Image
import io
from typing import Dict, Any

# ── TFLite runtime (lightweight, ~30 MB RAM) ─────────────────────────────────
KERAS_AVAILABLE = False
_interpreter   = None

try:
    import tflite_runtime.interpreter as tflite
    KERAS_AVAILABLE = True
    _BACKEND = "tflite_runtime"
except ImportError:
    try:
        # Fallback: TFLite bundled inside full TensorFlow
        import tensorflow as tf
        tflite = tf.lite
        KERAS_AVAILABLE = True
        _BACKEND = "tensorflow_lite"
    except ImportError:
        tflite = None
        _BACKEND = "none"

# ── Model path ────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH  = os.path.join(BASE_DIR, "road_damage_model.tflite")

# Input size expected by the model (matches training: 128x128)
INPUT_SIZE  = (128, 128)


def load_model():
    global _interpreter
    if _interpreter is not None:
        return _interpreter
    if not KERAS_AVAILABLE:
        raise RuntimeError("Neither tflite_runtime nor tensorflow is installed.")
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"TFLite model not found: {MODEL_PATH}")

    print(f"Loading TFLite model ({os.path.getsize(MODEL_PATH)/1024/1024:.1f} MB)...")
    _interpreter = tflite.Interpreter(model_path=MODEL_PATH)
    _interpreter.allocate_tensors()

    inp  = _interpreter.get_input_details()[0]
    out  = _interpreter.get_output_details()[0]
    print(f"TFLite ready. Input: {inp['shape']}  Output: {out['shape']}  Backend: {_BACKEND}")
    return _interpreter


def preprocess(image: Image.Image) -> np.ndarray:
    image = image.resize(INPUT_SIZE, Image.Resampling.LANCZOS)
    arr   = np.array(image, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)          # (1, 128, 128, 3)


def predict_damage(image_data: bytes) -> Dict[str, Any]:
    """
    Run TFLite binary classifier.
    Returns: { confidence: float, detected: bool, ... }
    """
    if not KERAS_AVAILABLE:
        return _error("tflite_runtime not installed.")

    try:
        interp = load_model()

        image = Image.open(io.BytesIO(image_data))
        if image.mode != "RGB":
            image = image.convert("RGB")
        orig_w, orig_h = image.size

        if orig_w < 32 or orig_h < 32:
            return _error("Image too small (min 32×32).")

        inp_details = interp.get_input_details()
        out_details = interp.get_output_details()

        arr = preprocess(image)
        interp.set_tensor(inp_details[0]["index"], arr)
        interp.invoke()

        prob = float(interp.get_tensor(out_details[0]["index"])[0][0])
        print(f"DEBUG [TFLite Keras] damage_probability={prob:.4f}")

        return {
            "success":    True,
            "is_road":    None,      # decided by predict_hybrid
            "detected":   prob >= 0.65,
            "confidence": prob,
            "image_size": {"width": orig_w, "height": orig_h},
            "model_type": f"tflite_binary ({_BACKEND})",
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return _error(f"TFLite error: {e}")


def _error(msg: str) -> Dict[str, Any]:
    return {
        "success":    False,
        "is_road":    None,
        "detected":   False,
        "confidence": 0.0,
        "message":    msg,
    }


# ── Utility helpers ───────────────────────────────────────────────────────────
def get_severity_level(score: float) -> str:
    if score < 0.33: return "low"
    if score < 0.66: return "medium"
    return "high"


def get_severity_color(score: float) -> str:
    if score < 0.33: return "#00FF00"
    if score < 0.66: return "#FFFF00"
    return "#FF0000"


def get_model_info() -> Dict[str, Any]:
    return {
        "available":     KERAS_AVAILABLE,
        "backend":       _BACKEND,
        "model_path":    MODEL_PATH,
        "model_exists":  os.path.exists(MODEL_PATH),
        "input_size":    list(INPUT_SIZE),
        "role":          "Binary damage detector (yes/no) — TFLite for low memory usage",
        "memory_usage":  "~30 MB (tflite) vs ~400 MB (full TensorFlow)",
    }
