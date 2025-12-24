import { useTranslation } from '@/hooks/useTranslation';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function QuickLanguageToggle() {
    const { t, i18n } = useTranslation();

    const toggleLanguage = async () => {
        const newLang = i18n.language === 'en' ? 'ar' : 'en';
        await i18n.changeLanguage(newLang);
    };

    return (
        <TouchableOpacity
            style={styles.button}
            onPress={toggleLanguage}
        >
            <Text style={styles.text}>
                {i18n.language === 'en' ? '🇸🇦 العربية' : '🇬🇧 English'}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#0B5394',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    text: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
