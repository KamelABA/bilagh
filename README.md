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

## Tech Stack

- React Native + Expo
- FastAPI Backend
- PostgreSQL Database
- Cloudinary (Image Storage)
- Railway (Deployment)
