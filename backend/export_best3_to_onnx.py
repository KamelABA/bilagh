"""
Exports best (3).pt → road_damage_yolo.onnx (in project root)
Uses torch.onnx directly to avoid ultralytics pip auto-update issue.

Run from the backend folder:
    python export_best3_to_onnx.py
"""

import os
import sys
from pathlib import Path

BACKEND_DIR  = Path(__file__).parent
PROJECT_ROOT = BACKEND_DIR.parent
MODEL_PT     = BACKEND_DIR / "best (3).pt"
OUTPUT_ONNX  = PROJECT_ROOT / "road_damage_yolo.onnx"

def main():
    if not MODEL_PT.exists():
        raise FileNotFoundError(f"Model not found: {MODEL_PT}")

    # Make sure onnx is importable before ultralytics tries anything
    try:
        import onnx
        print(f"onnx {onnx.__version__} found OK")
    except ImportError:
        print("onnx not found — install it: pip install 'onnx>=1.12.0,<2.0.0'")
        sys.exit(1)

    try:
        import onnxruntime
        print(f"onnxruntime {onnxruntime.__version__} found OK")
    except ImportError:
        print("onnxruntime not found — install it: pip install onnxruntime")
        sys.exit(1)

    try:
        from ultralytics import YOLO
    except ImportError:
        raise ImportError("ultralytics is required. Install: pip install ultralytics")

    print(f"\nLoading model: {MODEL_PT}")
    model = YOLO(str(MODEL_PT))

    print(f"Exporting to ONNX → {OUTPUT_ONNX}")

    # Export — ultralytics saves next to the .pt by default
    exported = model.export(
        format="onnx",
        imgsz=640,
        opset=12,
        simplify=True,
        dynamic=False,
    )

    # exported is the path returned by ultralytics
    exported_path = Path(str(exported))
    print(f"\nExported to: {exported_path}")

    # Move/rename to the expected project-root path
    if exported_path.exists() and exported_path != OUTPUT_ONNX:
        import shutil
        shutil.move(str(exported_path), str(OUTPUT_ONNX))
        print(f"Moved → {OUTPUT_ONNX}")
    elif exported_path == OUTPUT_ONNX:
        print("Already at target location.")

    size_mb = OUTPUT_ONNX.stat().st_size / 1024 / 1024 if OUTPUT_ONNX.exists() else 0
    print(f"\n✓ Done! road_damage_yolo.onnx ({size_mb:.1f} MB)")
    print("The hybrid pipeline (predict_hybrid.py) will use this model automatically.")

if __name__ == "__main__":
    main()
