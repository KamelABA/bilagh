import requests
from io import BytesIO
from PIL import Image
import numpy as np

url = "https://web-production-3f689.up.railway.app/predict"
# url = "http://192.168.2.224:8000/predict"

# 1. Random Noise (should be good road)
noise = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
img = Image.fromarray(noise)
buf = BytesIO()
img.save(buf, format="JPEG")
files = {"file": ("noise.jpg", buf.getvalue(), "image/jpeg")}
res = requests.post(url, files=files)
print("Noise:", res.json())

# 2. White image
white = np.full((480, 640, 3), 255, dtype=np.uint8)
img2 = Image.fromarray(white)
buf2 = BytesIO()
img2.save(buf2, format="JPEG")
files2 = {"file": ("white.jpg", buf2.getvalue(), "image/jpeg")}
res2 = requests.post(url, files=files2)
print("White:", res2.json())
