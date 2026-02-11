"""
Hybrid Road Damage Prediction
Combines Keras (binary: damage detection) + YOLO (type classification)
Best of both worlds!
"""

import os
import numpy as np
from PIL import Image
import io
from typing import Dict, Any

# Import both models
try:
    from predict_keras import predict_damage as keras_predict_raw, KERAS_AVAILABLE
    KERAS_AVAILABLE = KERAS_AVAILABLE
except ImportError:
    KERAS_AVAILABLE = False

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

# YOLO config
MODEL_DIR = os.path.dirname(os.path.dirname(__file__))
YOLO_MODEL_PATH = os.path.join(MODEL_DIR, "road_damage_yolo.pt")

DAMAGE_CLASSES = {
    0: "D00",  # Longitudinal Crack
    1: "D10",  # Transverse Crack
    2: "D20",  # Alligator Crack
    3: "D40",  # Pothole
}

DAMAGE_LABELS = {
    "D00": "Longitudinal Crack",
    "D10": "Transverse Crack", 
    "D20": "Alligator Crack",
    "D40": "Pothole",
}

DAMAGE_LABELS_AR = {
    "D00": "شق طولي",
    "D10": "شق عرضي",
    "D20": "شق تمساحي",
    "D40": "حفرة",
}

_yolo_model = None

def load_yolo_model():
    """Load YOLO model"""
    global _yolo_model
    if _yolo_model is None:
        if os.path.exists(YOLO_MODEL_PATH):
            _yolo_model = YOLO(YOLO_MODEL_PATH)
        else:
            _yolo_model = YOLO("yolov8n.pt")
    return _yolo_model


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
        # D00, D10, D20 are all crack types
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
    }
    
    base_score = type_danger_scores.get(damage_type, 0.5)
    
    # Adjust based on detection confidence
    # Higher confidence means we're more certain about the danger
    # Lower confidence reduces the danger score
    danger_score = base_score * (0.5 + (detection_confidence * 0.5))
    
    # Cap between 0.0 and 1.0
    danger_score = max(0.0, min(1.0, danger_score))
    
    return round(danger_score, 2)


def classify_damage_type_with_yolo(image_data: bytes) -> Dict[str, Any]:
    """Use YOLO to classify damage type"""
    try:
        model = load_yolo_model()
        image = Image.open(io.BytesIO(image_data))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        results = model.predict(source=image, conf=0.50, verbose=False)
        
        if len(results) > 0 and results[0].boxes is not None and len(results[0].boxes) > 0:
            # Get best detection
            box = results[0].boxes[0]
            confidence = float(box.conf[0].cpu().numpy())
            class_id = int(box.cls[0].cpu().numpy())
            
            damage_class = DAMAGE_CLASSES.get(class_id % len(DAMAGE_CLASSES), "D40")
            
            return {
                "success": True,
                "detected": True,
                "damage_type": damage_class,
                "damage_label": DAMAGE_LABELS.get(damage_class),
                "damage_label_ar": DAMAGE_LABELS_AR.get(damage_class),
                "yolo_confidence": confidence
            }
        
        # No specific type detected
        return {
            "success": False,
            "detected": False,
            "damage_type": None,
            "damage_label": "No damage detected",
            "damage_label_ar": "لم يتم اكتشاف ضرر",
            "yolo_confidence": 0.0
        }
    except Exception as e:
        return {
            "success": False,
            "damage_type": "D40",
            "damage_label": "Road Damage",
            "damage_label_ar": "ضرر في الطريق",
            "yolo_confidence": 0.0,
            "error": str(e)
        }


