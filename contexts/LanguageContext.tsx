import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { I18nManager, Platform } from 'react-native';
import ar from '../locales/ar.json';
import en from '../locales/en.json';

const LANGUAGE_KEY = '@app_language';

type Translations = typeof en;

const translations: { [key: string]: Translations } = {
    en,
    ar,
};

// Translation function
const translate = (key: string, lang: string): string => {
    const keys = key.split('.');
    let value: any = translations[lang];

    for (const k of keys) {
        value = value?.[k];
    }

    return value || key;
};

// Context type
interface LanguageContextType {
    language: string;
    t: (key: string) => string;
    changeLanguage: (lang: string) => Promise<void>;
    isRTL: boolean;
}

// Create context
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Provider component
export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState('en');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadLanguage();
    }, []);

    const loadLanguage = async () => {
        try {
            const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
            if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ar')) {
                setLanguage(savedLanguage);
                if (savedLanguage === 'ar' && Platform.OS !== 'web') {
                    I18nManager.forceRTL(true);
                }
            }
        } catch (error) {
            console.error('Error loading language:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const changeLanguage = async (newLanguage: string) => {
        try {
            await AsyncStorage.setItem(LANGUAGE_KEY, newLanguage);
            setLanguage(newLanguage);

            if (Platform.OS !== 'web') {
                const isRTL = newLanguage === 'ar';
                if (I18nManager.isRTL !== isRTL) {
                    I18nManager.forceRTL(isRTL);
                }
            }
        } catch (error) {
            console.error('Error changing language:', error);
        }
    };

    const t = (key: string): string => translate(key, language);
    const isRTL = language === 'ar';

    if (isLoading) {
        return null;
    }

    return (
        <LanguageContext.Provider value={{ language, t, changeLanguage, isRTL }}>
            {children}
        </LanguageContext.Provider>
    );
}

// Hook to use translations
export function useTranslation() {
    const context = useContext(LanguageContext);

    if (!context) {
        return {
            t: (key: string) => translate(key, 'en'),
            locale: 'en',
            i18n: {
                language: 'en',
                changeLanguage: async () => { },
            },
        };
    }

    return {
        t: context.t,
        locale: context.language,
        i18n: {
            language: context.language,
            changeLanguage: context.changeLanguage,
        },
    };
}

export default LanguageProvider;
