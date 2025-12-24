import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiService } from '@/services/api';
import { User } from '@/types/backend';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function ProfileScreen() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const isDark = colorScheme === 'dark';
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [reportCount, setReportCount] = useState(0);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const userData = await apiService.getCurrentUser();
            setUser(userData);

            // Fetch user's reports count
            const reports = await apiService.getReports();
            setReportCount(reports.length);
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

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5', justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#0B5394" />
                <Text style={{ color: isDark ? '#fff' : '#000', marginTop: 16 }}>Loading profile...</Text>
            </View>
        );
    }

    const stats = [
        { label: 'Reports', value: reportCount.toString(), icon: 'doc.text.fill', color: '#FF6B6B' },
        { label: 'Points', value: user?.points.toString() || '0', icon: 'star.fill', color: '#FFE66D' },
        { label: 'Role', value: user?.role === 'admin' ? 'Admin' : 'User', icon: 'person.circle.fill', color: '#4ECDC4' },
    ];

    return (
        <ScrollView style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
            {/* Header */}
            <LinearGradient
                colors={isDark ? ['#1a1a1a', '#0a0a0a'] : ['#0B5394', '#4A7C2C']}
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
                            colors={['#FF6B6B', '#4ECDC4']}
                            style={styles.avatarGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Text style={styles.avatarText}>{getInitials(user?.full_name || null)}</Text>
                        </LinearGradient>
                        <TouchableOpacity style={styles.editAvatarButton}>
                            <IconSymbol name="camera.fill" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
                    <Text style={styles.userEmail}>{user?.email || ''}</Text>
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
                    Account Information
                </Text>
                <View
                    style={[
                        styles.infoCard,
                        { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
                    ]}
                >
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: isDark ? '#999' : '#666' }]}>
                            Full Name
                        </Text>
                        <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>
                            {user?.full_name || 'Not set'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: isDark ? '#999' : '#666' }]}>
                            Username
                        </Text>
                        <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>
                            {user?.username || 'Not set'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: isDark ? '#999' : '#666' }]}>
                            Email
                        </Text>
                        <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>
                            {user?.email || 'Not set'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: isDark ? '#999' : '#666' }]}>
                            Phone
                        </Text>
                        <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>
                            {user?.phone || 'Not set'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: isDark ? '#999' : '#666' }]}>
                            User ID
                        </Text>
                        <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>
                            #{user?.id || '0'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: isDark ? '#999' : '#666' }]}>
                            Member Since
                        </Text>
                        <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>
                            {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            }) : 'Unknown'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Notifications Section */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
                    Recent Notifications
                </Text>
                <View
                    style={[
                        styles.notificationsCard,
                        { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
                    ]}
                >
                    <View style={styles.notificationItem}>
                        <View style={[styles.notificationIcon, { backgroundColor: '#0B539420' }]}>
                            <IconSymbol name="checkmark.circle.fill" size={24} color="#0B5394" />
                        </View>
                        <View style={styles.notificationContent}>
                            <Text style={[styles.notificationTitle, { color: isDark ? '#fff' : '#000' }]}>
                                Report Approved
                            </Text>
                            <Text style={[styles.notificationText, { color: isDark ? '#999' : '#666' }]}>
                                Your pothole report on Main St has been verified
                            </Text>
                            <Text style={[styles.notificationTime, { color: isDark ? '#666' : '#999' }]}>
                                2 hours ago
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                    <View style={styles.notificationItem}>
                        <View style={[styles.notificationIcon, { backgroundColor: '#4A7C2C20' }]}>
                            <IconSymbol name="star.fill" size={24} color="#4A7C2C" />
                        </View>
                        <View style={styles.notificationContent}>
                            <Text style={[styles.notificationTitle, { color: isDark ? '#fff' : '#000' }]}>
                                Points Earned
                            </Text>
                            <Text style={[styles.notificationText, { color: isDark ? '#999' : '#666' }]}>
                                You earned 50 points for your contribution
                            </Text>
                            <Text style={[styles.notificationTime, { color: isDark ? '#666' : '#999' }]}>
                                1 day ago
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                    <View style={styles.notificationItem}>
                        <View style={[styles.notificationIcon, { backgroundColor: '#FFE66D20' }]}>
                            <IconSymbol name="exclamationmark.triangle.fill" size={24} color="#FFE66D" />
                        </View>
                        <View style={styles.notificationContent}>
                            <Text style={[styles.notificationTitle, { color: isDark ? '#fff' : '#000' }]}>
                                New Damage Nearby
                            </Text>
                            <Text style={[styles.notificationText, { color: isDark ? '#999' : '#666' }]}>
                                Road damage reported 0.5km from your location
                            </Text>
                            <Text style={[styles.notificationTime, { color: isDark ? '#666' : '#999' }]}>
                                3 days ago
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.footer}>
                <Text style={[styles.footerText, { color: isDark ? '#666' : '#999' }]}>
                    Bilagh v1.0.0
                </Text>
                <Text style={[styles.footerText, { color: isDark ? '#666' : '#999' }]}>
                    © 2025 Road Damage Detector
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
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#667eea',
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
        fontSize: 12,
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
    settingsCard: {
        borderRadius: 16,
        padding: 16,
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
        paddingVertical: 8,
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
    menuCard: {
        borderRadius: 16,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    menuRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuValue: {
        fontSize: 14,
        marginRight: 8,
    },
    divider: {
        height: 1,
        marginHorizontal: 12,
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
    footer: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    footerText: {
        fontSize: 12,
        marginBottom: 4,
    },
});
