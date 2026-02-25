"""
Road Damage Prediction Module
HYBRID MODE: Keras (damage detection) + YOLO (type classification)
- Keras: Trained on roads, detects if damage exists (yes/no)
- YOLO: Classifies damage type (D00/D10/D20/D40)
"""

import os
import numpy as np
from PIL import Image
import io

# Use hybrid approach (best of both models)
try:
    from predict_hybrid import (
        predict_damage,
        get_model_info,
        DAMAGE_CLASSES,
        DAMAGE_LABELS,
        DAMAGE_LABELS_AR
    )
    print("[OK] Using HYBRID mode: Keras + YOLO")
    print("  - Keras: Damage detection (binary)")
    print("  - YOLO: Type classification")
    HYBRID_MODE = True
except ImportError as e:
    print(f"[WARN] Hybrid mode failed: {e}")
    print("  Falling back to YOLO-only mode...")
    HYBRID_MODE = False
    
    # Import YOLO for fallback
    try:
        from ultralytics import YOLO
        YOLO_AVAILABLE = True
    except ImportError:
        YOLO_AVAILABLE = False
    
    # Model configuration for fallback mode
    MODEL_DIR = os.path.dirname(os.path.dirname(__file__))
    YOLO_MODEL_PATH = os.path.join(MODEL_DIR, "road_damage_yolo.pt")
    AREA_THRESHOLD = 0.20
    
    DAMAGE_CLASSES = {
        0: "D00",
        1: "D10",
        2: "D20",
        3: "D40",
        4: "D50",
    }
    
    DAMAGE_LABELS = {
        "D00": "Longitudinal Crack",
        "D10": "Transverse Crack", 
        "D20": "Alligator Crack",
        "D40": "Pothole",
        "D50": "Road Debris",
    }
    
    DAMAGE_LABELS_AR = {
        "D00": "شق طولي",
        "D10": "شق عرضي",
        "D20": "شق تمساحي",
        "D40": "حفرة",
        "D50": "حطام على الطريق",
    }
    
    _model = None
    
    def calculate_danger_level(damage_type: str, confidence: float) -> dict:
        """
        Calculate danger level (1-5) based on damage type and confidence.
        
        Danger Level Scale:
        1 - Very Low: Minor cracks, low confidence
        2 - Low: Small cracks, medium confidence
        3 - Moderate: Significant cracks or small pothole
        4 - High: Large cracks or medium pothole
        5 - Critical: Large pothole, high confidence - immediate risk
        
        Returns: dict with danger_level (1-5), danger_description, and danger_description_ar
        """
        # Base danger levels for each damage type
        type_base_danger = {
            "D00": 2,  # Longitudinal Crack - moderate concern
            "D10": 2,  # Transverse Crack - moderate concern
            "D20": 3,  # Alligator Crack - more serious (structural issue)
            "D40": 4,  # Pothole - highest base danger
            "D50": 2,  # Road Debris - moderate concern
        }
        
        base_danger = type_base_danger.get(damage_type, 3)
        
        # Adjust based on confidence
        if confidence > 0.80:
            # Very confident detection - increase danger
            danger_level = min(5, base_danger + 1)
        elif confidence < 0.50:
            # Low confidence - decrease danger
            danger_level = max(1, base_danger - 1)
        else:
            danger_level = base_danger
        
        # Descriptions for each danger level
        danger_descriptions = {
            1: {"en": "Very Low Risk", "ar": "خطر منخفض جداً"},
            2: {"en": "Low Risk", "ar": "خطر منخفض"},
            3: {"en": "Moderate Risk", "ar": "خطر متوسط"},
            4: {"en": "High Risk", "ar": "خطر عالي"},
            5: {"en": "Critical Risk - Immediate Attention Required", "ar": "خطر حرج - يتطلب اهتماماً فورياً"},
        }
        
        desc = danger_descriptions.get(danger_level, danger_descriptions[3])
        
        return {
            "danger_level": danger_level,
            "danger_description": desc["en"],
            "danger_description_ar": desc["ar"]
        }
    
    
    def get_damage_category(damage_type: str) -> dict:
        """
        Simplify damage type to either "Pothole" or "Crack"
        
        Returns: dict with category and category_ar
        """
        if damage_type == "D40":
            return {
                "category": "Pothole",
                "category_ar": "حفرة"
            }
        else:
            # D00, D10, D20, D50 are all crack/debris types (non-pothole)
            return {
                "category": "Crack",
                "category_ar": "شق"
            }
    
    
    def calculate_danger_score(damage_type: str, detection_confidence: float) -> float:
        """
        Calculate how dangerous the damage is from 0.0 to 1.0
        
        This combines:
        1. Damage type severity (potholes are more dangerous than cracks)
        2. Detection confidence (higher confidence = we're sure it's dangerous)
        
        Returns: float from 0.0 (not dangerous) to 1.0 (extremely dangerous)
        """
        # Base danger scores for each damage type (0.0 to 1.0)
        type_danger_scores = {
            "D00": 0.3,  # Longitudinal Crack - low-moderate danger
            "D10": 0.35, # Transverse Crack - low-moderate danger
            "D20": 0.55, # Alligator Crack - moderate danger (structural issue)
            "D40": 0.85, # Pothole - high danger (immediate hazard)
            "D50": 0.25, # Road Debris - low danger
        }
        
        base_score = type_danger_scores.get(damage_type, 0.5)
        
        # Adjust based on detection confidence
        # Higher confidence means we're more certain about the danger
        # Lower confidence reduces the danger score
        danger_score = base_score * (0.5 + (detection_confidence * 0.5))
        
        # Cap between 0.0 and 1.0
        danger_score = max(0.0, min(1.0, danger_score))
        
        return round(danger_score * 100, 1)
    
    def load_model():
        """Load YOLO model (fallback mode only)"""
        global _model
        if not YOLO_AVAILABLE:
            raise RuntimeError("YOLOv8 not available")
        if _model is None:
            if os.path.exists(YOLO_MODEL_PATH):
                _model = YOLO(YOLO_MODEL_PATH)
            else:
                _model = YOLO("yolov8n.pt")
        return _model
    
    def predict_damage(image_data: bytes) -> dict:
        """
        Fallback prediction using YOLO only
        """
        if not YOLO_AVAILABLE:
            return {
                "success": False,
                "detected": False,
                "message": "No models available",
                "error": "NO_MODELS"
            }
        
        try:
            model = load_model()
            image = Image.open(io.BytesIO(image_data))
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            orig_w, orig_h = image.size
            results = model.predict(source=image, conf=0.40, verbose=False)
            
            if len(results) > 0 and results[0].boxes is not None and len(results[0].boxes) > 0:
                box = results[0].boxes[0]
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                confidence = float(box.conf[0].cpu().numpy())
                class_id = int(box.cls[0].cpu().numpy())
                
                damage_class = DAMAGE_CLASSES.get(class_id % len(DAMAGE_CLASSES), "D40")
                
                # Calculate how dangerous the damage is (0.0 to 1.0)
                danger_score = calculate_danger_score(damage_class, confidence)
                
                # Calculate danger level (1-5 rating)
                danger_info = calculate_danger_level(damage_class, confidence)
                
                # Get simplified category
                category_info = get_damage_category(damage_class)
                
                return {
                    "success": True,
                    "detected": True,
                    "damage_type": damage_class,
                    "damage_label": DAMAGE_LABELS[damage_class],
                    "damage_label_ar": DAMAGE_LABELS_AR[damage_class],
                    "damage_category": category_info["category"],
                    "damage_category_ar": category_info["category_ar"],
                    "confidence": confidence,
                    "danger_score": danger_score,
                    "danger_level": danger_info["danger_level"],
                    "danger_description": danger_info["danger_description"],
                    "danger_description_ar": danger_info["danger_description_ar"],
                    "severity_score": confidence,
                    "severity": "high" if confidence > 0.66 else "medium" if confidence > 0.33 else "low",
                    "color": "#FF0000" if confidence > 0.66 else "#FFFF00" if confidence > 0.33 else "#00FF00",
                    "bounding_boxes": [{
                        "class": damage_class,
                        "label": DAMAGE_LABELS[damage_class],
                        "bbox": {"x1": int(x1), "y1": int(y1), "x2": int(x2), "y2": int(y2)}
                    }],
                    "image_size": {"width": orig_w, "height": orig_h},
                    "message": f"Damage detected: {DAMAGE_LABELS[damage_class]} (Confidence: {confidence:.1%}, Danger: {danger_score:.1%}, Level: {danger_info['danger_level']}/5)",
                    "note": "YOLO-only mode (hybrid unavailable)"
                }
            else:
                return {
                    "success": True,
                    "detected": False,
                    "damage_type": None,
                    "damage_label": "No damage detected",
                    "confidence": 0.0,
                    "message": "No damage detected"
                }
        except Exception as e:
            return {
                "success": False,
                "detected": False,
                "message": f"Error: {str(e)}",
                "error": str(e)
            }
    
    def get_model_info() -> dict:
        """Get model info (fallback mode only)"""
        return {
            "available": YOLO_AVAILABLE,
            "model_type": "YOLOv8",
            "hybrid_mode": False,
            "note": "Fallback YOLO-only mode"
        }
