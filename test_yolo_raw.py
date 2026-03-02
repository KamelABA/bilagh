import sys
from PIL import Image
from backend.predict_hybrid import load_yolo_model, _preprocess_yolo, _run_yolo_onnx
import os

img_path = r"C:\Users\still\Documents\GitHub\bilagh\assets\images\agent\photo_5778606569963592912_y.jpg"
print(f"Testing {img_path}")

img = Image.open(img_path).convert("RGB")
print(f"Image size: {img.size}")

# Run yolo
detections = _run_yolo_onnx(img)

print("Default Detections:", detections)

# Let's see what the raw scores are by manually checking
session = load_yolo_model()
inp_tensor, scale, pad_x, pad_y = _preprocess_yolo(img)
import numpy as np
input_name = session.get_inputs()[0].name
raw = session.run(None, {input_name: inp_tensor})[0]
output = raw[0]
class_logits = output[4:, :].T
class_confs = class_logits.max(axis=1)

print("Max confidence in whole image:", class_confs.max())
print("Top 10 confidences:", sorted(class_confs, reverse=True)[:10])

