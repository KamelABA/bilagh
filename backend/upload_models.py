"""
One-time script: Upload ML model files to Cloudinary as raw assets.
Run this ONCE locally, then Railway will download them at startup.

Usage:
    python upload_models.py
"""

import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv

load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "dtiji2s4k"),
    api_key=os.getenv("CLOUDINARY_API_KEY", "433893314248796"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "4Uj51eHZ9_MQRr1LVSHP1H2dRLk"),
    secure=True
)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

MODELS = [
    {
        "local_path": os.path.join(BASE_DIR, "road_damage_model (1).keras"),
        "public_id": "bilagh_models/road_damage_model",
        "display": "Keras model (.keras)",
    },
    {
        "local_path": os.path.join(BASE_DIR, "road_damage_yolo.pt"),
        "public_id": "bilagh_models/road_damage_yolo",
        "display": "YOLO model (.pt)",
    },
]

def upload():
    for m in MODELS:
        path = m["local_path"]
        if not os.path.exists(path):
            print(f"⚠️  SKIPPED (not found): {m['display']} → {path}")
            continue

        size_mb = os.path.getsize(path) / 1024 / 1024
        print(f"⬆️  Uploading {m['display']} ({size_mb:.1f} MB) ...")

        result = cloudinary.uploader.upload(
            path,
            public_id=m["public_id"],
            resource_type="raw",   # required for non-image files
            overwrite=True,
        )

        url = result.get("secure_url")
        print(f"✅ Done: {url}\n")
        print(f"   → Add this URL to your Railway env vars:")
        key = "KERAS_MODEL_URL" if ".keras" in path else "YOLO_MODEL_URL"
        print(f"      {key}={url}\n")

if __name__ == "__main__":
    upload()
