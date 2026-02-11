# 🔍 Connection Issue - Diagnostic Guide

## Current Status

✅ **Server**: Running on port 8000  
✅ **Hybrid Mode**: Active (Keras + YOLO)  
✅ **Model Info Endpoint**: Working (`/predict/model-info`)  
❌ **Prediction Endpoint**: "Stream Closed" error  

## The Error

```
Camera Analysis - Error: Network connection failed
Endpoint: http://192.168.2.224:8000/predict
Response: Stream Closed
```

## Likely Causes

### 1. **Processing Timeout** (Most Likely)
The hybrid approach (Keras + YOLO) processes each image twice:
- Keras model inference (~2-5 seconds)
- YOLO model inference (~1-3 seconds)
- **Total**: 3-8 seconds per image

Your mobile app might have a **network timeout < 8 seconds**.

### 2. **Large Image Size**
High-resolution camera images (2592×1940 as seen in logs) take longer to:
- Upload
- Process
- Download response

### 3. **Memory Issues**
Both Keras AND YOLO loaded in memory simultaneously may cause:
- High RAM usage
- Slow processing
- Connection drops

## Solutions

### **Quick Fix #1: Increase Mobile App Timeout**

In your mobile app, find the API request timeout

 and increase it:

```typescript
// In your API service or camera component
const response = await fetch(API_ENDPOINTS.PREDICT, {
  method: 'POST',
  body: formData,
  headers: {...},
  // ADD THIS:
  signal: AbortSignal.timeout(30000)  // 30 second timeout instead of default
});
```

### **Quick Fix #2: Reduce Image Size**

In your camera component, resize the image before uploading:

```typescript
// Before uploading
const resizedImage = await ImageManipulator.manipulateAsync(
  imageUri,
  [{ resize: { width: 800 } }],  // Resize to 800px width
  { compress: 0.7, format: SaveFormat.JPEG }
);
```

### **Quick Fix #3: Use YOLO-Only Mode** (Faster)

Temporarily disable hybrid mode for faster predictions:

1. Rename `predict_hybrid.py` to `predict_hybrid.py.disabled`
2. Server will auto-reload and use YOLO-only (faster)
3. Test if connection works

```bash
cd backend
mv predict_hybrid.py predict_hybrid.py.disabled
# Server will reload automatically
```

## Testing Steps

### Test 1: Verify Server is Reachable
From your mobile device, open browser and visit:
```
http://192.168.2.224:8000/predict/model-info
```

**Expected**: JSON response with model info  
**If fails**: Network/firewall issue

### Test 2: Test with Small Image
1. Take a SMALL, low-resolution photo (not full camera resolution)
2. Upload via app
3. Check if it works

**If works**: Image size/timeout issue  
**If fails**: Code issue

### Test 3: Check Server Logs
Watch the backend terminal for errors when you try to upload

**Look for**:
- Error messages
- Timeouts
- Memory errors

## Recommended Action

**STEP 1**: Increase timeout in mobile app to 30 seconds

**STEP 2**: Add image resizing before upload (max width: 800-1000px)

**STEP 3**: If still failing, temporarily disable hybrid mode

## Why "Stream Closed"?

This error typically means:
- **Client gave up waiting** (timeout)
- **Server closed connection** (crash/error/memory)
- **Network interrupted** (WiFi issue)

The server logs show it's running fine, so it's likely:
1. **Processing taking too long** → timeout
2. **Client timeout is too short** → increase it

## Monitoring

To see what's happening in real-time:

1. **Watch server logs**:
   - Look for `/predict` requests
   - Check for errors or long processing times

2. **Add debug logging** in mobile app:
```typescript
console.log('Starting prediction...');
const startTime = Date.now();
try {
  const result = await apiCall();
  console.log(`Prediction took: ${Date.now() - startTime}ms`);
} catch (error) {
  console.log(`Failed after: ${Date.now() - startTime}ms`);
  console.error(error);
}
```

## Next Steps

1. **Increase timeout** in mobile app (easiest)
2. **Resize images** before upload (better performance)
3. If still issues, **switch to YOLO-only** temporarily
4. Check server logs during next attempt

---

**TL;DR**: The hybrid model is working but probably taking too long (5-10 seconds). Increase your mobile app's network timeout to 30 seconds and/or resize images before upload.
