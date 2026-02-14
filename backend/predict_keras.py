"""
Road Damage Prediction Module using Keras Model
Uses the trained Keras model for road damage detection
"""

import os
import numpy as np
from PIL import Image
import io
from typing import Dict, Any

# Try to import TensorFlow/Keras
try:
    import tensorflow as tf
    from tensorflow import keras
    KERAS_AVAILABLE = True
except ImportError:
    KERAS_AVAILABLE = False
    print("WARNING: TensorFlow not installed. Install with: pip install tensorflow")

# Model configuration
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "road_damage_model (1).keras")

# RDD2020 Damage class labels (standard road damage classes)
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

# Global model variable
_model = None


def load_model():
    """Load the Keras model"""
    global _model
    
    if not KERAS_AVAILABLE:
        raise RuntimeError("TensorFlow is not installed. Please install it with: pip install tensorflow")
    
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
        
        print(f"Loading Keras model from {MODEL_PATH}...")
        _model = keras.models.load_model(MODEL_PATH)
        print(f"Model loaded successfully!")
        print(f"Model input shape: {_model.input_shape}")
        print(f"Model output shape: {_model.output_shape}")
    
    return _model


def preprocess_image(image: Image.Image, target_size=(224, 224)):
    """
    Preprocess image for the Keras model
    
    Args:
        image: PIL Image
        target_size: Target size for the model (default 224x224)
    
    Returns:
        Preprocessed numpy array
    """
    # Resize image
    image = image.resize(target_size)
    
    # Convert to array
    img_array = np.array(image)
    
    # Normalize to [0, 1]
    img_array = img_array.astype('float32') / 255.0
    
    # Add batch dimension
    img_array = np.expand_dims(img_array, axis=0)
    
    return img_array


def calculate_severity_from_confidence(confidence: float, class_id: int) -> float:
    """
    Calculate severity score based on confidence and damage type
    
    Args:
        confidence: Model confidence (0-1)
        class_id: Damage class ID
    
    Returns:
        Severity score (0-1)
    """
    # Base severity on confidence
    severity = confidence
    
    # Adjust based on damage type (potholes are more severe)
    if class_id == 3:  # Pothole (D40)
        severity = min(1.0, severity * 1.2)  # Increase severity for potholes
    elif class_id == 2:  # Alligator Crack (D20)
        severity = min(1.0, severity * 1.1)
    
    return severity


def get_severity_level(severity_score: float) -> str:
    """Get severity level string from score"""
    if severity_score < 0.33:
        return "low"
    elif severity_score < 0.66:
        return "medium"
    else:
        return "high"


def get_severity_color(severity_score: float) -> str:
    """Get color hex based on severity score"""
    if severity_score < 0.33:
        return "#00FF00"  # Green
    elif severity_score < 0.66:
        return "#FFFF00"  # Yellow
    else:
        return "#FF0000"  # Red


