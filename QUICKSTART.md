# 🚀 Quick Start Guide - Bilagh

## Running the App

### Option 1: Using Expo Go (Recommended for Testing)

1. **Install Expo Go on your phone**:
   - iOS: Download from App Store
   - Android: Download from Google Play Store

2. **Start the development server**:
   ```bash
   npm start
   ```

3. **Scan the QR code**:
   - iOS: Use the Camera app to scan the QR code
   - Android: Use the Expo Go app to scan the QR code

### Option 2: Using Emulator/Simulator

#### Android Emulator
```bash
npm run android
```

#### iOS Simulator (Mac only)
```bash
npm run ios
```

#### Web Browser
```bash
npm run web
```

## Important Notes

### Google Maps API Key (Required for Map Screen)

The Map screen requires a Google Maps API key. Follow these steps:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
4. Create credentials (API Key)
5. Update `app.json`:
   ```json
   "android": {
     "config": {
       "googleMaps": {
         "apiKey": "YOUR_ACTUAL_API_KEY_HERE"
       }
     }
   }
   ```

### Permissions

When you first run the app:
- **Camera Screen**: Will request camera permission
- **Map Screen**: Will request location permission

Make sure to allow these permissions for full functionality.

## App Structure

The app has 5 main screens accessible via bottom tabs:

1. **🏠 Home** - Dashboard with statistics and quick actions
2. **🗺️ Map** - Interactive map showing damage reports
3. **📷 Camera** - Capture photos of road damage
4. **📋 Complaint** - View and manage your reports
5. **👤 Profile** - User profile and settings

## Development Tips

### Hot Reload
- Press `r` in the terminal to reload the app
- Shake your device to open the developer menu

### Debugging
- Press `j` in the terminal to open Chrome DevTools
- Use React Native Debugger for advanced debugging

### Clear Cache
If you encounter issues:
```bash
npx expo start -c
```

## Troubleshooting

### Issue: "Cannot find module 'expo-linear-gradient'"
**Solution**: Run `npx expo install expo-linear-gradient`

### Issue: Map not showing
**Solution**: Make sure you've added your Google Maps API key to `app.json`

### Issue: Camera not working
**Solution**: Check that camera permissions are granted in your device settings

### Issue: Build errors
**Solution**: Try clearing cache and reinstalling:
```bash
rm -rf node_modules
npm install
npx expo start -c
```

## Next Steps

1. ✅ Run the app using `npm start`
2. ✅ Test all 5 screens
3. ✅ Add your Google Maps API key
4. ✅ Test camera and location permissions
5. ✅ Customize the app for your needs

## Need Help?

- Check the main README.md for detailed documentation
- Visit [Expo Documentation](https://docs.expo.dev/)
- Check [React Native Documentation](https://reactnative.dev/)

Happy coding! 🎉
