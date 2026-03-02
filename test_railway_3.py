import requests
from io import BytesIO
import os

img_path = r"C:\Users\still\Documents\GitHub\bilagh\assets\images\agent\photo_5778606569963592912_y.jpg"

with open(img_path, "rb") as f:
    img_bytes = f.read()

print("Testing with real image:", img_path)

# Railway
url_railway = "https://web-production-3f689.up.railway.app/predict"
try:
    res = requests.post(url_railway, files={"file": ("test.jpg", img_bytes, "image/jpeg")})
    print("Railway JSON:", res.json())
except Exception as e:
    print("Railway Error:", e)

# Local
url_local = "http://localhost:8000/predict"
try:
    res_local = requests.post(url_local, files={"file": ("test.jpg", img_bytes, "image/jpeg")})
    print("Local JSON:", res_local.json())
except Exception as e:
    print("Local Error:", e)
