# Damage Detection API Response Format

## Overview
When damage is detected, the API now returns an enhanced response with confidence scores, danger levels, and simplified damage categories.

## Response Fields

### Basic Detection
- **`detected`** (boolean): Whether damage was found
- **`success`** (boolean): Whether the API call succeeded
- **`message`** (string): Human-readable summary

### Confidence & Accuracy
- **`confidence`** (float): Detection confidence score (0.0 to 1.0)
  - Example: `0.85` = 85% confident

### Damage Type
- **`damage_type`** (string): Technical classification code
  - `D00` - Longitudinal Crack (شق طولي)
  - `D10` - Transverse Crack (شق عرضي)
  - `D20` - Alligator Crack (شق تمساحي)
  - `D40` - Pothole (حفرة)

- **`damage_label`** (string): English description
- **`damage_label_ar`** (string): Arabic description

### Simplified Category ⭐ NEW
- **`damage_category`** (string): Either **"Pothole"** or **"Crack"**
  - Pothole: D40 damages
  - Crack: D00, D10, D20 damages
- **`damage_category_ar`** (string): Arabic version (حفرة or شق)

### Danger Level ⭐ NEW
- **`danger_level`** (integer): Risk rating from **1 to 5**
  - **1** - Very Low Risk (خطر منخفض جداً)
  - **2** - Low Risk (خطر منخفض)
  - **3** - Moderate Risk (خطر متوسط)
  - **4** - High Risk (خطر عالي)
  - **5** - Critical Risk - Immediate Attention Required (خطر حرج - يتطلب اهتماماً فورياً)

- **`danger_description`** (string): English risk description
- **`danger_description_ar`** (string): Arabic risk description

### How Danger Level is Calculated

The danger level is calculated based on:
1. **Damage Type** (base danger):
   - Longitudinal/Transverse Crack (D00/D10): Base = 2
   - Alligator Crack (D20): Base = 3
   - Pothole (D40): Base = 4

2. **Detection Confidence**:
   - High confidence (>80%): +1 to danger level
   - Low confidence (<50%): -1 to danger level

**Examples:**
- Pothole detected with 85% confidence → Danger Level **5** (Critical)
- Longitudinal crack with 60% confidence → Danger Level **2** (Low)
- Pothole detected with 45% confidence → Danger Level **3** (Moderate)

## Example Response

```json
{
  "success": true,
  "detected": true,
  "confidence": 0.87,
  "damage_type": "D40",
  "damage_label": "Pothole",
  "damage_label_ar": "حفرة",
  "damage_category": "Pothole",
  "damage_category_ar": "حفرة",
  "danger_level": 5,
  "danger_description": "Critical Risk - Immediate Attention Required",
  "danger_description_ar": "خطر حرج - يتطلب اهتماماً فورياً",
  "severity": "high",
  "severity_score": 0.87,
  "color": "#FF0000",
  "message": "Road damage detected: Pothole (Confidence: 87.0%, Danger: 5/5)",
  "bounding_boxes": [...],
  "image_size": {...}
}
```

## Usage in Mobile App

You can now display:
1. **Confidence**: "Detection Confidence: 87%"
2. **Category**: "Type: Pothole" or "Type: Crack"
3. **Danger Level**: Show color-coded rating (1-5 stars/dots)
4. **Risk Description**: "Critical Risk - Immediate Attention Required"

## Color Coding Suggestion

Use these colors for danger levels:
- Level 1-2: 🟢 Green (#00FF00 or similar)
- Level 3: 🟡 Yellow (#FFFF00 or similar)
- Level 4: 🟠 Orange (#FFA500 or similar)
- Level 5: 🔴 Red (#FF0000 or similar)
