change databse to mongodb atlas - **City-wide View**: All report locations
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
