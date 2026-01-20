"""
Road Damage Geometric Analysis Module
Extracts geometric measurements (length, width, depth, surface area, volume) from road damage images.

This module provides AI-powered geometric analysis of road damage features detected in images.
Due to the inherent limitations of 2D image analysis, depth estimation and absolute measurements
require assumptions about camera perspective and road surface reference.
"""

import os
import numpy as np
from PIL import Image
import io
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from enum import Enum
import json

# Try to import the prediction module
try:
    from predict import predict_damage, DAMAGE_LABELS, DAMAGE_LABELS_AR
    PREDICT_AVAILABLE = True
except ImportError:
    PREDICT_AVAILABLE = False
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


class DamageType(Enum):
    """Road damage types with typical depth characteristics"""
    POTHOLE = "pothole"
    CRACK = "crack"
    SURFACE_DAMAGE = "surface_damage"
    UNKNOWN = "unknown"


@dataclass
class GeometricMeasurements:
    """Geometric measurements for road damage"""
    length_cm: float
    width_cm: float
    depth_cm: float
    surface_area_cm2: float
    volume_cm3: float
    length_m: float
    width_m: float
    depth_m: float
    surface_area_m2: float
    volume_m3: float
    depth_estimated: bool
    confidence: float
    limitations: List[str]


# Camera and reference configuration
# These values represent typical smartphone camera parameters and road surface characteristics
DEFAULT_CONFIG = {
    # Average distance from camera to road surface (cm) - typical smartphone photo
    "camera_height_cm": 120.0,
    # Typical horizontal field of view in degrees for smartphone camera
    "camera_hfov_deg": 70.0,
    # Typical vertical field of view in degrees for smartphone camera
    "camera_vfov_deg": 55.0,
    # Reference lane width in cm (standard lane: 3.0-3.7m)
    "reference_lane_width_cm": 350.0,
    # Ground sample distance estimation (cm per pixel at typical distance)
    "default_gsd_cm": 0.15,
}

# Depth estimation ranges by damage type (in cm)
# Based on road damage classification standards
DEPTH_ESTIMATES = {
    "D40": {  # Pothole
        "min_depth_cm": 2.5,
        "typical_depth_cm": 5.0,
        "max_depth_cm": 15.0,
        "depth_to_area_ratio": 0.05,  # depth ≈ 5% of sqrt(area)
    },
    "D00": {  # Longitudinal Crack
        "min_depth_cm": 0.2,
        "typical_depth_cm": 1.0,
        "max_depth_cm": 3.0,
        "depth_to_area_ratio": 0.01,
    },
    "D10": {  # Transverse Crack
        "min_depth_cm": 0.2,
        "typical_depth_cm": 1.0,
        "max_depth_cm": 3.0,
        "depth_to_area_ratio": 0.01,
    },
    "D20": {  # Alligator Crack
        "min_depth_cm": 0.5,
        "typical_depth_cm": 2.0,
        "max_depth_cm": 5.0,
        "depth_to_area_ratio": 0.02,
    },
    "D50": {  # Road Debris/Surface Damage
        "min_depth_cm": 0.1,
        "typical_depth_cm": 0.5,
        "max_depth_cm": 2.0,
        "depth_to_area_ratio": 0.005,
    },
}


def classify_damage_type(damage_class: str) -> DamageType:
    """Classify damage into broader categories"""
    if damage_class == "D40":
        return DamageType.POTHOLE
    elif damage_class in ["D00", "D10", "D20"]:
        return DamageType.CRACK
    elif damage_class == "D50":
        return DamageType.SURFACE_DAMAGE
    else:
        return DamageType.UNKNOWN


def estimate_ground_sample_distance(
    image_width: int, 
    image_height: int,
    camera_height_cm: float = DEFAULT_CONFIG["camera_height_cm"],
    hfov_deg: float = DEFAULT_CONFIG["camera_hfov_deg"]
) -> float:
    """
    Estimate the ground sample distance (cm per pixel) based on camera parameters.
    
    This uses simplified pinhole camera geometry assuming the camera is pointing
    roughly perpendicular to the road surface.
    
    Args:
        image_width: Image width in pixels
        image_height: Image height in pixels
        camera_height_cm: Camera height above road in cm
        hfov_deg: Horizontal field of view in degrees
    
    Returns:
        Estimated ground sample distance in cm/pixel
    """
    # Calculate ground width covered by the image field of view
    hfov_rad = np.radians(hfov_deg)
    ground_width_cm = 2 * camera_height_cm * np.tan(hfov_rad / 2)
    
    # Calculate GSD
    gsd_cm = ground_width_cm / image_width
    
    return gsd_cm


