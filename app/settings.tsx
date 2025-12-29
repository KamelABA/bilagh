import LanguageSwitcher from '@/components/LanguageSwitcher';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function SettingsScreen() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const { t, locale } = useTranslation();
    const isDark = colorScheme === 'dark';

    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [locationEnabled, setLocationEnabled] = useState(true);
    const [darkModeEnabled, setDarkModeEnabled] = useState(isDark);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const handleLogout = async () => {
        Alert.alert(
            t('settings.logout'),
            t('settings.logoutConfirm'),
            [
                { text: t('settings.cancel'), style: 'cancel' },
                {
                    text: t('settings.logout'),
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.clear();
                        router.replace('/login');
                    },
                },
            ]
        );
    };

    const settingsSections = [
        {
            titleKey: 'settings.permissions',
            items: [
                {
                    labelKey: 'settings.notifications',
                    icon: 'bell.fill',
                    color: '#0B5394',
                    type: 'toggle',
                    value: notificationsEnabled,
                    onToggle: setNotificationsEnabled,
                },
                {
                    labelKey: 'settings.locationServices',
                    icon: 'location.fill',
                    color: '#4A7C2C',
                    type: 'toggle',
                    value: locationEnabled,
                    onToggle: setLocationEnabled,
                },
                {
                    labelKey: 'settings.cameraAccess',
                    icon: 'camera.fill',
                    color: '#FF6B6B',
                    type: 'link',
                },
            ],
        },
        {
            titleKey: 'settings.preferences',
            items: [
                {
                    labelKey: 'settings.darkMode',
                    icon: 'moon.fill',
                    color: '#FFE66D',
                    type: 'toggle',
                    value: darkModeEnabled,
                    onToggle: setDarkModeEnabled,
                },
                {
                    labelKey: 'settings.soundEffects',
                    icon: 'speaker.fill',
                    color: '#4ECDC4',
                    type: 'toggle',
                    value: soundEnabled,
                    onToggle: setSoundEnabled,
                },
            ],
        },
        {
            titleKey: 'settings.privacySecurity',
            items: [
                {
                    labelKey: 'settings.privacySettings',
                    icon: 'hand.raised.fill',
                    color: '#FF8E53',
                    type: 'link',
                },
                {
                    labelKey: 'settings.changePassword',
                    icon: 'lock.fill',
                    color: '#764ba2',
                    type: 'link',
                },
                {
                    labelKey: 'settings.dataStorage',
                    icon: 'internaldrive.fill',
                    color: '#56AB91',
                    type: 'link',
                },
            ],
        },
        {
            titleKey: 'settings.about',
            items: [
                {
                    labelKey: 'settings.appVersion',
                    icon: 'info.circle.fill',
                    color: '#667eea',
                    type: 'info',
                    value: '1.0.0',
                },
                {
                    labelKey: 'settings.termsOfService',
                    icon: 'doc.text.fill',
                    color: '#0B5394',
                    type: 'link',
                },
                {
                    labelKey: 'settings.privacyPolicy',
                    icon: 'shield.fill',
                    color: '#4A7C2C',
                    type: 'link',
                },
            ],
        },
    ];

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
            {/* Header */}
            <LinearGradient
                colors={isDark ? ['#1a1a1a', '#0a0a0a'] : ['#0B5394', '#4A7C2C']}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <IconSymbol name="chevron.left" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('settings.settings')}</Text>
                    <View style={styles.placeholder} />
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Language Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
                        {t('settings.language')}
                    </Text>
                    <LanguageSwitcher isDark={isDark} />
                </View>

                {settingsSections.map((section, sectionIndex) => (
                    <View key={sectionIndex} style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
                            {t(section.titleKey)}
                        </Text>
                        <View
                            style={[
                                styles.settingsCard,
                                { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
                            ]}
                        >
                            {section.items.map((item, itemIndex) => (
                                <React.Fragment key={itemIndex}>
                                    <View style={styles.settingItem}>
                                        <View style={styles.settingLeft}>
                                            <View style={[styles.settingIcon, { backgroundColor: item.color + '20' }]}>
                                                <IconSymbol name={item.icon as any} size={20} color={item.color} />
                                            </View>
                                            <Text style={[styles.settingLabel, { color: isDark ? '#fff' : '#000' }]}>
                                                {t(item.labelKey)}
                                            </Text>
                                        </View>
                                        <View style={styles.settingRight}>
                                            {item.type === 'toggle' && (
                                                <Switch
                                                    value={item.value as boolean}
                                                    onValueChange={item.onToggle as (value: boolean) => void}
                                                    trackColor={{ false: '#767577', true: item.color }}
                                                    thumbColor={(item.value as boolean) ? '#fff' : '#f4f3f4'}
                                                />
                                            )}
                                            {item.type === 'link' && (
                                                <>
                                                    {item.value && (
                                                        <Text style={[styles.settingValue, { color: isDark ? '#999' : '#666' }]}>
                                                            {item.value}
                                                        </Text>
                                                    )}
                                                    <IconSymbol name="chevron.right" size={16} color={isDark ? '#999' : '#666'} />
                                                </>
                                            )}
                                            {item.type === 'info' && item.value && (
                                                <Text style={[styles.settingValue, { color: isDark ? '#999' : '#666' }]}>
                                                    {item.value}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                    {itemIndex < section.items.length - 1 && (
                                        <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                                    )}
                                </React.Fragment>
                            ))}
                        </View>
                    </View>
                ))}

                {/* Logout Button */}
                <View style={styles.section}>
                    <TouchableOpacity onPress={handleLogout} activeOpacity={0.8}>
                        <LinearGradient
                            colors={['#0B5394', '#4A7C2C']}
                            style={styles.logoutButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <IconSymbol name="arrow.right.square.fill" size={20} color="#fff" />
                            <Text style={styles.logoutText}>{t('settings.logout')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Danger Zone */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: '#FF6B6B' }]}>
                        {t('settings.dangerZone')}
                    </Text>
                    <TouchableOpacity
                        style={[styles.dangerButton, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
                        activeOpacity={0.7}
                    >
                        <IconSymbol name="trash.fill" size={20} color="#FF6B6B" />
                        <Text style={styles.dangerText}>{t('settings.clearAllData')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: isDark ? '#666' : '#999' }]}>
                        {t('settings.footerTitle')}
                    </Text>
                    <Text style={[styles.footerText, { color: isDark ? '#666' : '#999' }]}>
                        {t('settings.footerCopyright')}
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
    },
    section: {
        paddingHorizontal: 20,
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    settingsCard: {
        borderRadius: 16,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    settingValue: {
        fontSize: 14,
    },
    divider: {
        height: 1,
        marginHorizontal: 12,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        gap: 8,
    },
    logoutText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FF6B6B',
        gap: 8,
    },
    dangerText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FF6B6B',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    footerText: {
        fontSize: 12,
        marginBottom: 4,
    },
});
