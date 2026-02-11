"""
Quick Script to Download a Pre-trained Road Damage Detection Model
This will download a YOLOv8 model trained on road damage detection
"""

import os
import requests
from pathlib import Path

def download_pretrained_model():
    """
    Download a pre-trained road damage detection model
    
    Note: This is a placeholder. You'll need to:
    1. Find a pre-trained RDD2020 model from Roboflow/Hugging Face
    2. Update the URL below
    3. Run this script
    """
    
    # Example sources for pre-trained models:
    # - Roboflow Universe: https://universe.roboflow.com/
    # - Hugging Face: https://huggingfaceco/
    # - GitHub repositories with RDD2020 models
    
    MODEL_URL = "YOUR_MODEL_URL_HERE"  # Replace with actual model URL
    OUTPUT_PATH = Path(__file__).parent.parent / "road_damage_yolo.pt"
    
    print(f"📥 Downloading road damage detection model...")
    print(f"📍 URL: {MODEL_URL}")
    print(f"💾 Saving to: {OUTPUT_PATH}")
    
    if MODEL_URL == "YOUR_MODEL_URL_HERE":
        print("\n⚠️  ERROR: Please update MODEL_URL with a real model download link")
        print("\n📚 Where to find models:")
        print("   1. Roboflow Universe: https://universe.roboflow.com/search?q=road+damage")
        print("   2. Hugging Face: https://huggingface.co/models?search=road+damage+yolo")
        print("   3. Kaggle: https://www.kaggle.com/search?q=road+damage+detection+yolo")
        print("\n💡 Or train your own:")
        print("   See: https://docs.ultralytics.com/modes/train/")
        return False
    
    try:
        response = requests.get(MODEL_URL, stream=True)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        
        with open(OUTPUT_PATH, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"\r⏳ Progress: {percent:.1f}% ({downloaded}/{total_size} bytes)", end='')
        
        print(f"\n✅ Model downloaded successfully!")
        print(f"📁 Location: {OUTPUT_PATH}")
        print(f"🔄 Restart your backend server to load the new model")
        return True
        
    except Exception as e:
        print(f"\n❌ Error downloading model: {e}")
        return False


def train_simple_model():
    """
    Train a simple road damage detection model using YOLOv8
    Requires: RDD2020 dataset downloaded
    """
    try:
        from ultralytics import YOLO
        
        print("🎯 Training road damage detection model...")
        print("📝 Note: This requires RDD2020 dataset in YOLO format")
        print("")
        
        # Check if dataset exists
        dataset_path = Path(__file__).parent / "rdd2020_dataset" / "data.yaml"
        
        if not dataset_path.exists():
            print("⚠️  Dataset not found!")
            print("📥 Download RDD2020 dataset:")
            print("   - Kaggle: https://www.kaggle.com/datasets/chitholian/road-damage-dataset-rdd2020")
            print("   - Roboflow: https://universe.roboflow.com/ (search 'RDD2020')")
            print("")
            print("📂 Place dataset in: backend/rdd2020_dataset/")
            print("📄 With structure:")
            print("   rdd2020_dataset/")
            print("   ├── data.yaml")
            print("   ├── train/")
            print("   │   ├── images/")
            print("   │   └── labels/")
            print("   └── val/")
            print("       ├── images/")
            print("       └── labels/")
            return False
        
        # Load base model
        model = YOLO('yolov8n.pt')
        
        # Train
        print("🚀 Starting training...")
        results = model.train(
            data=str(dataset_path),
            epochs=50,  # Increase for better results
            imgsz=640,
            batch=16,
            name='road_damage_detector',
            patience=10,
            save=True,
            device='cpu'  # Change to 'cuda' if you have GPU
        )
        
        # Save model
        output_path = Path(__file__).parent.parent / "road_damage_yolo.pt"
        model.save(output_path)
        
        print(f"✅ Training complete!")
        print(f"📁 Model saved to: {output_path}")
        print(f"🔄 Restart your backend to use the new model")
        return True
        
    except ImportError:
        print("❌ Ultralytics not installed")
        print("📦 Install with: pip install ultralytics")
        return False
    except Exception as e:
        print(f"❌ Training error: {e}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("🛣️  Road Damage Detection Model Setup")
    print("=" * 60)
    print("")
    print("Choose an option:")
    print("  1. Download pre-trained model (recommended)")
    print("  2. Train custom model (requires dataset)")
    print("  3. Exit")
    print("")
    
    choice = input("Enter choice (1-3): ").strip()
    
    if choice == "1":
        download_pretrained_model()
    elif choice == "2":
        train_simple_model()
    else:
        print("👋 Exiting...")
