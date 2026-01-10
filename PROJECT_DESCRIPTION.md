# Bilagh - Road Damage Reporting App

## Project Overview

**Bilagh** (بلّغ - Arabic for "Report") is a comprehensive mobile application for reporting and tracking road damage in Tiaret, Algeria. The app connects citizens with municipal authorities and field agents to efficiently identify, verify, and resolve road infrastructure issues.

## Key Features

### 🔐 Authentication & Roles
- **User Registration/Login**: Secure account creation with email verification
- **Role-based Access**: Three distinct user roles:
  - **User**: Regular citizens who report road damage
  - **Agent**: Field workers who verify reports on-site
  - **Municipal**: City officials who manage and approve repairs

### 📸 Report Submission
- **Camera Integration**: Take photos of road damage directly in-app
- **Damage Classification**: AI-powered classification of damage types:
  - Potholes (D40)
  - Cracks (D00, D10, D20)
  - Surface damage (D50)
- **Location Detection**: Automatic GPS coordinates with address lookup
- **Severity Levels**: Low, Medium, High priority classification
- **Description**: Add detailed notes about the damage

### 🗺️ Interactive Map
- **Real-time Map View**: See all reported damages on a Leaflet-based map
- **Status Filters**: Filter reports by status (All, Pending, In Progress, Resolved)
- **Location Markers**: Color-coded markers indicating severity
- **Report Details**: Click markers to view full report information
- **User Location**: Track current position within Tiaret bounds

### 📋 My Reports
- **Personal Dashboard**: View all your submitted reports
- **Status Tracking**: Visual timeline showing report progress:
  1. Submitted (Pending)
  2. Verified (by Agent)
  3. Approved (by Municipal)
  4. Assigned (to repair team)
  5. In Progress (repair work)
  6. Resolved (completed)
- **Filter Options**: Filter by status (All, Pending, In Progress, Resolved)
- **Report Details Modal**: Tap to see full report with status timeline

### 👤 User Profile
- **Account Information**: View and manage personal details
- **Report Statistics**: Total reports, resolved issues, pending items
- **Settings Access**: Language, notifications, privacy settings

### ⚙️ Settings
- **Language Support**: English and Arabic with RTL layout
- **Notifications**: Configure push notification preferences
- **Location Services**: Enable/disable GPS tracking
- **Camera Access**: Manage camera permissions
- **Dark Mode**: Toggle dark/light theme
- **Privacy Settings**: Data and security options

---

## Agent Portal

### 🏠 Agent Home
- **Dashboard Stats**: Pending verifications, completed today, total completed
- **Quick Actions**: Start verification, view map
- **Pending Tasks**: List of reports awaiting verification

### ✅ Verification Screen
- **Report Queue**: View pending reports to verify
- **On-site Inspection**: Confirm report accuracy in the field
- **Status Updates**: Approve, reject, or request more info
- **Notes & Photos**: Add verification evidence

### 🗺️ Agent Map
- **All Reports View**: See all reports in the region
- **Status Filters**: Filter by verification status
- **Navigation**: Get directions to report locations
- **Quick Actions**: Verify reports directly from map

### 🔔 Agent Notifications
- **New Reports**: Alerts for new damage reports
- **Priority Updates**: Urgent report notifications
- **Assignment Updates**: Task assignment notifications

---

## Municipal Portal

### 🏠 Municipal Dashboard
- **City-wide Overview**: Statistics for all reports
- **Priority Alerts**: High-severity pending reports
- **Quick Actions**: View reports, manage teams

### 📊 Reports Management
- **All Reports**: View every report in the system
- **Advanced Filters**: Status, severity, date range, location
- **Bulk Actions**: Approve/reject multiple reports
- **Assignment**: Assign repairs to work teams

### 🗺️ Municipal Map
- **City-wide View**: All report locations
- **Heat Maps**: Damage concentration areas
- **Status Filters**: Filter by approval status
- **Analytics**: Visual damage distribution

---

## Technical Stack

### Frontend
- **Framework**: React Native with Expo
- **Router**: Expo Router (file-based routing)
- **Styling**: StyleSheet (React Native)
- **Maps**: react-native-webview with Leaflet.js
- **Icons**: Custom IconSymbol component
- **Gradients**: expo-linear-gradient
- **Translations**: Custom i18n with LanguageContext

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite with SQLAlchemy ORM
- **Authentication**: JWT tokens with OAuth2
- **API**: RESTful endpoints

### Key Dependencies
- `expo-camera`: Camera access
- `expo-location`: GPS services
- `expo-image-picker`: Photo selection
- `@react-native-async-storage`: Local storage
- `react-native-webview`: Map display
- `expo-linear-gradient`: UI gradients

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User authentication |
| `/api/auth/register` | POST | New user registration |
| `/api/users/me` | GET | Current user profile |
| `/api/reports` | GET/POST | User reports |
| `/api/reports/{id}` | GET/PUT | Single report |
| `/api/municipal/reports` | GET | All reports (municipal) |
| `/api/municipal/reports/all` | GET | All reports unfiltered |

---

## Translations

The app supports:
- **English (en)**: Default language
- **Arabic (ar)**: Full RTL support

All text is managed through JSON translation files in `/locales/`.

---

## Color Scheme

### User Theme
- Primary Blue: `#0B5394`
- Primary Green: `#4A7C2C`
- Gradient: Blue → Green

### Status Colors
- Pending: `#FF6B6B` (Red)
- In Progress: `#FFE66D` (Yellow)
- Resolved: `#4ECDC4` (Teal)

### Severity Colors
- High: `#FF4B2B` (Red)
- Medium: `#FFD200` (Yellow)
- Low: `#4ECDC4` (Teal)

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- Expo CLI

### Installation

```bash
# Frontend
npm install
npx expo start

# Backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

### Environment

Create `.env` file with:
```
API_BASE_URL=http://localhost:8000/api
```

---

## License

This project is developed for Tiaret Municipality road damage management.

© 2026 Bilagh - All Rights Reserved