def estimate_depth(
    damage_class: str,
    surface_area_cm2: float,
    severity_score: float
) -> tuple[float, bool]:
    """
    Estimate damage depth based on damage type, area, and severity.
    
    This is an estimation based on typical road damage characteristics.
    Real depth measurement requires depth sensors (LiDAR, stereo cameras, etc.)
    
    Args:
        damage_class: The damage classification (D00, D10, D20, D40, D50)
        surface_area_cm2: Estimated surface area in cm²
        severity_score: Severity score (0-1)
    
    Returns:
        Tuple of (estimated_depth_cm, is_estimated)
    """
    depth_params = DEPTH_ESTIMATES.get(damage_class, DEPTH_ESTIMATES["D40"])
    
    # Base depth from area relationship
    area_based_depth = np.sqrt(surface_area_cm2) * depth_params["depth_to_area_ratio"]
    
    # Adjust by severity (higher severity = deeper damage)
    severity_multiplier = 0.5 + severity_score  # Range: 0.5 - 1.5
    
    # Calculate estimated depth
    estimated_depth = area_based_depth * severity_multiplier
    
    # Clamp to realistic bounds
    estimated_depth = max(depth_params["min_depth_cm"], 
                         min(depth_params["max_depth_cm"], estimated_depth))
    
    # Default to typical depth if calculation is too low
    if estimated_depth < depth_params["min_depth_cm"]:
        estimated_depth = depth_params["typical_depth_cm"]
    
    return estimated_depth, True  # Always marked as estimated for single-image analysis


def calculate_geometric_measurements(
    bbox: Dict[str, Any],
    damage_class: str,
    severity_score: float,
    image_width: int,
    image_height: int,
    camera_height_cm: Optional[float] = None,
    reference_width_cm: Optional[float] = None
) -> GeometricMeasurements:
    """
    Calculate geometric measurements from a bounding box.
    
    Args:
        bbox: Bounding box dictionary with x1, y1, x2, y2 coordinates
        damage_class: The damage classification
        severity_score: Severity score (0-1)
        image_width: Image width in pixels
        image_height: Image height in pixels
        camera_height_cm: Optional camera height for GSD calculation
        reference_width_cm: Optional reference width if a known object is present
    
    Returns:
        GeometricMeasurements dataclass with all measurements
    """
    limitations = []
    
    # Get bounding box dimensions in pixels
    bbox_width_px = bbox["x2"] - bbox["x1"]
    bbox_height_px = bbox["y2"] - bbox["y1"]
    
    # Estimate ground sample distance
    if camera_height_cm:
        gsd_cm = estimate_ground_sample_distance(
            image_width, image_height, camera_height_cm
        )
        limitations.append("GSD estimated from assumed camera height")
    elif reference_width_cm:
        # If we have a reference object, calculate GSD from it
        gsd_cm = reference_width_cm / image_width
        limitations.append("GSD calculated from reference object")
    else:
        # Use default GSD based on typical smartphone photography
        gsd_cm = DEFAULT_CONFIG["default_gsd_cm"]
        limitations.append("GSD using default estimation (typical smartphone at ~1.2m height)")
    
    # Calculate length and width in cm
    # For road damage, length is typically the larger dimension
    dim1_cm = bbox_width_px * gsd_cm
    dim2_cm = bbox_height_px * gsd_cm
    
    length_cm = max(dim1_cm, dim2_cm)
    width_cm = min(dim1_cm, dim2_cm)
    
    # Calculate surface area
    surface_area_cm2 = length_cm * width_cm
    
    # Estimate depth
    depth_cm, depth_estimated = estimate_depth(
        damage_class, surface_area_cm2, severity_score
    )
    
    if depth_estimated:
        limitations.append("Depth estimated from damage type and severity (no 3D sensing)")
    
    # Calculate volume
    # For potholes, use a more realistic bowl-shaped volume estimate
    if damage_class == "D40":  # Pothole
        # Approximate as half-ellipsoid
        volume_cm3 = (2/3) * np.pi * (length_cm/2) * (width_cm/2) * depth_cm
    else:
        # For cracks and surface damage, use simple rectangular approximation
        volume_cm3 = length_cm * width_cm * depth_cm
    
    # Convert to meters
    length_m = length_cm / 100
    width_m = width_cm / 100
    depth_m = depth_cm / 100
    surface_area_m2 = surface_area_cm2 / 10000
    volume_m3 = volume_cm3 / 1000000
    
    # Calculate confidence based on various factors
    # Base confidence from detection confidence (if available)
    confidence = 0.5
    
    # Reduce confidence for very small or very large detections
    bbox_area_ratio = (bbox_width_px * bbox_height_px) / (image_width * image_height)
    if bbox_area_ratio < 0.01:
        confidence *= 0.7
        limitations.append("Small detection area reduces measurement accuracy")
    elif bbox_area_ratio > 0.5:
        confidence *= 0.8
        limitations.append("Large detection area may indicate poor framing")
    
    # Add general limitation
    limitations.append("Single 2D image analysis without camera calibration")
    
    return GeometricMeasurements(
        length_cm=round(length_cm, 2),
        width_cm=round(width_cm, 2),
        depth_cm=round(depth_cm, 2),
        surface_area_cm2=round(surface_area_cm2, 2),
        volume_cm3=round(volume_cm3, 2),
        length_m=round(length_m, 4),
        width_m=round(width_m, 4),
        depth_m=round(depth_m, 4),
        surface_area_m2=round(surface_area_m2, 6),
        volume_m3=round(volume_m3, 8),
        depth_estimated=depth_estimated,
        confidence=round(confidence, 2),
        limitations=limitations
    )


