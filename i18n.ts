import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, Platform } from 'react-native';
import en from './locales/en.json';
import ar from './locales/ar.json';

const LANGUAGE_KEY = '@app_language';

type Translations = typeof en;

class SimpleI18n {
    private currentLanguage: string = 'en';
    private translations: { [key: string]: Translations } = {
        en,
        ar,
    };
    private initialized: boolean = false;

    async init() {
        if (this.initialized) return;
        
        try {
            const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
            if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ar')) {
                this.currentLanguage = savedLanguage;
                if (savedLanguage === 'ar' && Platform.OS !== 'web') {
                    I18nManager.forceRTL(true);
                }
            }
            this.initialized = true;
        } catch (error) {
            console.error('Error loading language:', error);
            this.initialized = true;
        }
    }

    t(key: string): string {
        const keys = key.split('.');
        let value: any = this.translations[this.currentLanguage];
        
        for (const k of keys) {
            value = value?.[k];
        }
        
        return value || key;
    }

    async changeLanguage(language: string) {
        try {
            await AsyncStorage.setItem(LANGUAGE_KEY, language);
            this.currentLanguage = language;
            
            if (Platform.OS !== 'web') {
                const isRTL = language === 'ar';
                if (I18nManager.isRTL !== isRTL) {
                    I18nManager.forceRTL(isRTL);
                }
            }
        } catch (error) {
            console.error('Error changing language:', error);
        }
    }

    get language() {
        return this.currentLanguage;
    }

    get isRTL() {
        return this.currentLanguage === 'ar';
    }
}

export const i18n = new SimpleI18n();

export default i18n;
