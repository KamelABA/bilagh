import sys
from PIL import Image
from backend.predict_hybrid import load_yolo_model, _preprocess_yolo
import os

files = [
    r"C:\Users\still\Documents\GitHub\bilagh\assets\images\agent\photo_5778606569963592912_y.jpg",
    r"C:\Users\still\Documents\GitHub\bilagh\assets\images\agent\photo_5778606569963592914_y.jpg",
    r"C:\Users\still\Documents\GitHub\bilagh\assets\images\agent\photo_5778606569963592916_y.jpg",
    r"C:\Users\still\Documents\GitHub\bilagh\assets\images\agent\photo_5778606569963592917_y.jpg",
    r"C:\Users\still\Documents\GitHub\bilagh\assets\images\agent\photo_5778606569963592918_y.jpg",
    r"C:\Users\still\Documents\GitHub\bilagh\assets\images\agent\photo_5793960859003456730_y.jpg",
    r"C:\Users\still\Documents\GitHub\bilagh\assets\images\municipal\photo_5778606569963592921_y.jpg"
]

session = load_yolo_model()
input_name = session.get_inputs()[0].name

for f in files:
    try:
        img = Image.open(f).convert("RGB")
        inp_tensor, scale, pad_x, pad_y = _preprocess_yolo(img)
        
        raw = session.run(None, {input_name: inp_tensor})[0]
        output = raw[0]
        class_confs = output[4:, :].T.max(axis=1)
        
        print(f"{os.path.basename(f)} Max Conf:", class_confs.max())
    except Exception as e:
        print(f"Error on {f}: {e}")
