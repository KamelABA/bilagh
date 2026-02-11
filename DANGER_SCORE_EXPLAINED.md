# 🎯 Danger Score Feature - How It Works

## Overview
The API now calculates a **`danger_score`** from **0.0 to 1.0** that shows how dangerous the detected damage is.

## How It's Calculated

### Formula
```
danger_score = base_danger × (0.5 + (detection_confidence × 0.5))
```

### Base Danger Values (by Damage Type)

| Damage Type | Code | Base Score | Why? |
|-------------|------|------------|------|
| **Pothole** | D40 | **0.85** | Immediate hazard - can cause accidents |
| **Alligator Crack** | D20 | **0.55** | Structural issue - road deteriorating |
| **Transverse Crack** | D10 | **0.35** | Minor issue but needs monitoring |
| **Longitudinal Crack** | D00 | **0.30** | Least dangerous - minor surface crack |
| **Road Debris** | D50 | **0.25** | Usually temporary obstacle |

### Confidence Adjustment

The base score is then adjusted by the **detection confidence**:

- **High confidence (90%+)** → Score stays near base value
- **Low confidence (50%)** → Score is reduced by ~25%
- **Very low confidence (<50%)** → Score is significantly reduced

## Examples

### Example 1: Big Pothole (Very Dangerous)
```json
{
  "damage_type": "D40",
  "damage_category": "Pothole",
  "confidence": 0.92,
  "danger_score": 0.81
}
```
**Calculation:** 0.85 × (0.5 + 0.92 × 0.5) = **0.81** (81% dangerous)
**Meaning:** Critical pothole with high confidence = **VERY DANGEROUS**

---

### Example 2: Alligator Crack (Moderate)
```json
{
  "damage_type": "D20",
  "damage_category": "Crack",
  "confidence": 0.75,
  "danger_score": 0.48
}
```
**Calculation:** 0.55 × (0.5 + 0.75 × 0.5) = **0.48** (48% dangerous)
**Meaning:** Moderate structural issue

---

### Example 3: Small Crack (Low Danger)
```json
{
  "damage_type": "D10",
  "damage_category": "Crack",
  "confidence": 0.60,
  "danger_score": 0.28
}
```
**Calculation:** 0.35 × (0.5 + 0.60 × 0.5) = **0.28** (28% dangerous)
**Meaning:** Minor issue, low priority

---

### Example 4: Uncertain Detection
```json
{
  "damage_type": "D40",
  "damage_category": "Pothole",
  "confidence": 0.45,
  "danger_score": 0.62
}
```
**Calculation:** 0.85 × (0.5 + 0.45 × 0.5) = **0.62** (62% dangerous)
**Meaning:** Might be a pothole, but not certain - moderate danger rating

---

## How to Use This

### Color Coding by Danger Score
```javascript
function getDangerColor(dangerScore) {
  if (dangerScore >= 0.75) return '#FF0000'; // 🔴 Red - Critical
  if (dangerScore >= 0.50) return '#FFA500'; // 🟠 Orange - High
  if (dangerScore >= 0.30) return '#FFFF00'; // 🟡 Yellow - Moderate
  return '#00FF00'; // 🟢 Green - Low
}
```

### Priority Levels
```javascript
function getPriority(dangerScore) {
  if (dangerScore >= 0.75) return 'URGENT - Fix immediately';
  if (dangerScore >= 0.50) return 'High priority';
  if (dangerScore >= 0.30) return 'Medium priority';
  return 'Low priority - monitor';
}
```

### Display Format
```
🔴 DANGER: 81% (Critical Pothole)
Priority: URGENT - Fix immediately
```

## Complete Response Example

```json
{
  "success": true,
  "detected": true,
  "confidence": 0.92,
  "damage_type": "D40",
  "damage_label": "Pothole",
  "damage_category": "Pothole",
  
  "danger_score": 0.81,          ← NEW! How dangerous (0.0 to 1.0)
  "danger_level": 5,             ← Rating from 1-5
  "danger_description": "Critical Risk - Immediate Attention Required",
  
  "message": "Road damage detected: Pothole (Confidence: 92.0%, Danger: 81.0%, Level: 5/5)"
}
```

## Key Fields Summary

| Field | Type | Range | Purpose |
|-------|------|-------|---------|
| `confidence` | float | 0.0-1.0 | How sure the AI is about detection |
| `danger_score` | float | 0.0-1.0 | **How dangerous the damage is** ⭐ |
| `danger_level` | int | 1-5 | Simple danger rating |
| `damage_category` | string | "Pothole"/"Crack" | Simple type |

## Why Two Danger Metrics?

1. **`danger_score`** (0.0-1.0) → Precise calculation, good for algorithms
2. **`danger_level`** (1-5) → Simple rating, good for UI display

Use both together for the best user experience! 🚀