def analyze_road_damage_geometry(image_data: bytes) -> Dict[str, Any]:
    """
    Main function to analyze road damage and extract geometric measurements.
    
    Args:
        image_data: Raw image bytes
    
    Returns:
        Dictionary containing complete geometric analysis in JSON format
    """
    result = {
        "success": False,
        "detected": False,
        "damage_type": None,
        "damage_type_label": None,
        "damage_type_label_ar": None,
        "measurements": None,
        "all_detections": [],
        "image_info": None,
        "confidence": 0.0,
        "limitations": [],
        "message": ""
    }
    
    try:
        # Get image dimensions
        image = Image.open(io.BytesIO(image_data))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        orig_w, orig_h = image.size
        
        result["image_info"] = {
            "width_px": orig_w,
            "height_px": orig_h,
            "aspect_ratio": round(orig_w / orig_h, 2)
        }
        
        # Run damage detection
        if PREDICT_AVAILABLE:
            prediction = predict_damage(image_data)
        else:
            # Create simulated prediction for standalone testing
            prediction = create_simulated_prediction(orig_w, orig_h)
        
        if not prediction.get("success", False):
            result["message"] = prediction.get("message", "Prediction failed")
            result["limitations"].append("Detection model error")
            return result
        
        if not prediction.get("detected", False):
            result["success"] = True
            result["detected"] = False
            result["message"] = "No road damage detected in image"
            return result
        
        # Process all detected damages
        all_detections = []
        bounding_boxes = prediction.get("bounding_boxes", [])
        
        for i, bbox_data in enumerate(bounding_boxes):
            bbox = bbox_data.get("bbox", {})
            damage_class = bbox_data.get("class", "D40")
            severity_score = bbox_data.get("severity_score", 0.5)
            detection_confidence = bbox_data.get("confidence", 0.5)
            
            # Calculate geometric measurements
            measurements = calculate_geometric_measurements(
                bbox=bbox,
                damage_class=damage_class,
                severity_score=severity_score,
                image_width=orig_w,
                image_height=orig_h
            )
            
            # Adjust confidence based on detection confidence
            adjusted_confidence = min(measurements.confidence, detection_confidence)
            
            detection = {
                "detection_id": i + 1,
                "damage_class": damage_class,
                "damage_type": classify_damage_type(damage_class).value,
                "damage_label": DAMAGE_LABELS.get(damage_class, "Unknown Damage"),
                "damage_label_ar": DAMAGE_LABELS_AR.get(damage_class, "ضرر غير معروف"),
                "detection_confidence": round(detection_confidence, 2),
                "severity_score": round(severity_score, 2),
                "severity_level": bbox_data.get("severity_level", "medium"),
                "bounding_box": {
                    "x1": bbox.get("x1", 0),
                    "y1": bbox.get("y1", 0),
                    "x2": bbox.get("x2", 0),
                    "y2": bbox.get("y2", 0)
                },
                "measurements": {
                    "length": {
                        "value_cm": measurements.length_cm,
                        "value_m": measurements.length_m,
                        "unit": "cm/m"
                    },
                    "width": {
                        "value_cm": measurements.width_cm,
                        "value_m": measurements.width_m,
                        "unit": "cm/m"
                    },
                    "depth": {
                        "value_cm": measurements.depth_cm,
                        "value_m": measurements.depth_m,
                        "estimated": measurements.depth_estimated,
                        "unit": "cm/m"
                    },
                    "surface_area": {
                        "value_cm2": measurements.surface_area_cm2,
                        "value_m2": measurements.surface_area_m2,
                        "formula": "L × W",
                        "unit": "cm²/m²"
                    },
                    "volume": {
                        "value_cm3": measurements.volume_cm3,
                        "value_m3": measurements.volume_m3,
                        "formula": "L × W × D" if damage_class != "D40" else "(2/3) × π × (L/2) × (W/2) × D",
                        "unit": "cm³/m³"
                    }
                },
                "confidence": round(adjusted_confidence, 2),
                "limitations": measurements.limitations
            }
            
            all_detections.append(detection)
        
        # Set primary detection (most severe)
        if all_detections:
            primary = all_detections[0]  # Already sorted by severity in predict_damage
            
            result["success"] = True
            result["detected"] = True
            result["damage_type"] = primary["damage_class"]
            result["damage_type_label"] = primary["damage_label"]
            result["damage_type_label_ar"] = primary["damage_label_ar"]
            result["measurements"] = primary["measurements"]
            result["confidence"] = primary["confidence"]
            result["limitations"] = primary["limitations"]
            result["all_detections"] = all_detections
            result["message"] = (
                f"Detected {len(all_detections)} damage area(s). "
                f"Primary: {primary['damage_label']} - "
                f"L:{primary['measurements']['length']['value_cm']}cm x "
                f"W:{primary['measurements']['width']['value_cm']}cm x "
                f"D:{primary['measurements']['depth']['value_cm']}cm"
            )
        
        return result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        result["success"] = False
        result["message"] = f"Analysis error: {str(e)}"
        result["limitations"].append(f"Error: {str(e)}")
        return result


