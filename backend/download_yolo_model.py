"""
Download a custom-trained YOLOv8 road damage model from Hugging Face.
Trained on RDD2022 dataset — detects D00, D10, D20, D40.

Run:  python download_yolo_model.py
"""

import os
import sys

# Target location — same dir as predict_hybrid.py expects
DEST = os.path.join(os.path.dirname(os.path.dirname(__file__)), "road_damage_yolo.pt")

def try_huggingface():
    """Try downloading via huggingface_hub."""
    try:
        from huggingface_hub import hf_hub_download
        print("Trying Hugging Face Hub (ozair23/yolov8-road-damage-detector)...")
        path = hf_hub_download(
            repo_id="ozair23/yolov8-road-damage-detector",
            filename="best.pt",
            local_dir=os.path.dirname(DEST),
        )
        # Rename to the expected filename
        import shutil
        shutil.move(path, DEST)
        print(f"Saved to: {DEST}")
        return True
    except Exception as e:
        print(f"  HF Hub failed: {e}")
        return False


def try_ultralytics_download():
    """
    Fallback: train YOLOv8n from scratch on a tiny road damage sample.
    Skipped for now — just use the generic yolov8n.pt as placeholder.
    """
    try:
        from ultralytics import YOLO
        print("Downloading YOLOv8n as placeholder (generic, not road-damage-trained)...")
        model = YOLO("yolov8n.pt")  # this downloads ~6MB
        import shutil
        shutil.copy("yolov8n.pt", DEST)
        print(f"Saved generic yolov8n.pt to: {DEST}")
        print("NOTE: This is NOT trained on road damage. Replace with a custom model.")
        return True
    except Exception as e:
        print(f"  Ultralytics fallback failed: {e}")
        return False


if __name__ == "__main__":
    if os.path.exists(DEST):
        size_mb = os.path.getsize(DEST) / 1024 / 1024
        print(f"road_damage_yolo.pt already exists ({size_mb:.1f} MB) at: {DEST}")
        sys.exit(0)

    print(f"Target: {DEST}\n")

    if try_huggingface():
        size_mb = os.path.getsize(DEST) / 1024 / 1024
        print(f"\nDone! road_damage_yolo.pt ({size_mb:.1f} MB)")
    elif try_ultralytics_download():
        print("\nDone (generic fallback).")
    else:
        print("\nFailed to download model.")
        sys.exit(1)
