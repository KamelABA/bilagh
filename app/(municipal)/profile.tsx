import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function MunicipalProfileScreen() {
    const colorScheme = useColorScheme();
    const { t, locale, i18n } = useTranslation();
    const router = useRouter();
    const isDark = colorScheme === 'dark';

    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        loadUserInfo();
    }, []);

    const loadUserInfo = async () => {
        try {
            const name = await AsyncStorage.getItem('userName');
            const email = await AsyncStorage.getItem('userEmail');
            setUserName(name || 'Municipal Authority');
            setUserEmail(email || 'municipal@bilagh.dz');
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            t('profile.logout'),
            t('profile.logoutConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('profile.logout'),
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.multiRemove([
                            'userToken',
                            'userRole',
                            'userName',
                            'userEmail'
                        ]);
                        router.replace('/login');
                    },
                },
            ]
        );
    };

    const toggleLanguage = async () => {
        await i18n.changeLanguage(locale === 'en' ? 'ar' : 'en');
    };

    const MenuItem = ({ icon, title, value, onPress, danger }: any) => (
        <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
            onPress={onPress}
            disabled={!onPress}
        >
            <View style={[styles.menuIcon, { backgroundColor: danger ? '#FF4B2B20' : '#0B539420' }]}>
                <IconSymbol name={icon} size={20} color={danger ? '#FF4B2B' : '#0B5394'} />
            </View>
            <Text style={[styles.menuTitle, { color: danger ? '#FF4B2B' : isDark ? '#fff' : '#000' }]}>
                {title}
            </Text>
            {value && (
                <Text style={[styles.menuValue, { color: isDark ? '#999' : '#666' }]}>{value}</Text>
            )}
            {onPress && (
                <IconSymbol name="chevron.right" size={16} color={isDark ? '#666' : '#999'} />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
            {/* Header */}
            <LinearGradient
                colors={isDark ? ['#1a1a1a', '#0a0a0a'] : ['#0B5394', '#4A7C2C']}
                style={styles.header}
            >
                <View style={styles.profileSection}>
                    <View style={styles.avatar}>
                        <IconSymbol name="building.2.fill" size={40} color="#fff" />
                    </View>
                    <Text style={styles.userName}>{userName}</Text>
                    <Text style={styles.userEmail}>{userEmail}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{t('municipal.authority')}</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView style={styles.content}>
                {/* Settings Section */}
                <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
                    {t('settings.settings')}
                </Text>

                <MenuItem
                    icon="globe"
                    title={t('settings.language')}
                    value={locale === 'en' ? 'English' : 'العربية'}
                    onPress={toggleLanguage}
                />

                <MenuItem
                    icon="bell.fill"
                    title={t('settings.notifications')}
                    value={t('settings.enabled')}
                />

                {/* Account Section */}
                <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000', marginTop: 24 }]}>
                    {t('profile.account')}
                </Text>

                <MenuItem
                    icon="rectangle.portrait.and.arrow.right"
                    title={t('profile.logout')}
                    onPress={handleLogout}
                    danger
                />

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    profileSection: {
        alignItems: 'center',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    userName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    userEmail: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginTop: 4,
    },
    roleBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        marginTop: 12,
    },
    roleText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 24,
        marginBottom: 12,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    menuValue: {
        fontSize: 14,
        marginRight: 8,
    },
});
