"""
Startup model downloader for Railway / Render.
Runs before uvicorn. Downloads models from public URLs.

Models:
  1. road_damage_yolo.onnx  — env: YOLO_MODEL_URL  (Hugging Face or Google Drive)
  2. road_damage_model.tflite — env: TFLITE_MODEL_URL
"""

import os
import sys
import shutil
import urllib.request

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODELS = [
    {
        "name":      "YOLO ONNX road-damage model (11.7 MB)",
        "dest":      os.path.join(BASE_DIR, "road_damage_yolo.onnx"),
        "env":       "YOLO_MODEL_URL",
        "min_bytes": 1_000_000,
    },
    {
        "name":      "Keras TFLite binary classifier (1.8 MB)",
        "dest":      os.path.join(BASE_DIR, "road_damage_model.tflite"),
        "env":       "TFLITE_MODEL_URL",
        "min_bytes": 100_000,
    },
]


def _progress(count, block_size, total):
    if total > 0:
        pct = min(100, count * block_size * 100 // total)
        print(f"\r  {pct}%", end="", flush=True)


def download(url: str, dest: str):
    tmp = dest + ".tmp"
    try:
        urllib.request.urlretrieve(url, tmp, reporthook=_progress)
        print()
        shutil.move(tmp, dest)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def main():
    print("=" * 55)
    print("  Bilagh — Startup Model Downloader")
    print("=" * 55)

    for m in MODELS:
        dest = m["dest"]
        name = m["name"]
        url  = os.environ.get(m["env"], "")

        if os.path.exists(dest) and os.path.getsize(dest) >= m["min_bytes"]:
            mb = os.path.getsize(dest) / 1024 / 1024
            print(f"  CACHED ({mb:.1f} MB): {name}")
            continue

        if not url:
            print(f"  SKIP: {name}")
            print(f"        Set env var {m['env']} to enable.")
            continue

        print(f"  Downloading: {name}")
        try:
            download(url, dest)
            mb = os.path.getsize(dest) / 1024 / 1024
            print(f"  OK ({mb:.1f} MB)")
        except Exception as e:
            print(f"  WARNING: {e}")
        print()

    print("=" * 55)
    print("  Starting uvicorn...")
    print("=" * 55)


if __name__ == "__main__":
    main()
