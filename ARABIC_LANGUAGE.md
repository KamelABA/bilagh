# Arabic Language Support - Setup Guide

## ✅ What Was Added

### 1. **Translation Files**
- `locales/en.json` - English translations
- `locales/ar.json` - Arabic translations (العربية)

### 2. **i18n Configuration**
- `i18n.ts` - Internationalization setup
- RTL (Right-to-Left) support for Arabic
- Language persistence with AsyncStorage

### 3. **Language Switcher Component**
- `components/LanguageSwitcher.tsx`
- Easy language switching
- Visual feedback for active language

## 📦 Installation

```bash
npm install i18next react-i18next
```

## 🔧 Setup Steps

### Step 1: Initialize i18n in App

Add to your `app/_layout.tsx` or main app file:

```typescript
import './i18n'; // Import at the top
```

### Step 2: Add Language Switcher to Settings

In `app/settings.tsx`, add:

```typescript
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

// In your component:
const { t } = useTranslation();

// Add this section:
<View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
        {t('settings.language')}
    </Text>
    <LanguageSwitcher isDark={isDark} />
</View>
```

### Step 3: Use Translations in Components

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
    const { t } = useTranslation();
    
    return (
        <Text>{t('common.appName')}</Text>
        // Outputs: "Bilagh" (English) or "بلاغ" (Arabic)
    );
}
```

## 🌍 Supported Languages

| Language | Code | RTL | Status |
|----------|------|-----|--------|
| English | `en` | No | ✅ Complete |
| Arabic | `ar` | Yes | ✅ Complete |

## 📝 Translation Keys

### Common
- `common.appName` - "Bilagh" / "بلاغ"
- `common.loading` - "Loading..." / "جاري التحميل..."
- `common.submit` - "Submit" / "إرسال"

### Authentication
- `auth.login` - "Sign In" / "تسجيل الدخول"
- `auth.signup` - "Sign Up" / "إنشاء حساب"
- `auth.email` - "Email" / "البريد الإلكتروني"

### Tabs
- `tabs.home` - "Home" / "الرئيسية"
- `tabs.map` - "Map" / "الخريطة"
- `tabs.reports` - "Reports" / "البلاغات"

### Reports
- `reports.submitReport` - "Submit Report" / "إرسال بلاغ"
- `reports.type` - "Damage Type" / "نوع الضرر"
- `reports.location` - "Location" / "الموقع"

### Profile
- `profile.accountInfo` - "Account Information" / "معلومات الحساب"
- `profile.stats` - "Statistics" / "الإحصائيات"

### Settings
- `settings.language` - "Language" / "اللغة"
- `settings.darkMode` - "Dark Mode" / "الوضع الداكن"

## 🎨 RTL Support

Arabic automatically enables RTL (Right-to-Left) layout:

```typescript
import { I18nManager } from 'react-native';

// Check if RTL is enabled
const isRTL = I18nManager.isRTL;

// Force RTL (done automatically for Arabic)
I18nManager.forceRTL(true);
```

## 🔄 Changing Language

### Programmatically:
```typescript
import { changeLanguage } from './i18n';

// Switch to Arabic
await changeLanguage('ar');

// Switch to English
await changeLanguage('en');
```

### Via UI:
Use the `LanguageSwitcher` component in settings.

## 📱 Example Usage

### Login Screen:
```typescript
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
    const { t } = useTranslation();
    
    return (
        <>
            <Text>{t('auth.welcomeBack')}</Text>
            <TextInput placeholder={t('auth.email')} />
            <TextInput placeholder={t('auth.password')} />
            <Button title={t('auth.login')} />
        </>
    );
}
```

### Reports Screen:
```typescript
const { t } = useTranslation();

<Text>{t('reports.submitReport')}</Text>
<TextInput placeholder={t('reports.enterLocation')} />
```

## 🌟 Features

✅ **Automatic RTL** - Arabic text flows right-to-left
✅ **Persistent** - Language choice saved
✅ **Type-safe** - Full TypeScript support
✅ **Easy to extend** - Add more languages easily
✅ **Fallback** - Defaults to English if translation missing

## 🔧 Adding More Languages

1. Create new translation file: `locales/fr.json`
2. Add to i18n config:
```typescript
import fr from './locales/fr.json';

resources: {
    en: { translation: en },
    ar: { translation: ar },
    fr: { translation: fr }, // Add here
}
```
3. Add to LanguageSwitcher component

## 📊 Translation Coverage

All app sections are translated:
- ✅ Authentication (Login/Signup)
- ✅ Navigation (Tabs)
- ✅ Home Screen
- ✅ Reports
- ✅ Profile
- ✅ Settings
- ✅ Common UI elements

## 🚀 Next Steps

1. Install dependencies: `npm install`
2. Import i18n in app layout
3. Add LanguageSwitcher to settings
4. Replace hardcoded text with `t()` function
5. Test language switching
6. Restart app to see RTL in action

## 💡 Tips

- **RTL requires app restart** for full effect
- **Test on device** for best RTL experience
- **Use semantic keys** like `auth.login` not `loginButton`
- **Keep translations consistent** across screens

Enjoy multilingual support! 🌍
