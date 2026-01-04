import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import { apiService } from '@/services/api';
import { User } from '@/types/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function AgentProfileScreen() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const { t, locale } = useTranslation();
    const isDark = colorScheme === 'dark';
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Agent-specific stats (could be fetched from API later)
    const agentStats = {
        totalVerifications: 47,
        thisMonth: 12,
        approvalRate: 96,
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const userData = await apiService.getCurrentUser();
            setUser(userData);
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name: string | null) => {
        if (!name) return '??';
        const names = name.split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const handleLogout = () => {
        Alert.alert(
            t('common.logout'),
            t('auth.logoutConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.logout'),
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.removeItem('userToken');
                        await AsyncStorage.removeItem('userEmail');
                        await AsyncStorage.removeItem('userRole');
                        router.replace('/login');
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5', justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={{ color: isDark ? '#fff' : '#000', marginTop: 16 }}>{t('profile.loadingProfile')}</Text>
            </View>
        );
    }

    const stats = [
        { label: t('agent.totalVerifications'), value: agentStats.totalVerifications.toString(), icon: 'checkmark.circle.fill', color: '#4ECDC4' },
        { label: t('agent.thisMonth'), value: agentStats.thisMonth.toString(), icon: 'calendar', color: '#667eea' },
        { label: t('agent.approvalRate'), value: `${agentStats.approvalRate}%`, icon: 'star.fill', color: '#FFE66D' },
    ];

    return (
        <ScrollView style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
            {/* Header */}
            <LinearGradient
                colors={isDark ? ['#1a1a1a', '#0a0a0a'] : ['#667eea', '#764ba2']}
                style={styles.header}
            >
                <View style={styles.profileHeader}>
                    <TouchableOpacity
                        style={styles.settingsButton}
                        onPress={() => router.push('/settings')}
                    >
                        <IconSymbol name="gear" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <LinearGradient
                            colors={['#4ECDC4', '#667eea']}
                            style={styles.avatarGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Text style={styles.avatarText}>{getInitials(user?.full_name || null)}</Text>
                        </LinearGradient>
                        <View style={styles.verifiedBadge}>
                            <IconSymbol name="checkmark.shield.fill" size={16} color="#fff" />
                        </View>
                    </View>
                    <Text style={styles.userName}>{user?.full_name || t('agent.fieldAgent')}</Text>
                    <Text style={styles.userEmail}>{user?.email || ''}</Text>
                    <View style={styles.roleBadge}>
                        <IconSymbol name="shield.fill" size={14} color="#fff" />
                        <Text style={styles.roleText}>{t('agent.fieldAgent')}</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Stats */}
            <View style={styles.statsContainer}>
                {stats.map((stat, index) => (
                    <View
                        key={index}
                        style={[
                            styles.statCard,
                            { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
                        ]}
                    >
                        <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                            <IconSymbol name={stat.icon as any} size={24} color={stat.color} />
                        </View>
                        <Text style={[styles.statValue, { color: isDark ? '#fff' : '#000' }]}>
                            {stat.value}
                        </Text>
                        <Text style={[styles.statLabel, { color: isDark ? '#999' : '#666' }]}>
                            {stat.label}
                        </Text>
                    </View>
                ))}
            </View>

            {/* User Info Card */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
                    {t('profile.accountInfo')}
                </Text>
                <View
                    style={[
                        styles.infoCard,
                        { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
                    ]}
                >
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: isDark ? '#999' : '#666' }]}>
                            {t('profile.fullName')}
                        </Text>
                        <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>
                            {user?.full_name || t('common.notSet')}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: isDark ? '#999' : '#666' }]}>
                            {t('profile.username')}
                        </Text>
                        <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>
                            {user?.username || t('common.notSet')}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: isDark ? '#999' : '#666' }]}>
                            {t('profile.email')}
                        </Text>
                        <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>
                            {user?.email || t('common.notSet')}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: isDark ? '#999' : '#666' }]}>
                            {t('profile.phone')}
                        </Text>
                        <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>
                            {user?.phone || t('common.notSet')}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: isDark ? '#999' : '#666' }]}>
                            {t('profile.role')}
                        </Text>
                        <Text style={[styles.infoValue, { color: '#667eea' }]}>
                            {t('agent.fieldAgent')}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: isDark ? '#999' : '#666' }]}>
                            {t('profile.userId')}
                        </Text>
                        <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>
                            #{user?.id || '0'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: isDark ? '#999' : '#666' }]}>
                            {t('profile.memberSince')}
                        </Text>
                        <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>
                            {user?.created_at ? new Date(user.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            }) : t('common.unknown')}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Agent Department Info */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
                    {t('agent.department')}
                </Text>
                <View
                    style={[
                        styles.infoCard,
                        { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
                    ]}
                >
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: isDark ? '#999' : '#666' }]}>
                            {t('agent.department')}
                        </Text>
                        <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>
                            {t('agent.roadMaintenance')}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: isDark ? '#999' : '#666' }]}>
                            {t('agent.region')}
                        </Text>
                        <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>
                            Algiers, Algeria
                        </Text>
                    </View>
                </View>
            </View>

            {/* Recent Activity Section */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
                    {t('agent.recentActivity')}
                </Text>
                <View
                    style={[
                        styles.notificationsCard,
                        { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
                    ]}
                >
                    <View style={styles.notificationItem}>
                        <View style={[styles.notificationIcon, { backgroundColor: '#4ECDC420' }]}>
                            <IconSymbol name="checkmark.circle.fill" size={24} color="#4ECDC4" />
                        </View>
                        <View style={styles.notificationContent}>
                            <Text style={[styles.notificationTitle, { color: isDark ? '#fff' : '#000' }]}>
                                {t('agent.reportVerified')}
                            </Text>
                            <Text style={[styles.notificationText, { color: isDark ? '#999' : '#666' }]}>
                                {t('agent.verifiedPotholeReport')}
                            </Text>
                            <Text style={[styles.notificationTime, { color: isDark ? '#666' : '#999' }]}>
                                2 {t('profile.hoursAgo')}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                    <View style={styles.notificationItem}>
                        <View style={[styles.notificationIcon, { backgroundColor: '#667eea20' }]}>
                            <IconSymbol name="location.fill" size={24} color="#667eea" />
                        </View>
                        <View style={styles.notificationContent}>
                            <Text style={[styles.notificationTitle, { color: isDark ? '#fff' : '#000' }]}>
                                {t('agent.siteVisit')}
                            </Text>
                            <Text style={[styles.notificationText, { color: isDark ? '#999' : '#666' }]}>
                                {t('agent.completedSiteInspection')}
                            </Text>
                            <Text style={[styles.notificationTime, { color: isDark ? '#666' : '#999' }]}>
                                1 {t('profile.dayAgo')}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                    <View style={styles.notificationItem}>
                        <View style={[styles.notificationIcon, { backgroundColor: '#FFE66D20' }]}>
                            <IconSymbol name="star.fill" size={24} color="#FFE66D" />
                        </View>
                        <View style={styles.notificationContent}>
                            <Text style={[styles.notificationTitle, { color: isDark ? '#fff' : '#000' }]}>
                                {t('agent.ratingReceived')}
                            </Text>
                            <Text style={[styles.notificationText, { color: isDark ? '#999' : '#666' }]}>
                                {t('agent.receivedPositiveRating')}
                            </Text>
                            <Text style={[styles.notificationTime, { color: isDark ? '#666' : '#999' }]}>
                                3 {t('profile.daysAgo')}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Logout Button */}
            <View style={styles.section}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color="#FF4B2B" />
                    <Text style={styles.logoutText}>{t('common.logout')}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={[styles.footerText, { color: isDark ? '#666' : '#999' }]}>
                    {t('common.appName')} {t('profile.version')}
                </Text>
                <Text style={[styles.footerText, { color: isDark ? '#666' : '#999' }]}>
                    {t('profile.copyright')}
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    profileHeader: {
        alignItems: 'flex-end',
        marginBottom: 20,
    },
    settingsButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileSection: {
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#fff',
    },
    avatarText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#4ECDC4',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.8,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginTop: 12,
    },
    roleText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginTop: -20,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        marginHorizontal: 5,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    statIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        textAlign: 'center',
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    infoCard: {
        borderRadius: 16,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    infoItem: {
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
    },
    infoValue: {
        fontSize: 16,
    },
    divider: {
        height: 1,
        marginHorizontal: 12,
    },
    notificationsCard: {
        borderRadius: 16,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 12,
    },
    notificationIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    notificationText: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 4,
    },
    notificationTime: {
        fontSize: 12,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#FF4B2B10',
    },
    logoutText: {
        color: '#FF4B2B',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    footerText: {
        fontSize: 12,
        marginBottom: 4,
    },
});
