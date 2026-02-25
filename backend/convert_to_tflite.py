"""
One-time conversion: road_damage_model.keras -> road_damage_model.tflite

TFLite is ~10x smaller memory footprint on the server:
  Full TF:    ~400MB RAM at runtime
  TFLite:     ~30MB RAM at runtime

Run this ONCE locally (needs TensorFlow installed):
  python backend/convert_to_tflite.py
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KERAS_PATH  = os.path.join(BASE_DIR, "road_damage_model (1).keras")
TFLITE_PATH = os.path.join(BASE_DIR, "road_damage_model.tflite")

def convert():
    print(f"Loading Keras model from:\n  {KERAS_PATH}")
    if not os.path.exists(KERAS_PATH):
        print("ERROR: Keras model not found.")
        sys.exit(1)

    import tensorflow as tf

    model = tf.keras.models.load_model(KERAS_PATH)
    print(f"Model input shape : {model.input_shape}")
    print(f"Model output shape: {model.output_shape}")

    print("\nConverting to TFLite...")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    # Optimise for size and speed
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model = converter.convert()

    with open(TFLITE_PATH, "wb") as f:
        f.write(tflite_model)

    keras_mb  = os.path.getsize(KERAS_PATH)  / 1024 / 1024
    tflite_mb = os.path.getsize(TFLITE_PATH) / 1024 / 1024
    print(f"\nDone!")
    print(f"  Original .keras : {keras_mb:.1f} MB")
    print(f"  Converted .tflite: {tflite_mb:.1f} MB  ({keras_mb/tflite_mb:.1f}x smaller)")
    print(f"\nSaved to: {TFLITE_PATH}")
    print("\nNext: Upload road_damage_model.tflite to Hugging Face / Google Drive")
    print("      and set TFLITE_MODEL_URL env var on Render.")

if __name__ == "__main__":
    convert()
