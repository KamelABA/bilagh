import requests
from io import BytesIO
from PIL import Image
import numpy as np

# url = "https://web-production-3f689.up.railway.app/predict"
url = "http://192.168.2.224:8000/predict" # Let's test local first then railway

# Create a dummy image
img = Image.new('RGB', (640, 480), color=(150, 150, 150))
buf = BytesIO()
img.save(buf, format='JPEG')
files = {"file": ("test.jpg", buf.getvalue(), "image/jpeg")}

# Railway
url_railway = "https://web-production-3f689.up.railway.app/predict"
try:
    res = requests.post(url_railway, files={"file": ("test.jpg", buf.getvalue(), "image/jpeg")})
    print("Railway JSON:", res.json())
except Exception as e:
    print("Railway Error:", e)

# Local
url_local = "http://localhost:8000/predict"
try:
    res_local = requests.post(url_local, files={"file": ("test.jpg", buf.getvalue(), "image/jpeg")})
    print("Local JSON:", res_local.json())
except Exception as e:
    print("Local Error:", e)
