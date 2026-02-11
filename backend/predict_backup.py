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
    print("✓ Using HYBRID mode: Keras + YOLO")
    print("  • Keras: Damage detection (binary)")
    print("  • YOLO: Type classification")
    HYBRID_MODE = True
except ImportError as e:
    print(f"✗ Hybrid mode failed: {e}")
    print("  Falling back to single model...")
    HYBRID_MODE = False

# Only load fallback code if hybrid mode is not active
if not HYBRID_MODE:
    # Fallback YOLO configuration
    try:
        from ultralytics import YOLO
        YOLO_AVAILABLE = True
    except ImportError:
        YOLO_AVAILABLE = False
    
    # Model configuration
    MODEL_DIR = os.path.dirname(os.path.dirname(__file__))
    YOLO_MODEL_PATH = os.path.join(MODEL_DIR, "road_damage_yolo.pt")
    
    # Severity calculation threshold
    # 20% of image area = maximum severity (1.0)
    AREA_THRESHOLD = 0.20
    
    # RDD2020 Damage class labels (standard road damage classes)
    DAMAGE_CLASSES = {
        0: "D00",  # Longitudinal Crack
        1: "D10",  # Transverse Crack
        2: "D20",  # Alligator Crack
        3: "D40",  # Pothole
        4: "D50",  # Debris/Road Debris
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
    
    # Global model variable
    _model = None


    def load_model():
        """Load the YOLO model"""
        global _model
        
        if not YOLO_AVAILABLE:
            raise RuntimeError("Ultralytics YOLO is not installed. Please install it with: pip install ultralytics")
        
        if _model is None:
            # Check if custom model exists, otherwise use pretrained YOLOv8
            if os.path.exists(YOLO_MODEL_PATH):
                print(f"Loading custom YOLO model from {YOLO_MODEL_PATH}...")
                _model = YOLO(YOLO_MODEL_PATH)
            else:
                # Use YOLOv8n as base model - it will download automatically
                print("Loading YOLOv8n base model for general object detection...")
                print("Note: For best road damage detection, train a custom model on RDD2020 dataset")
                _model = YOLO("yolov8n.pt")
            print("Model loaded successfully!")
        
        return _model


    def calculate_severity_from_area(box_area: float, image_area: float) -> float:
        """
        Calculate severity score (0-1) based on bounding box area ratio
        Uses THRESHOLD = 0.20 (20% of image area = max severity)
        """
        if image_area == 0:
            return 0.0
        area_ratio = box_area / image_area
        severity_score = min(1.0, area_ratio / AREA_THRESHOLD)
        return severity_score


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


    def predict_damage(image_data: bytes) -> dict:
        """
        Analyze an image and predict road damage
        Uses YOLO for type classification (D00/D10/D20/D40), falls back to Keras binary if needed
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Dictionary containing prediction results
        """
        # This function only runs when HYBRID_MODE is False
        if not YOLO_AVAILABLE:
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
                "message": "No prediction models available. Please install ultralytics.",
                "error": "NO_MODEL_AVAILABLE"
            }
        
        # YOLO is available - use it for type classification
        try:
            # Load model
            model = load_model()
            
            # Load image
            image = Image.open(io.BytesIO(image_data))
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            orig_w, orig_h = image.size
            image_area = orig_w * orig_h
            
            # Validate image size
            if orig_w < 100 or orig_h < 100:
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
                    "message": "Image resolution too small for analysis (minimum 100x100)",
                    "error": "IMAGE_TOO_SMALL"
                }
            
            # Run YOLO inference with higher confidence threshold
            results = model.predict(
                source=image,
                conf=0.40,  # Higher confidence threshold to reduce false positives
                iou=0.45,   # NMS IoU threshold
                verbose=False
            )
            
            # Process results
            bounding_boxes = []
            road_related_classes = []  # Track if we detect road-related objects
            
            if len(results) > 0 and results[0].boxes is not None:
                boxes = results[0].boxes
                
                for i, box in enumerate(boxes):
                    # Get box coordinates (xyxy format)
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
                    
                    # Get confidence and class
                    confidence = float(box.conf[0].cpu().numpy())
                    class_id = int(box.cls[0].cpu().numpy())
                    
                    # Skip detections with very low confidence
                    if confidence < 0.40:
                        continue
                    
                    # Calculate normalized coordinates
                    xc = ((x1 + x2) / 2) / orig_w
                    yc = ((y1 + y2) / 2) / orig_h
                    bw = (x2 - x1) / orig_w
                    bh = (y2 - y1) / orig_h
                    
                    # Calculate box area and severity
                    box_area = (x2 - x1) * (y2 - y1)
                    severity_score = calculate_severity_from_area(box_area, image_area)
                    severity_level = get_severity_level(severity_score)
                    
                    # Map class ID to damage class
