# Bilagh - Road Damage Detection App

React Native mobile app for detecting and reporting road damage.

## Features

- 📸 Camera-based damage detection with AI analysis
- 🗺️ Interactive map of reported issues
- 📋 Report management and tracking
- 👥 User roles: Citizens, Agents, Municipal authorities
- 🌍 Arabic/English support with RTL
- 🔔 Real-time notifications

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on platform
npm run android
npm run ios
```

## Backend Setup

See `backend/README.md` for backend deployment instructions.

## API Configuration

Update `constants/api.ts` with your backend URL:
```typescript
export const API_BASE_URL = 'https://your-railway-app.railway.app';
```

## Building APK

```bash
# Build for Android
eas build -p android --profile preview
```

## Screenshots

### User Template
<div align="center">
  <img src="assets/images/user/photo_5778606569963592927_y.jpg" width="200" />
  <img src="assets/images/user/photo_5778606569963592929_y.jpg" width="200" />
  <img src="assets/images/user/photo_5778606569963592930_y.jpg" width="200" />
  <img src="assets/images/user/photo_5778606569963592931_y.jpg" width="200" />
  <img src="assets/images/user/photo_5778606569963592932_y.jpg" width="200" />
  <img src="assets/images/user/photo_5778606569963592933_y.jpg" width="200" />
  <img src="assets/images/user/photo_5778606569963592934_y.jpg" width="200" />
  <img src="assets/images/user/photo_5778606569963592935_y.jpg" width="200" />
  <img src="assets/images/user/photo_5778606569963592940_y.jpg" width="200" />
  <img src="assets/images/user/photo_5778606569963592941_y.jpg" width="200" />
</div>

### Municipal Template
<div align="center">
  <img src="assets/images/municipal/photo_5778606569963592921_y.jpg" width="200" />
  <img src="assets/images/municipal/photo_5778606569963592923_y.jpg" width="200" />
  <img src="assets/images/municipal/photo_5778606569963592924_y.jpg" width="200" />
  <img src="assets/images/municipal/photo_5778606569963592925_y.jpg" width="200" />
  <img src="assets/images/municipal/photo_5778606569963592926_y.jpg" width="200" />
</div>

### Agent Template
<div align="center">
  <img src="assets/images/agent/photo_5778606569963592912_y.jpg" width="200" />
  <img src="assets/images/agent/photo_5778606569963592914_y.jpg" width="200" />
  <img src="assets/images/agent/photo_5778606569963592916_y.jpg" width="200" />
  <img src="assets/images/agent/photo_5778606569963592917_y.jpg" width="200" />
  <img src="assets/images/agent/photo_5778606569963592918_y.jpg" width="200" />
  <img src="assets/images/agent/photo_5793960859003456730_y.jpg" width="200" />
</div>

## Tech Stack

- React Native + Expo
- FastAPI Backend
- PostgreSQL Database
- Cloudinary (Image Storage)
- Railway (Deployment)