def predict_damage(image_data: bytes) -> Dict[str, Any]:
    """
    Hybrid prediction:
    1. Keras: Is there damage? (binary)
    2. YOLO: What type? (classification)
    """
    print(f"DEBUG: Hybrid Prediction - Received {len(image_data)} bytes")
    
    # Step 1: Use Keras to detect if damage exists
    if KERAS_AVAILABLE:
        print("DEBUG: Hybrid Prediction - Starting Keras detection...")
        keras_result = keras_predict_raw(image_data)
        print(f"DEBUG: Hybrid Prediction - Keras result: {keras_result.get('detected')}")
        
        # If Keras says no damage, trust it (it's trained on roads)
        # This includes both "no damage on road" and "not a road at all"
        if not keras_result.get("detected", False):
            # Check if it's specifically "not a road" vs "no damage"
            if keras_result.get("is_road") == False:
                print(f"DEBUG: Hybrid Prediction - Not a road image (confidence: {keras_result.get('confidence'):.2%})")
            return keras_result
        
        # Keras detected damage - now classify type with YOLO
        if YOLO_AVAILABLE:
            print("DEBUG: Hybrid Prediction - Starting YOLO classification...")
            yolo_result = classify_damage_type_with_yolo(image_data)
            print(f"DEBUG: Hybrid Prediction - YOLO detected: {yolo_result.get('detected')}")
            
            if yolo_result.get("detected"):
                # YOLO confirmed and classified the damage
                keras_result["damage_type"] = yolo_result["damage_type"]
                keras_result["damage_label"] = yolo_result["damage_label"]
                keras_result["damage_label_ar"] = yolo_result["damage_label_ar"]
                
                # Calculate how dangerous the damage is (0.0 to 1.0)
                danger_score = calculate_danger_score(
                    yolo_result["damage_type"],
                    keras_result.get("confidence", 0.0)
                )
                keras_result["danger_score"] = danger_score
                
                # Add danger level calculation (1-5 rating)
                danger_info = calculate_danger_level(
                    yolo_result["damage_type"], 
                    keras_result.get("confidence", 0.0)
                )
                keras_result["danger_level"] = danger_info["danger_level"]
                keras_result["danger_description"] = danger_info["danger_description"]
                keras_result["danger_description_ar"] = danger_info["danger_description_ar"]
                
                # Add simplified category (Pothole or Crack)
                category_info = get_damage_category(yolo_result["damage_type"])
                keras_result["damage_category"] = category_info["category"]
                keras_result["damage_category_ar"] = category_info["category_ar"]
                
                # Update bounding boxes with correct type
                if keras_result.get("bounding_boxes"):
                    for bbox in keras_result["bounding_boxes"]:
                        bbox["class"] = yolo_result["damage_type"]
                        bbox["label"] = yolo_result["damage_label"]
                        bbox["label_ar"] = yolo_result["damage_label_ar"]
                
                keras_result["message"] = f"Road damage detected: {yolo_result['damage_label']} (Confidence: {keras_result['confidence']:.1%}, Danger: {danger_score:.1%}, Level: {danger_info['danger_level']}/5)"
                keras_result["note"] = "Hybrid: Keras for damage detection + YOLO for type classification"
                keras_result["model_type"] = "hybrid_keras_yolo"
                keras_result["yolo_confidence"] = yolo_result.get("yolo_confidence", 0.0)
                return keras_result
            else:
                # YOLO did not see any damage, but Keras did.
                # If Keras is very confident (> 0.95), we might still trust it.
                # If Keras is moderately confident (0.85 - 0.95), it's likely a false positive.
                if keras_result.get("confidence", 0) > 0.95:
                    keras_result["damage_type"] = "D40" # Default to general road damage
                    keras_result["note"] = "Keras highly confident in damage, but YOLO did not find a specific type"
                    return keras_result
                else:
                    # Treat as false positive
                    print(f"DEBUG: Hybrid Prediction - Keras was {keras_result.get('confidence'):.1%} sure, but YOLO confirmed NO damage. Reverting to 'No damage'.")
                    return {
                        "success": True,
                        "detected": False,
                        "damage_type": None,
                        "damage_label": "No damage detected",
                        "damage_label_ar": "لم يتم اكتشاف ضرر",
                        "confidence": keras_result.get("confidence", 0),
                        "message": "Potential road artifact filtered out (low detection confidence)",
                        "note": "Filtered: Keras detected potential damage but YOLO could not verify it"
                    }
        else:
            # No YOLO, keep Keras result but mark as generic
            keras_result["note"] = "Keras detected damage, but YOLO unavailable for type classification"
            return keras_result
    
    # Fallback: No Keras, use YOLO alone
    elif YOLO_AVAILABLE:
        # Use YOLO for full prediction when Keras is not available
        try:
            model = load_yolo_model()
            image = Image.open(io.BytesIO(image_data))
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            orig_w, orig_h = image.size
            
            results = model.predict(source=image, conf=0.40, verbose=False)
            
            if len(results) > 0 and results[0].boxes is not None and len(results[0].boxes) > 0:
                # Get best detection
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
                        "label_ar": DAMAGE_LABELS_AR[damage_class],
                        "confidence": confidence,
                        "bbox": {"x1": int(x1), "y1": int(y1), "x2": int(x2), "y2": int(y2)}
                    }],
                    "image_size": {"width": orig_w, "height": orig_h},
                    "message": f"Road damage detected: {DAMAGE_LABELS[damage_class]} (Confidence: {confidence:.1%}, Danger: {danger_score:.1%}, Level: {danger_info['danger_level']}/5)",
                    "note": "Using YOLO only (Keras not available)",
                    "model_type": "yolo_only"
                }
            else:
                # No detections
                return {
                    "success": True,
                    "detected": False,
                    "damage_type": None,
                    "damage_label": "No damage detected",
                    "damage_label_ar": "لم يتم اكتشاف ضرر",
                    "confidence": 0.0,
                    "severity_score": 0.0,
                    "severity": "none",
                    "color": "#00FF00",
                    "bounding_boxes": [],
                    "image_size": {"width": orig_w, "height": orig_h},
                    "message": "No damage detected",
                    "note": "Using YOLO only (Keras not available)"
                }
        except Exception as e:
            return {
                "success": False,
                "detected": False,
                "message": f"YOLO prediction error: {str(e)}",
                "error": str(e)
            }
    
    else:
        # No models available
        return {
            "success": False,
            "detected": False,
            "message": "No models available",
            "error": "NO_MODELS"
        }


def get_model_info() -> Dict[str, Any]:
    """Get information about available models"""
    return {
        "hybrid_mode": True,
        "keras_available": KERAS_AVAILABLE,
        "yolo_available": YOLO_AVAILABLE,
        "method": "Keras for damage detection (binary) + YOLO for type classification",
        "damage_types": list(DAMAGE_LABELS.keys()),
        "labels": DAMAGE_LABELS,
        "labels_ar": DAMAGE_LABELS_AR,
        "note": "Best of both: Keras (trained on roads) detects damage, YOLO classifies type"
    }