damage_class = DAMAGE_CLASSES.get(class_id % len(DAMAGE_CLASSES), "D40")
                    
                    # Track detection
                    road_related_classes.append(class_id)
                    
                    bounding_boxes.append({
                        "class": damage_class,
                        "label": DAMAGE_LABELS.get(damage_class, "Road Damage"),
                        "label_ar": DAMAGE_LABELS_AR.get(damage_class, "ضرر في الطريق"),
                        "confidence": confidence,
                        "severity_score": severity_score,
                        "severity_level": severity_level,
                        "color": get_severity_color(severity_score),
                        "bbox": {
                            "x1": x1,
                            "y1": y1,
                            "x2": x2,
                            "y2": y2,
                            "xc": xc,
                            "yc": yc,
                            "width": bw,
                            "height": bh
                        },
                        "area_ratio": box_area / image_area if image_area > 0 else 0,
                        "yolo_class_id": class_id  # Include original class for debugging
                    })
            
            # Sort by confidence and severity
            bounding_boxes.sort(key=lambda x: (x["confidence"] * x["severity_score"]), reverse=True)
            
            # Limit to top 10 most significant detections
            bounding_boxes = bounding_boxes[:10]
            
            # Check if any road damage was detected
            detected = len(bounding_boxes) > 0
            
            if detected:
                primary_box = bounding_boxes[0]
                
                # Calculate overall severity (weighted average of top detections)
                if len(bounding_boxes) > 0:
                    max_severity = max(box["severity_score"] for box in bounding_boxes)
                else:
                    max_severity = 0.0
                
                result = {
                    "success": True,
                    "detected": True,
                    "damage_type": primary_box["class"],
                    "damage_label": primary_box["label"],
                    "damage_label_ar": primary_box["label_ar"],
                    "confidence": primary_box["confidence"],
                    "severity_score": max_severity,
                    "severity": get_severity_level(max_severity),
                    "color": get_severity_color(max_severity),
                    "bounding_boxes": bounding_boxes,
                    "image_size": {"width": orig_w, "height": orig_h},
                    "all_predictions": [
                        {
                            "class": box["class"],
                            "label": box["label"],
                            "confidence": box["confidence"],
                            "severity": box["severity_score"]
                        }
                        for box in bounding_boxes
                    ],
                    "detection_count": len(bounding_boxes),
                    "message": f"Detected {len(bounding_boxes)} potential road damage(s). Primary: {primary_box['label']} (confidence: {primary_box['confidence']:.2f}, severity: {max_severity:.2f})",
                    "note": "Using YOLO for damage type classification."
                }
            else:
                result = {
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
                    "all_predictions": [],
                    "detection_count": 0,
                    "message": "No significant road damage detected in this image",
                    "note": "Make sure image shows road surface clearly"
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


    def get_model_info() -> dict:
        """Get information about the loaded model"""
        # This function only runs when HYBRID_MODE is False
        try:
            if not YOLO_AVAILABLE:
                return {
                    "available": False,
                    "message": "No models available - install Ultralytics",
                    "model_path": None,
                    "model_exists": False
                }
            
            model = load_model()
            
            return {
                "available": True,
                "model_type": "YOLOv8",
                "model_path": YOLO_MODEL_PATH if os.path.exists(YOLO_MODEL_PATH) else "yolov8n.pt (pretrained)",
                "custom_model_exists": os.path.exists(YOLO_MODEL_PATH),
                "area_threshold": AREA_THRESHOLD,
                "classes": list(DAMAGE_LABELS.keys()),
                "labels": DAMAGE_LABELS,
                "labels_ar": DAMAGE_LABELS_AR,
                "note": "Using YOLO for damage type classification (D00/D10/D20/D40). Note: Using general YOLO model, not trained specifically on road damage."
            }
        except Exception as e:
            return {
                "available": False,
                "error": str(e),
                "model_path": None,
                "model_exists": False
            }
# End of fallback mode functions

    """Load the YOLO model"""
    global _model
    
    if not YOLO_AVAILABLE:
        raise RuntimeError("Ultralytics YOLO is not installed. Please install it with: pip install ultralytics")
    
    if _model is None:
        # Check if custom model exists, otherwise use pretrained YOLOv8
        if os.path.exists(YOLO_MODEL_PATH):
            print(f"Loading custom YOLO model from {YOLO_MODEL_PATH}...")
            _model = YOLO(YOLO_MODEL_PATH)
        else:
            # Use YOLOv8n as base model - it will download automatically
            print("Loading YOLOv8n base model for general object detection...")
            print("Note: For best road damage detection, train a custom model on RDD2020 dataset")
            _model = YOLO("yolov8n.pt")
        print("Model loaded successfully!")
    
    return _model


def calculate_severity_from_area(box_area: float, image_area: float) -> float:
    """
    Calculate severity score (0-1) based on bounding box area ratio
    Uses THRESHOLD = 0.20 (20% of image area = max severity)
    """
    if image_area == 0:
        return 0.0
    area_ratio = box_area / image_area
    severity_score = min(1.0, area_ratio / AREA_THRESHOLD)
    return severity_score


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


def predict_damage(image_data: bytes) -> dict:
    """
    Analyze an image and predict road damage
    Uses YOLO for type classification (D00/D10/D20/D40), falls back to Keras binary if needed
    
    Args:
        image_data: Raw image bytes
        
    Returns:
        Dictionary containing prediction results
    """
    # Try YOLO first (can classify damage types)
    if not YOLO_AVAILABLE:
        # YOLO not available, try Keras as fallback
        if USE_KERAS_FALLBACK and KERAS_AVAILABLE:
            return keras_predict(image_data)
        
        # No models available at all
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
            "message": "No prediction models available. Please install ultralytics or tensorflow.",
            "error": "NO_MODEL_AVAILABLE"
        }
    
    # YOLO is available - use it for type classification
    
    try:
        # Load model
        model = load_model()
        
        # Load image
        image = Image.open(io.BytesIO(image_data))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        orig_w, orig_h = image.size
        image_area = orig_w * orig_h
        
        # Validate image size
        if orig_w < 100 or orig_h < 100:
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
                "message": "Image resolution too small for analysis (minimum 100x100)",
                "error": "IMAGE_TOO_SMALL"
            }
        
        # Run YOLO inference with higher confidence threshold
        results = model.predict(
            source=image,
            conf=0.40,  # Higher confidence threshold to reduce false positives
            iou=0.45,   # NMS IoU threshold
            verbose=False
        )
        
        # Process results
        bounding_boxes = []
        road_related_classes = []  # Track if we detect road-related objects
        
        if len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes
            
            for i, box in enumerate(boxes):
                # Get box coordinates (xyxy format)
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
                
                # Get confidence and class
                confidence = float(box.conf[0].cpu().numpy())
                class_id = int(box.cls[0].cpu().numpy())
                
                # Skip detections with very low confidence
                if confidence < 0.40:
                    continue
                
                # Calculate normalized coordinates
                xc = ((x1 + x2) / 2) / orig_w
                yc = ((y1 + y2) / 2) / orig_h
                bw = (x2 - x1) / orig_w
                bh = (y2 - y1) / orig_h
                
                # Calculate box area and severity
                box_area = (x2 - x1) * (y2 - y1)
                severity_score = calculate_severity_from_area(box_area, image_area)
                severity_level = get_severity_level(severity_score)
                
                # Map class ID to damage class
                # If using custom RDD model, use direct mapping
                # If using general YOLO, we need to be more selective
                damage_class = DAMAGE_CLASSES.get(class_id % len(DAMAGE_CLASSES), "D40")
                
                # Track detection
                road_related_classes.append(class_id)
                
                bounding_boxes.append({
                    "class": damage_class,
                    "label": DAMAGE_LABELS.get(damage_class, "Road Damage"),
                    "label_ar": DAMAGE_LABELS_AR.get(damage_class, "ضرر في الطريق"),
                    "confidence": confidence,
                    "severity_score": severity_score,
                    "severity_level": severity_level,
                    "color": get_severity_color(severity_score),
                    "bbox": {
                        "x1": x1,
                        "y1": y1,
                        "x2": x2,
                        "y2": y2,
                        "xc": xc,
                        "yc": yc,
                        "width": bw,
                        "height": bh
                    },
                    "area_ratio": box_area / image_area if image_area > 0 else 0,
                    "yolo_class_id": class_id  # Include original class for debugging
                })
        
        # Sort by confidence and severity
        bounding_boxes.sort(key=lambda x: (x["confidence"] * x["severity_score"]), reverse=True)
        
        # Limit to top 10 most significant detections
        bounding_boxes = bounding_boxes[:10]
        
        # Check if any road damage was detected
        detected = len(bounding_boxes) > 0
        
        if detected:
            primary_box = bounding_boxes[0]
            
            # Calculate overall severity (weighted average of top detections)
            if len(bounding_boxes) > 0:
                max_severity = max(box["severity_score"] for box in bounding_boxes)
            else:
                max_severity = 0.0
            
            result = {
                "success": True,
                "detected": True,
                "damage_type": primary_box["class"],
                "damage_label": primary_box["label"],
                "damage_label_ar": primary_box["label_ar"],
                "confidence": primary_box["confidence"],
                "severity_score": max_severity,
                "severity": get_severity_level(max_severity),
                "color": get_severity_color(max_severity),
                "bounding_boxes": bounding_boxes,
                "image_size": {"width": orig_w, "height": orig_h},
                "all_predictions": [
                    {
                        "class": box["class"],
                        "label": box["label"],
                        "confidence": box["confidence"],
                        "severity": box["severity_score"]
                    }
                    for box in bounding_boxes
                ],
                "detection_count": len(bounding_boxes),
                "message": f"Detected {len(bounding_boxes)} potential road damage(s). Primary: {primary_box['label']} (confidence: {primary_box['confidence']:.2f}, severity: {max_severity:.2f})",
                "note": "Using general YOLOv8 model. For accurate road damage detection, use the Keras model."
            }
        else:
            result = {
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
                "all_predictions": [],
                "detection_count": 0,
                "message": "No significant road damage detected in this image",
                "note": "Make sure image shows road surface clearly"
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


def create_mock_prediction() -> dict:
    """Create a mock prediction for testing without YOLO"""
    return {
        "success": True,
        "detected": True,
        "damage_type": "D40",
        "damage_label": "Pothole",
        "damage_label_ar": "حفرة",
        "confidence": 0.85,
        "severity_score": 0.72,
        "severity": "high",
        "color": "#FF0000",
        "bounding_boxes": [
            {
                "class": "D40",
                "label": "Pothole",
                "label_ar": "حفرة",
                "confidence": 0.85,
                "severity_score": 0.72,
                "severity_level": "high",
                "color": "#FF0000",
                "bbox": {
                    "x1": 100,
                    "y1": 100,
                    "x2": 300,
                    "y2": 280,
                    "xc": 0.5,
                    "yc": 0.5,
                    "width": 0.5,
                    "height": 0.45
                },
                "area_ratio": 0.144
            }
        ],
        "image_size": {"width": 400, "height": 400},
        "all_predictions": [
            {"class": "D40", "label": "Pothole", "confidence": 0.85, "severity": 0.72}
        ],
        "message": "Road damage detected: Pothole | Severity: 0.72"
    }


def get_model_info() -> dict:
    """Get information about the loaded model"""
    # Try YOLO first (primary model for type classification)
    try:
        if not YOLO_AVAILABLE:
            # YOLO not available, try Keras
            if USE_KERAS_FALLBACK and KERAS_AVAILABLE:
                info = keras_model_info()
                info["note"] = "Using Keras binary model (can only detect damage presence, not type). Install ultralytics for type classification."
                return info
            
            return {
                "available": False,
                "message": "No models available - install Ultralytics (for type classification) or TensorFlow (for binary detection)",
                "model_path": None,
                "model_exists": False
            }
        
        model = load_model()
        
        return {
            "available": True,
            "model_type": "YOLOv8",
            "model_path": YOLO_MODEL_PATH if os.path.exists(YOLO_MODEL_PATH) else "yolov8n.pt (pretrained)",
            "custom_model_exists": os.path.exists(YOLO_MODEL_PATH),
            "area_threshold": AREA_THRESHOLD,
            "classes": list(DAMAGE_LABELS.keys()),
            "labels": DAMAGE_LABELS,
            "labels_ar": DAMAGE_LABELS_AR,
            "note": "Using YOLO for damage type classification (D00/D10/D20/D40). Note: Using general YOLO model, not trained specifically on road damage."
        }
    except Exception as e:
        return {
            "available": False,
            "error": str(e),
            "model_path": None,
            "model_exists": False
        }
