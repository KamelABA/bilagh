"""
Civil Engineering Risk Assessment Module
Computes engineering risk indices for road damage based on geometric measurements,
road classification, and material properties.

This module follows conservative, safety-oriented principles for risk assessment.
"""

from enum import Enum
from dataclasses import dataclass
from typing import Optional, Dict, Any, List
import json


class DamageType(Enum):
    """Road damage classification types"""
    POTHOLE = "pothole"
    LONGITUDINAL_CRACK = "longitudinal_crack"
    TRANSVERSE_CRACK = "transverse_crack"
    ALLIGATOR_CRACK = "alligator_crack"
    SURFACE_DAMAGE = "surface_damage"
    UNKNOWN = "unknown"


class RoadType(Enum):
    """Road classification by traffic importance"""
    MAIN = "main"           # Main arterial roads, highways
    SECONDARY = "secondary"  # Collector roads, secondary routes
    RESIDENTIAL = "residential"  # Local residential streets


class RoadMaterial(Enum):
    """Road surface material type"""
    ASPHALT = "asphalt"
    CONCRETE = "concrete"


class UrgencyLevel(Enum):
    """Urgency classification for intervention"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PriorityLevel(Enum):
    """Priority level for repair scheduling"""
    P1_IMMEDIATE = "P1 - Immediate"      # Within 24-48 hours
    P2_URGENT = "P2 - Urgent"            # Within 1 week
    P3_SCHEDULED = "P3 - Scheduled"      # Within 1 month
    P4_ROUTINE = "P4 - Routine"          # Within 3 months
    P5_MONITOR = "P5 - Monitor"          # Monitor, no immediate action


@dataclass
class RiskAssessmentResult:
    """Complete risk assessment result"""
    risk_index: float           # 0-100 scale
    urgency: UrgencyLevel
    priority: PriorityLevel
    risk_explanation: str
    risk_factors: Dict[str, float]
    recommendations: List[str]
    confidence: float


# ============================================================================
# RISK WEIGHT FACTORS (Conservative, safety-oriented)
# ============================================================================

# Damage type base risk scores (higher = more dangerous)
DAMAGE_TYPE_RISK = {
    DamageType.POTHOLE: 45,              # High immediate risk (vehicle damage, accidents)
    DamageType.ALLIGATOR_CRACK: 35,      # Structural degradation indicator
    DamageType.LONGITUDINAL_CRACK: 25,   # Can widen, water infiltration
    DamageType.TRANSVERSE_CRACK: 20,     # Less severe but can propagate
    DamageType.SURFACE_DAMAGE: 15,       # Surface-level issue
    DamageType.UNKNOWN: 30,              # Conservative default
}

# Road type multipliers (main roads have higher risk impact)
ROAD_TYPE_MULTIPLIER = {
    RoadType.MAIN: 1.5,          # High traffic = higher consequence
    RoadType.SECONDARY: 1.2,     # Moderate traffic
    RoadType.RESIDENTIAL: 1.0,   # Lower traffic, but still risk to residents
}

# Material degradation factors
MATERIAL_FACTOR = {
    RoadMaterial.ASPHALT: 1.0,    # Standard reference
    RoadMaterial.CONCRETE: 0.85,  # Concrete more durable but harder to repair
}

# Dimension thresholds for risk escalation (in centimeters)
DIMENSION_THRESHOLDS = {
    "length": {
        "low": 10,       # < 10cm
        "medium": 30,    # 10-30cm
        "high": 60,      # 30-60cm
        "critical": 100, # > 100cm
    },
    "width": {
        "low": 5,        # < 5cm
        "medium": 15,    # 5-15cm
        "high": 30,      # 15-30cm
        "critical": 50,  # > 50cm
    },
    "depth": {
        "low": 2,        # < 2cm
        "medium": 5,     # 2-5cm
        "high": 10,      # 5-10cm
        "critical": 15,  # > 15cm (very dangerous)
    },
    "volume": {
        "low": 100,      # < 100 cm³
        "medium": 500,   # 100-500 cm³
        "high": 2000,    # 500-2000 cm³
        "critical": 5000, # > 5000 cm³
    }
}


def map_damage_code_to_type(damage_code: str) -> DamageType:
    """Map RDD2020 damage codes to DamageType enum"""
    mapping = {
        "D00": DamageType.LONGITUDINAL_CRACK,
        "D10": DamageType.TRANSVERSE_CRACK,
        "D20": DamageType.ALLIGATOR_CRACK,
        "D40": DamageType.POTHOLE,
        "D50": DamageType.SURFACE_DAMAGE,
        "pothole": DamageType.POTHOLE,
        "crack": DamageType.LONGITUDINAL_CRACK,
        "surface_damage": DamageType.SURFACE_DAMAGE,
    }
    return mapping.get(damage_code.upper() if damage_code else "", DamageType.UNKNOWN)


def calculate_dimension_risk(value: float, thresholds: Dict[str, float]) -> float:
    """
    Calculate risk contribution from a dimension value.
    Returns a score from 0 to 25 (each dimension can contribute up to 25 points).
    """
    if value is None or value <= 0:
        return 5  # Conservative default for unknown dimensions
    
    if value < thresholds["low"]:
        return 5 + (value / thresholds["low"]) * 5  # 5-10
    elif value < thresholds["medium"]:
        ratio = (value - thresholds["low"]) / (thresholds["medium"] - thresholds["low"])
        return 10 + ratio * 5  # 10-15
    elif value < thresholds["high"]:
        ratio = (value - thresholds["medium"]) / (thresholds["high"] - thresholds["medium"])
        return 15 + ratio * 5  # 15-20
    elif value < thresholds["critical"]:
        ratio = (value - thresholds["high"]) / (thresholds["critical"] - thresholds["high"])
        return 20 + ratio * 5  # 20-25
    else:
        return 25  # Maximum risk for this dimension


def determine_urgency(risk_index: float) -> UrgencyLevel:
    """Determine urgency level from risk index (conservative thresholds)"""
    if risk_index >= 75:
        return UrgencyLevel.CRITICAL
    elif risk_index >= 50:
        return UrgencyLevel.HIGH
    elif risk_index >= 30:
        return UrgencyLevel.MEDIUM
    else:
        return UrgencyLevel.LOW


def determine_priority(
    urgency: UrgencyLevel,
    road_type: RoadType,
    damage_type: DamageType
) -> PriorityLevel:
    """
    Determine intervention priority based on urgency, road type, and damage type.
    Conservative approach: when in doubt, prioritize higher.
    """
    # Critical urgency always gets immediate priority
    if urgency == UrgencyLevel.CRITICAL:
        return PriorityLevel.P1_IMMEDIATE
    
    # High urgency
    if urgency == UrgencyLevel.HIGH:
        if road_type == RoadType.MAIN:
            return PriorityLevel.P1_IMMEDIATE
        elif road_type == RoadType.SECONDARY:
            return PriorityLevel.P2_URGENT
        else:
            return PriorityLevel.P2_URGENT
    
    # Medium urgency
    if urgency == UrgencyLevel.MEDIUM:
        if road_type == RoadType.MAIN:
            return PriorityLevel.P2_URGENT
        elif damage_type == DamageType.POTHOLE:
            return PriorityLevel.P2_URGENT  # Potholes always more urgent
        else:
            return PriorityLevel.P3_SCHEDULED
    
    # Low urgency
    if damage_type == DamageType.POTHOLE:
        return PriorityLevel.P3_SCHEDULED  # Even small potholes need attention
    elif road_type == RoadType.MAIN:
        return PriorityLevel.P3_SCHEDULED
    else:
        return PriorityLevel.P4_ROUTINE


def generate_risk_explanation(
    damage_type: DamageType,
    risk_index: float,
    urgency: UrgencyLevel,
    road_type: RoadType,
    length_cm: float,
    width_cm: float,
    depth_cm: float
) -> str:
    """Generate a concise, one-sentence risk explanation"""
    
    damage_desc = {
        DamageType.POTHOLE: "pothole",
        DamageType.ALLIGATOR_CRACK: "alligator cracking pattern",
        DamageType.LONGITUDINAL_CRACK: "longitudinal crack",
        DamageType.TRANSVERSE_CRACK: "transverse crack",
        DamageType.SURFACE_DAMAGE: "surface deterioration",
        DamageType.UNKNOWN: "road damage",
    }
    
    road_desc = {
        RoadType.MAIN: "main arterial road",
        RoadType.SECONDARY: "secondary road",
        RoadType.RESIDENTIAL: "residential street",
    }
    
    severity_desc = {
        UrgencyLevel.CRITICAL: "poses an immediate safety hazard",
        UrgencyLevel.HIGH: "presents significant risk to vehicles and pedestrians",
        UrgencyLevel.MEDIUM: "requires attention to prevent further deterioration",
        UrgencyLevel.LOW: "should be monitored for progression",
    }
    
    size_desc = ""
    if length_cm > 50 or width_cm > 30:
        size_desc = "large "
    elif depth_cm > 7:
        size_desc = "deep "
    
    return (
        f"This {size_desc}{damage_desc.get(damage_type, 'damage')} "
        f"({length_cm:.0f}×{width_cm:.0f}×{depth_cm:.1f}cm) on a {road_desc.get(road_type, 'road')} "
        f"{severity_desc.get(urgency, 'requires assessment')} "
        f"(Risk Index: {risk_index:.0f}/100)."
    )


def generate_recommendations(
    damage_type: DamageType,
    urgency: UrgencyLevel,
    priority: PriorityLevel,
    road_type: RoadType,
    material: RoadMaterial,
    depth_cm: float
) -> List[str]:
    """Generate list of engineering recommendations"""
    recommendations = []
    
    # Immediate safety recommendations for critical/high urgency
    if urgency in [UrgencyLevel.CRITICAL, UrgencyLevel.HIGH]:
        recommendations.append("Install warning signs or barriers immediately")
        if road_type == RoadType.MAIN:
            recommendations.append("Consider temporary lane closure if damage spans traffic lane")
    
    # Damage-specific recommendations
    if damage_type == DamageType.POTHOLE:
        if depth_cm > 10:
            recommendations.append("Full-depth repair required; surface patching insufficient")
        elif depth_cm > 5:
            recommendations.append("Cold or hot mix patching with proper compaction")
        else:
            recommendations.append("Surface patching may be sufficient")
    
    elif damage_type in [DamageType.ALLIGATOR_CRACK, DamageType.LONGITUDINAL_CRACK]:
        recommendations.append("Investigate subbase condition before repair")
        recommendations.append("Crack sealing to prevent water infiltration")
        if damage_type == DamageType.ALLIGATOR_CRACK:
            recommendations.append("Consider full-depth reclamation for affected section")
    
    elif damage_type == DamageType.TRANSVERSE_CRACK:
        recommendations.append("Seal cracks to prevent moisture penetration")
        recommendations.append("Monitor for crack widening or new crack formation")
    
    elif damage_type == DamageType.SURFACE_DAMAGE:
        recommendations.append("Surface treatment or thin overlay recommended")
    
    # Material-specific recommendations
    if material == RoadMaterial.CONCRETE:
        recommendations.append("Concrete repair requires specialized materials and curing time")
    
    # Priority-based timeline
    timeline_map = {
        PriorityLevel.P1_IMMEDIATE: "Schedule repair within 24-48 hours",
        PriorityLevel.P2_URGENT: "Schedule repair within 1 week",
        PriorityLevel.P3_SCHEDULED: "Schedule repair within 30 days",
        PriorityLevel.P4_ROUTINE: "Include in next routine maintenance cycle",
        PriorityLevel.P5_MONITOR: "Add to monitoring schedule; reassess in 3 months",
    }
    recommendations.append(timeline_map.get(priority, "Schedule assessment"))
    
    return recommendations


def assess_risk(
    damage_type: str,
    length_cm: float,
    width_cm: float,
    depth_cm: float,
    volume_cm3: Optional[float] = None,
    road_type: str = "secondary",
    material: str = "asphalt",
    severity_score: Optional[float] = None
) -> Dict[str, Any]:
    """
    Main risk assessment function.
    
    Args:
        damage_type: Damage classification (D00, D10, D20, D40, D50, or descriptive)
        length_cm: Damage length in centimeters
        width_cm: Damage width in centimeters
        depth_cm: Damage depth in centimeters
        volume_cm3: Optional calculated volume in cm³
        road_type: Road classification (main, secondary, residential)
        material: Road material (asphalt, concrete)
        severity_score: Optional severity score from detection (0-1)
    
    Returns:
        Complete risk assessment as structured dictionary
    """
    # Parse enums with fallbacks
    try:
        damage_enum = map_damage_code_to_type(damage_type)
    except:
        damage_enum = DamageType.UNKNOWN
    
    try:
        road_enum = RoadType(road_type.lower())
    except:
        road_enum = RoadType.SECONDARY
    
    try:
        material_enum = RoadMaterial(material.lower())
    except:
        material_enum = RoadMaterial.ASPHALT
    
    # Calculate volume if not provided
    if volume_cm3 is None or volume_cm3 <= 0:
        volume_cm3 = length_cm * width_cm * depth_cm
    
    # ========================================================================
    # RISK INDEX CALCULATION
    # ========================================================================
    
    # 1. Base risk from damage type (0-45 points)
    base_risk = DAMAGE_TYPE_RISK.get(damage_enum, 30)
    
    # 2. Dimension-based risk (0-25 points each, max contribution 30 for all)
    length_risk = calculate_dimension_risk(length_cm, DIMENSION_THRESHOLDS["length"])
    width_risk = calculate_dimension_risk(width_cm, DIMENSION_THRESHOLDS["width"])
    depth_risk = calculate_dimension_risk(depth_cm, DIMENSION_THRESHOLDS["depth"])
    volume_risk = calculate_dimension_risk(volume_cm3, DIMENSION_THRESHOLDS["volume"])
    
    # Weight dimensions: depth is most critical for safety
    dimension_risk = (
        length_risk * 0.2 +
        width_risk * 0.2 +
        depth_risk * 0.4 +  # Depth weighted higher
        volume_risk * 0.2
    )
    
    # Normalize to 0-35 range
    dimension_contribution = (dimension_risk / 25) * 35
    
    # 3. Combined base risk (0-80)
    combined_risk = base_risk + dimension_contribution
    
    # 4. Apply road type multiplier
    road_multiplier = ROAD_TYPE_MULTIPLIER.get(road_enum, 1.0)
    
    # 5. Apply material factor
    material_factor = MATERIAL_FACTOR.get(material_enum, 1.0)
    
    # 6. Calculate final risk index
    risk_index = combined_risk * road_multiplier * material_factor
    
    # Apply severity score boost if available (can add up to 10 points)
    if severity_score is not None and severity_score > 0:
        severity_boost = severity_score * 10
        risk_index += severity_boost
    
    # Clamp to 0-100
    risk_index = max(0, min(100, risk_index))
    
    # ========================================================================
    # URGENCY AND PRIORITY
    # ========================================================================
    
    urgency = determine_urgency(risk_index)
    priority = determine_priority(urgency, road_enum, damage_enum)
    
    # ========================================================================
    # GENERATE EXPLANATIONS AND RECOMMENDATIONS
    # ========================================================================
    
    risk_explanation = generate_risk_explanation(
        damage_enum, risk_index, urgency, road_enum,
        length_cm, width_cm, depth_cm
    )
    
    recommendations = generate_recommendations(
        damage_enum, urgency, priority, road_enum, material_enum, depth_cm
    )
    
    # ========================================================================
    # COMPILE RESULT
    # ========================================================================
    
    # Risk factor breakdown for transparency
    risk_factors = {
        "base_damage_risk": round(base_risk, 2),
        "dimension_contribution": round(dimension_contribution, 2),
        "length_factor": round(length_risk, 2),
        "width_factor": round(width_risk, 2),
        "depth_factor": round(depth_risk, 2),
        "volume_factor": round(volume_risk, 2),
        "road_type_multiplier": road_multiplier,
        "material_factor": material_factor,
        "severity_boost": round(severity_score * 10, 2) if severity_score else 0,
    }
    
    # Confidence based on data completeness
    confidence = 0.8  # Base confidence
    if depth_cm <= 0:
        confidence -= 0.2  # Depth unknown
    if volume_cm3 <= 0:
        confidence -= 0.1  # Volume unknown
    if severity_score is None:
        confidence -= 0.1  # No ML severity
    confidence = max(0.3, confidence)
    
    result = {
        "risk_index": round(risk_index, 1),
        "urgency": urgency.value,
        "urgency_label": {
            "en": urgency.value.capitalize(),
            "ar": {
                "low": "منخفض",
                "medium": "متوسط",
                "high": "عالي",
                "critical": "حرج"
            }.get(urgency.value, urgency.value)
        },
        "priority": priority.value,
        "priority_label": {
            "en": priority.value,
            "ar": {
                "P1 - Immediate": "أ1 - فوري",
                "P2 - Urgent": "أ2 - عاجل",
                "P3 - Scheduled": "أ3 - مجدول",
                "P4 - Routine": "أ4 - روتيني",
                "P5 - Monitor": "أ5 - مراقبة"
            }.get(priority.value, priority.value)
        },
        "risk_explanation": risk_explanation,
        "risk_explanation_ar": generate_arabic_explanation(
            damage_enum, risk_index, urgency, road_enum,
            length_cm, width_cm, depth_cm
        ),
        "recommendations": recommendations,
        "risk_factors": risk_factors,
        "input_parameters": {
            "damage_type": damage_type,
            "damage_category": damage_enum.value,
            "dimensions": {
                "length_cm": round(length_cm, 2),
                "width_cm": round(width_cm, 2),
                "depth_cm": round(depth_cm, 2),
                "volume_cm3": round(volume_cm3, 2)
            },
            "road_type": road_enum.value,
            "material": material_enum.value
        },
        "confidence": round(confidence, 2),
        "assessment_notes": [
            "Risk assessment follows conservative engineering safety standards",
            "Depth estimation may affect accuracy if based on image analysis only",
            "On-site inspection recommended for critical/high urgency findings"
        ]
    }
    
    return result


def generate_arabic_explanation(
    damage_type: DamageType,
    risk_index: float,
    urgency: UrgencyLevel,
    road_type: RoadType,
    length_cm: float,
    width_cm: float,
    depth_cm: float
) -> str:
    """Generate Arabic risk explanation"""
    
    damage_desc_ar = {
        DamageType.POTHOLE: "الحفرة",
        DamageType.ALLIGATOR_CRACK: "التشققات التمساحية",
        DamageType.LONGITUDINAL_CRACK: "الشق الطولي",
        DamageType.TRANSVERSE_CRACK: "الشق العرضي",
        DamageType.SURFACE_DAMAGE: "تلف السطح",
        DamageType.UNKNOWN: "الضرر",
    }
    
    road_desc_ar = {
        RoadType.MAIN: "الطريق الرئيسي",
        RoadType.SECONDARY: "الطريق الثانوي",
        RoadType.RESIDENTIAL: "الشارع السكني",
    }
    
    severity_desc_ar = {
        UrgencyLevel.CRITICAL: "يشكل خطراً فورياً على السلامة",
        UrgencyLevel.HIGH: "يمثل خطراً كبيراً على المركبات والمشاة",
        UrgencyLevel.MEDIUM: "يتطلب الاهتمام لمنع مزيد من التدهور",
        UrgencyLevel.LOW: "يجب مراقبته للتطور",
    }
    
    return (
        f"هذا {damage_desc_ar.get(damage_type, 'الضرر')} "
        f"({length_cm:.0f}×{width_cm:.0f}×{depth_cm:.1f} سم) على {road_desc_ar.get(road_type, 'الطريق')} "
        f"{severity_desc_ar.get(urgency, 'يتطلب التقييم')} "
        f"(مؤشر الخطر: {risk_index:.0f}/100)."
    )


def format_json_response(assessment_result: Dict[str, Any]) -> str:
    """Format the assessment result as a pretty-printed JSON string"""
    return json.dumps(assessment_result, indent=2, ensure_ascii=False)


# Example usage and testing
if __name__ == "__main__":
    # Test with a sample pothole
    result = assess_risk(
        damage_type="D40",
        length_cm=45.5,
        width_cm=32.0,
        depth_cm=5.2,
        road_type="main",
        material="asphalt",
        severity_score=0.72
    )
    
    print("=" * 60)
    print("CIVIL ENGINEERING RISK ASSESSMENT")
    print("=" * 60)
    print(format_json_response(result))
