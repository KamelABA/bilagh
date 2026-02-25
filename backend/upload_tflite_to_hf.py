"""
Upload road_damage_model.tflite to Hugging Face Hub.
The file is only ~1.8 MB so it fits on any free tier.

Requirements: pip install huggingface_hub
Run: python backend/upload_tflite_to_hf.py
"""

import os
import sys

BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TFLITE_PATH = os.path.join(BASE_DIR, "road_damage_model.tflite")

if not os.path.exists(TFLITE_PATH):
    print(f"ERROR: {TFLITE_PATH} not found.")
    print("Run: python backend/convert_to_tflite.py  first.")
    sys.exit(1)

mb = os.path.getsize(TFLITE_PATH) / 1024 / 1024
print(f"File: {TFLITE_PATH}  ({mb:.1f} MB)")

from huggingface_hub import HfApi

# You can use the same HF account as the YOLO model download
# No token needed for public upload if you have HF CLI logged in
# Run: huggingface-cli login   (first time)

REPO_ID   = "KamelABA/bilagh-models"   # will be created automatically
FILE_NAME = "road_damage_model.tflite"

api = HfApi()
print(f"\nUploading to: https://huggingface.co/{REPO_ID}/{FILE_NAME}")
print("(This may take a moment...)")

try:
    api.create_repo(repo_id=REPO_ID, repo_type="model", exist_ok=True, private=False)
    url = api.upload_file(
        path_or_fileobj=TFLITE_PATH,
        path_in_repo=FILE_NAME,
        repo_id=REPO_ID,
        repo_type="model",
    )
    download_url = f"https://huggingface.co/{REPO_ID}/resolve/main/{FILE_NAME}"
    print(f"\nDone!")
    print(f"Download URL: {download_url}")
    print(f"\nSet this as TFLITE_MODEL_URL in Render environment variables:")
    print(f"  TFLITE_MODEL_URL={download_url}")
except Exception as e:
    print(f"ERROR: {e}")
    print("\nAlternative: log in first with:  huggingface-cli login")