def predict_damage(image_data: bytes) -> Dict[str, Any]:
    """
    Analyze an image and predict road damage using Keras model
    
    Args:
        image_data: Raw image bytes
        
    Returns:
        Dictionary containing prediction results
    """
    if not KERAS_AVAILABLE:
        return {
            "success": False,
            "detected": False,
            "damage_type": None,
            "damage_label": "Model not available",
            "damage_label_ar": "النموذج غير متوفر",
            "confidence": 0.0,
            "severity_score": 0.0,
            "severity": "none",
            "color": "#666666",
            "bounding_boxes": [],
            "image_size": None,
            "all_predictions": [],
            "message": "TensorFlow not installed. Please install tensorflow.",
            "error": "KERAS_NOT_AVAILABLE"
        }
    
    try:
        # Load model
        model = load_model()
        
        # Load image
        image = Image.open(io.BytesIO(image_data))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        orig_w, orig_h = image.size
        
        # Validate image size
        if orig_w < 50 or orig_h < 50:
            return {
                "success": False,
                "detected": False,
                "damage_type": None,
                "damage_label": "Image too small",
                "damage_label_ar": "الصورة صغيرة جدًا",
                "confidence": 0.0,
                "severity_score": 0.0,
                "severity": "none",
                "color": "#666666",
                "bounding_boxes": [],
                "image_size": {"width": orig_w, "height": orig_h},
                "all_predictions": [],
                "message": "Image resolution too small for analysis (minimum 50x50)",
                "error": "IMAGE_TOO_SMALL"
            }
        
        # Preprocess image
        # Get model input shape
        input_shape = model.input_shape[1:3]  # (height, width)
        processed_image = preprocess_image(image, target_size=input_shape)
        
        # Run prediction
        predictions = model.predict(processed_image, verbose=0)
        
        # IMPORTANT: Model has output shape (None, 1) - Binary classification!
        # Output is a single value representing DAMAGE PROBABILITY (0-1)
        # NOT multi-class classification
        
        damage_probability = float(predictions[0][0])  # Single output value
        
        # Threshold for detection
        CONFIDENCE_THRESHOLD = 0.70  # Increased sensitivity (was 0.85)
        NOT_ROAD_THRESHOLD = 0.30    # If confidence is very low, it's probably not even a road
        
        # Debug logging
        print(f"DEBUG: Model output (damage probability): {damage_probability:.4f}")
        
        # Check if this is even a road image
        if damage_probability < NOT_ROAD_THRESHOLD:
            # Very low confidence - likely not a road at all (person, building, car, etc.)
            return {
                "success": True,
                "detected": False,
                "damage_type": None,
                "damage_label": "Not a road",
                "damage_label_ar": "ليس طريقًا",
                "confidence": damage_probability,
                "severity_score": 0.0,
                "severity": "none",
                "color": "#999999",
                "bounding_boxes": [],
                "image_size": {"width": orig_w, "height": orig_h},
                "all_predictions": [],
                "detection_count": 0,
                "message": f"This doesn't appear to be a road image (confidence: {damage_probability:.2%})",
                "note": "Image classified as non-road (person, building, object, etc.)",
                "model_type": "keras_binary_classification",
                "raw_output": damage_probability,
                "is_road": False
            }
        
        # Check if damage is detected on the road
        if damage_probability < CONFIDENCE_THRESHOLD:
            # It's a road, but no damage detected
            return {
                "success": True,
                "detected": False,
                "damage_type": None,
                "damage_label": "No damage detected",
                "damage_label_ar": "لم يتم اكتشاف ضرر",
                "confidence": damage_probability,
                "severity_score": 0.0,
                "severity": "none",
                "color": "#00FF00",
                "bounding_boxes": [],
                "image_size": {"width": orig_w, "height": orig_h},
                "all_predictions": [],
                "detection_count": 0,
                "message": f"No road damage detected (probability: {damage_probability:.2%})",
                "note": "Clean road detected - no damage found",
                "model_type": "keras_binary_classification",
                "raw_output": damage_probability,
                "is_road": True
            }
        
        # Damage detected - but we can't determine TYPE with a binary model
        # Default to "General Road Damage" or use Pothole as most common
        damage_class = "D40"  # Default to Pothole (most severe)
        damage_label = "Road Damage Detected"  # Generic since we can't classify type
        damage_label_ar = "تم اكتشاف ضرر في الطريق"
        
        # Calculate severity based on probability
        # Higher probability = more severe
        severity_score = damage_probability
        severity_level = get_severity_level(severity_score)
        color = get_severity_color(severity_score)
        
        # All predictions - single binary output
        all_predictions = [{
            "class": "DAMAGE",
            "label": "Road Damage",
            "confidence": damage_probability,
            "severity": severity_score
        }]
        
        # Create bounding box (full image since Keras model is classification-only)
        bbox_data = {
            "class": damage_class,
            "label": damage_label,
            "label_ar": damage_label_ar,
            "confidence": damage_probability,
            "severity_score": severity_score,
            "severity_level": severity_level,
            "color": color,
            "bbox": {
                "x1": 0,
                "y1": 0,
                "x2": orig_w,
                "y2": orig_h,
                "xc": 0.5,
                "yc": 0.5,
                "width": 1.0,
                "height": 1.0
            },
            "area_ratio": 1.0,
            "note": "Full image binary classification (cannot determine damage type)"
        }
        
        result = {
            "success": True,
            "detected": True,
            "damage_type": damage_class,
            "damage_label": damage_label,
            "damage_label_ar": damage_label_ar,
            "confidence": damage_probability,
            "severity_score": severity_score,
            "severity": severity_level,
            "color": color,
            "bounding_boxes": [bbox_data],
            "image_size": {"width": orig_w, "height": orig_h},
            "all_predictions": all_predictions,
            "detection_count": 1,
            "message": f"Road damage detected with {damage_probability:.1%} confidence (severity: {severity_level})",
            "note": "Binary model: detects presence of damage but cannot classify specific type",
            "model_type": "keras_binary_classification",
            "raw_output": damage_probability
        }
        
        return result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "detected": False,
            "damage_type": None,
            "damage_label": "Analysis failed",
            "damage_label_ar": "فشل التحليل",
            "confidence": 0.0,
            "severity_score": 0.0,
            "severity": "none",
            "color": "#666666",
            "bounding_boxes": [],
            "image_size": None,
            "all_predictions": [],
            "message": f"Error processing image: {str(e)}",
            "error": str(e)
        }


def get_model_info() -> Dict[str, Any]:
    """Get information about the loaded model"""
    try:
        if not KERAS_AVAILABLE:
            return {
                "available": False,
                "message": "TensorFlow not installed",
                "model_path": MODEL_PATH,
                "model_exists": os.path.exists(MODEL_PATH)
            }
        
        model_exists = os.path.exists(MODEL_PATH)
        
        info = {
            "available": True,
            "model_type": "Keras CNN",
            "model_path": MODEL_PATH,
            "model_exists": model_exists,
            "classes": list(DAMAGE_LABELS.keys()),
            "labels": DAMAGE_LABELS,
            "labels_ar": DAMAGE_LABELS_AR,
            "confidence_threshold": 0.3,
            "note": "Using trained Keras classification model for road damage detection"
        }
        
        if model_exists:
            try:
                model = load_model()
                info["input_shape"] = str(model.input_shape)
                info["output_shape"] = str(model.output_shape)
                info["num_parameters"] = model.count_params()
            except Exception as e:
                info["load_error"] = str(e)
        
        return info
        
    except Exception as e:
        return {
            "available": False,
            "error": str(e),
            "model_path": MODEL_PATH,
            "model_exists": os.path.exists(MODEL_PATH) if os.path.exists(os.path.dirname(MODEL_PATH)) else False
        }


# Test function
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        with open(image_path, "rb") as f:
            image_data = f.read()
        
        result = predict_damage(image_data)
        print("\nPrediction Result:")
        print(f"Detected: {result['detected']}")
        if result['detected']:
            print(f"Damage Type: {result['damage_label']} ({result['damage_type']})")
            print(f"Confidence: {result['confidence']:.2%}")
            print(f"Severity: {result['severity']} ({result['severity_score']:.2f})")
        print(f"\nMessage: {result['message']}")
    else:
        print("Model Information:")
        info = get_model_info()
        for key, value in info.items():
            print(f"  {key}: {value}")
