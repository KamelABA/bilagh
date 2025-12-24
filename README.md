# Bilagh - Road Damage Detector

A React Native mobile application built with Expo for detecting and reporting road damage. The app helps citizens report potholes, cracks, and other road issues to improve infrastructure maintenance.

## Features

### 🏠 Home Screen
- Dashboard with statistics (Total Reports, Fixed Issues, Pending Reports)
- Quick action buttons for common tasks
- Recent activity feed
- Beautiful gradient design with dark mode support

### 🗺️ Map Screen
- Interactive map showing all reported road damage locations
- Color-coded markers based on severity (High, Medium, Low)
- Detailed information cards for each report
- Filter by status (Pending, In Progress, Resolved)
- Dark mode map styling

### 📷 Camera Screen
- Built-in camera for capturing road damage photos
- Image picker for selecting from gallery
- Camera flip functionality
- Photo preview before submission
- Permission handling with user-friendly UI

### 📋 Complaint Screen
- List of all submitted reports
- Filter by status (All, Pending, In Progress, Resolved)
- Detailed modal view for each complaint
- Severity and status badges
- Floating action button to create new reports

### 👤 Profile Screen
- User profile with avatar
- Statistics dashboard (Reports, Resolved, Points)
- Settings toggles (Notifications, Location)
- Account management options
- Theme and language preferences
- Help and support section
- Logout functionality

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router (File-based routing)
- **UI Components**: Custom components with SF Symbols icons
- **Maps**: react-native-maps
- **Camera**: expo-camera
- **Location**: expo-location
- **Image Picker**: expo-image-picker
- **Styling**: React Native StyleSheet with LinearGradient

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Emulator

### Installation

1. Clone the repository:
```bash
cd bilagh
```

2. Install dependencies:
```bash
npm install
```

3. Configure Google Maps API (for Android):
   - Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
   - Update `app.json` with your API key:
   ```json
   "android": {
     "config": {
       "googleMaps": {
         "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
       }
     }
   }
   ```

### Running the App

Start the development server:
```bash
npm start
```

Run on specific platforms:
```bash
# iOS (Mac only)
npm run ios

# Android
npm run android

# Web
npm run web
```

## Project Structure

```
bilagh/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx        # Home screen
│   │   ├── map.tsx          # Map screen
│   │   ├── camera.tsx       # Camera screen
│   │   ├── complaint.tsx    # Complaint screen
│   │   ├── profile.tsx      # Profile screen
│   │   └── _layout.tsx      # Tab navigation layout
│   └── _layout.tsx          # Root layout
├── assets/                  # Images, fonts, etc.
├── components/              # Reusable components
├── constants/               # Theme and constants
├── hooks/                   # Custom hooks
└── app.json                 # Expo configuration
```

## Permissions

The app requires the following permissions:

### iOS
- Camera access (NSCameraUsageDescription)
- Location when in use (NSLocationWhenInUseUsageDescription)

### Android
- CAMERA
- ACCESS_FINE_LOCATION
- ACCESS_COARSE_LOCATION

## Features to Implement

- [ ] Backend API integration
- [ ] User authentication
- [ ] Real-time notifications
- [ ] AI-powered damage detection
- [ ] Offline mode with local storage
- [ ] Social sharing
- [ ] Gamification (points, badges)
- [ ] Multi-language support
- [ ] Report analytics

## Design Philosophy

The app follows modern mobile design principles:
- **Vibrant Colors**: Using curated color palettes for visual appeal
- **Gradients**: Linear gradients for depth and premium feel
- **Dark Mode**: Full dark mode support throughout the app
- **Micro-animations**: Smooth transitions and interactions
- **Glassmorphism**: Semi-transparent cards with blur effects
- **Consistent Spacing**: Using a 4px grid system
- **SF Symbols**: Native iOS icons for familiar UX

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Contact

For questions or support, please contact the development team.

---

Built with ❤️ using React Native and Expo