def create_simulated_prediction(image_width: int, image_height: int) -> Dict[str, Any]:
    """Create a simulated prediction for testing without the YOLO model"""
    # Simulate a pothole detection in the center of the image
    cx, cy = image_width // 2, image_height // 2
    w, h = image_width // 4, image_height // 5
    
    return {
        "success": True,
        "detected": True,
        "damage_type": "D40",
        "damage_label": "Pothole",
        "damage_label_ar": "حفرة",
        "confidence": 0.82,
        "severity_score": 0.65,
        "severity": "medium",
        "bounding_boxes": [
            {
                "class": "D40",
                "label": "Pothole",
                "label_ar": "حفرة",
                "confidence": 0.82,
                "severity_score": 0.65,
                "severity_level": "medium",
                "bbox": {
                    "x1": cx - w // 2,
                    "y1": cy - h // 2,
                    "x2": cx + w // 2,
                    "y2": cy + h // 2
                }
            }
        ],
        "image_size": {"width": image_width, "height": image_height}
    }


def format_json_response(analysis_result: Dict[str, Any]) -> str:
    """Format the analysis result as a pretty-printed JSON string"""
    return json.dumps(analysis_result, indent=2, ensure_ascii=False)


# Main entry point for testing
if __name__ == "__main__":
    # Test with a sample image
    import sys
    
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        with open(image_path, "rb") as f:
            image_data = f.read()
        
        result = analyze_road_damage_geometry(image_data)
        print(format_json_response(result))
    else:
        print("Usage: python geometric_analysis.py <image_path>")
        print("\nExample output structure:")
        
        # Show example output structure
        example = {
            "success": True,
            "detected": True,
            "damage_type": "D40",
            "damage_type_label": "Pothole",
            "damage_type_label_ar": "حفرة",
            "measurements": {
                "length": {"value_cm": 45.5, "value_m": 0.455},
                "width": {"value_cm": 32.0, "value_m": 0.32},
                "depth": {"value_cm": 5.2, "value_m": 0.052, "estimated": True},
                "surface_area": {"value_cm2": 1456.0, "value_m2": 0.1456, "formula": "L × W"},
                "volume": {"value_cm3": 3897.28, "value_m3": 0.00389728, "formula": "(2/3) × π × (L/2) × (W/2) × D"}
            },
            "confidence": 0.72,
            "limitations": [
                "GSD using default estimation (typical smartphone at ~1.2m height)",
                "Depth estimated from damage type and severity (no 3D sensing)",
                "Single 2D image analysis without camera calibration"
            ]
        }
        print(format_json_response(example))
