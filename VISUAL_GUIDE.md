# 📸 Bilagh App - Visual Guide

## App Preview

Below are mockups of the main screens in the Bilagh road damage detector app.

### 🏠 Home Screen
The home screen features:
- Purple gradient header with app branding
- Three statistics cards (Reports, Fixed, Pending)
- Quick action buttons with gradients
- Recent activity feed
- Modern, vibrant design

### 🗺️ Map Screen  
The map screen includes:
- Interactive map with damage markers
- Color-coded severity indicators
- Legend for easy reference
- Detailed report cards
- Dark mode support

### 👤 Profile Screen
The profile screen shows:
- User avatar and information
- Statistics dashboard
- Settings toggles
- Menu sections (Account, Preferences, Support)
- Logout functionality

## 🎨 Design System

### Color Palette
```
Primary Purple:   #667eea → #764ba2
Success Teal:     #4ECDC4
Warning Yellow:   #FFE66D
Danger Red:       #FF6B6B
Accent Orange:    #FF8E53
Accent Green:     #56AB91
```

### Typography
- **Headers**: Bold, 24-36px
- **Body**: Regular, 14-16px
- **Labels**: Medium, 12-14px

### Spacing
- **Cards**: 16px padding, 16px border radius
- **Margins**: 20px horizontal, 12-24px vertical
- **Icons**: 20-32px size

### Components
- **Gradient Buttons**: Linear gradients with rounded corners
- **Statistics Cards**: White/dark cards with colored icons
- **Status Badges**: Small pills with colored backgrounds
- **Action Buttons**: Large, colorful, with icons

## 📱 Screen Breakdown

### Navigation
Bottom tab bar with 5 tabs:
1. Home (house icon)
2. Map (map icon)
3. Camera (camera icon)
4. Complaint (warning icon)
5. Profile (person icon)

### Interactions
- **Tap**: Navigate, select items, open modals
- **Swipe**: Scroll lists, switch filters
- **Long Press**: Additional options (future)
- **Pull to Refresh**: Update data (future)

## 🎯 User Flows

### Report Road Damage
1. Open app → Home screen
2. Tap "Report Damage" → Camera screen
3. Take photo or select from gallery
4. Review photo
5. Submit report → Success message

### View Reports on Map
1. Open app → Tap Map tab
2. View all markers on map
3. Tap marker → See details
4. View severity and status
5. Close detail card

### Manage Reports
1. Open app → Tap Complaint tab
2. Filter by status (All/Pending/In Progress/Resolved)
3. Tap report → View details in modal
4. Review information
5. Close modal

### Update Profile
1. Open app → Tap Profile tab
2. View statistics
3. Toggle settings (Notifications, Location)
4. Access menu items
5. Logout when done

## 🌓 Dark Mode

The app fully supports dark mode:
- **Background**: #0a0a0a (almost black)
- **Cards**: #1a1a1a (dark gray)
- **Text**: #fff (white) and #999 (light gray)
- **Borders**: #333 (medium gray)
- **Gradients**: Adjusted for dark theme

## ✨ Special Features

### Animations
- Smooth transitions between screens
- Button press animations
- Modal slide-up animations
- Card hover effects

### Accessibility
- High contrast colors
- Large touch targets (44x44px minimum)
- Clear icons and labels
- Readable font sizes

### Performance
- Optimized images
- Lazy loading
- Efficient re-renders
- Smooth scrolling

## 🚀 Getting Started

To see these screens in action:

1. **Start the app:**
   ```bash
   npm start
   ```

2. **Scan QR code** with Expo Go app

3. **Navigate** through all 5 tabs

4. **Test features:**
   - View statistics on Home
   - Explore map markers
   - Try camera (needs permission)
   - Browse complaints
   - Check profile settings

## 📝 Notes

- All screens use sample/mock data
- Camera requires device permission
- Map requires Google Maps API key
- Fully responsive design
- Works on iOS and Android

---

**Enjoy exploring the Bilagh app! 🎉**
