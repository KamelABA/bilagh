import { useTranslation } from '@/hooks/useTranslation';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { IconSymbol } from './ui/icon-symbol';

interface LanguageSwitcherProps {
    isDark?: boolean;
}

export default function LanguageSwitcher({ isDark = false }: LanguageSwitcherProps) {
    const { t, i18n } = useTranslation();
    const currentLanguage = i18n.language;

    const handleLanguageChange = async (language: string) => {
        if (language === currentLanguage) return;

        Alert.alert(
            t('settings.language'),
            language === 'ar'
                ? 'سيتم تغيير اللغة إلى العربية'
                : 'Language will be changed to English',
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.done'),
                    onPress: async () => {
                        await i18n.changeLanguage(language);
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[
                    styles.languageButton,
                    { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
                    currentLanguage === 'en' && styles.activeButton,
                ]}
                onPress={() => handleLanguageChange('en')}
            >
                <IconSymbol
                    name="globe"
                    size={20}
                    color={currentLanguage === 'en' ? '#0B5394' : (isDark ? '#999' : '#666')}
                />
                <Text
                    style={[
                        styles.languageText,
                        { color: currentLanguage === 'en' ? '#0B5394' : (isDark ? '#999' : '#666') },
                    ]}
                >
                    English
                </Text>
                {currentLanguage === 'en' && (
                    <IconSymbol name="checkmark.circle.fill" size={20} color="#0B5394" />
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.languageButton,
                    { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
                    currentLanguage === 'ar' && styles.activeButton,
                ]}
                onPress={() => handleLanguageChange('ar')}
            >
                <IconSymbol
                    name="globe"
                    size={20}
                    color={currentLanguage === 'ar' ? '#0B5394' : (isDark ? '#999' : '#666')}
                />
                <Text
                    style={[
                        styles.languageText,
                        { color: currentLanguage === 'ar' ? '#0B5394' : (isDark ? '#999' : '#666') },
                    ]}
                >
                    العربية
                </Text>
                {currentLanguage === 'ar' && (
                    <IconSymbol name="checkmark.circle.fill" size={20} color="#0B5394" />
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    languageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    activeButton: {
        borderWidth: 2,
        borderColor: '#0B5394',
    },
    languageText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
});
