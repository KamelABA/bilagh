import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_ENDPOINTS } from '@/constants/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

interface Stats {
    total: number;
    pending: number;
    verified: number;
    approved: number;
    rejected: number;
    assigned: number;
    in_progress: number;
    resolved: number;
}

export default function MunicipalDashboard() {
    const colorScheme = useColorScheme();
    const { t } = useTranslation();
    const router = useRouter();
    const isDark = colorScheme === 'dark';

    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userName, setUserName] = useState('');

    const fetchStats = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const name = await AsyncStorage.getItem('userName');
            setUserName(name || 'Municipal Authority');

            const response = await fetch(API_ENDPOINTS.MUNICIPAL_STATS, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchStats();
    }, [fetchStats]);

    const StatCard = ({ title, value, color, icon }: { title: string; value: number; color: string; icon: string }) => (
        <View style={[styles.statCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
                <Text style={{ fontSize: 20 }}>{icon}</Text>
            </View>
            <Text style={[styles.statValue, { color: isDark ? '#fff' : '#000' }]}>{value}</Text>
            <Text style={[styles.statTitle, { color: isDark ? '#999' : '#666' }]}>{title}</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
                <ActivityIndicator size="large" color="#0B5394" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
            {/* Header */}
            <LinearGradient
                colors={isDark ? ['#1a1a1a', '#0a0a0a'] : ['#0B5394', '#4A7C2C']}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <View style={styles.headerLeft}>
                        <View style={styles.iconContainer}>
                            <IconSymbol name="building.2.fill" size={32} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.greeting}>{t('municipal.welcome')}</Text>
                            <Text style={styles.userName}>{userName}</Text>
                            <Text style={styles.subtitle}>{t('municipal.authority')}</Text>
                        </View>
                    </View>
                    <View style={styles.headerBadge}>
                        <IconSymbol name="mappin.circle.fill" size={24} color="#fff" />
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0B5394']} />
                }
            >
                {/* Quick Actions */}
                <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
                    {t('municipal.quickActions')}
                </Text>
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
                        onPress={() => router.push('/(municipal)/complaints')}
                    >
                        <LinearGradient
                            colors={['#0B5394', '#075A9E']}
                            style={styles.actionIcon}
                        >
                            <IconSymbol name="checkmark.shield.fill" size={24} color="#fff" />
                        </LinearGradient>
                        <Text style={[styles.actionTitle, { color: isDark ? '#fff' : '#000' }]}>
                            {t('municipal.reviewComplaints')}
                        </Text>
                        <Text style={[styles.actionCount, { color: '#0B5394' }]}>
                            {stats?.verified || 0} {t('municipal.pending')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
                        onPress={() => router.push('/(municipal)/agents')}
                    >
                        <LinearGradient
                            colors={['#4A7C2C', '#2D5016']}
                            style={styles.actionIcon}
                        >
                            <IconSymbol name="person.fill" size={24} color="#fff" />
                        </LinearGradient>
                        <Text style={[styles.actionTitle, { color: isDark ? '#fff' : '#000' }]}>
                            {t('municipal.assignTasks')}
                        </Text>
                        <Text style={[styles.actionCount, { color: '#4A7C2C' }]}>
                            {stats?.approved || 0} {t('municipal.toAssign')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Statistics */}
                <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
                    {t('municipal.statistics')}
                </Text>
                <View style={styles.statsGrid}>
                    <StatCard title={t('municipal.total')} value={stats?.total || 0} color="#0B5394" icon="📊" />
                    <StatCard title={t('municipal.pendingReview')} value={stats?.pending || 0} color="#FFD200" icon="⏳" />
                    <StatCard title={t('municipal.verified')} value={stats?.verified || 0} color="#0B5394" icon="✅" />
                    <StatCard title={t('municipal.approved')} value={stats?.approved || 0} color="#4A7C2C" icon="👍" />
                    <StatCard title={t('municipal.rejected')} value={stats?.rejected || 0} color="#FF4B2B" icon="❌" />
                    <StatCard title={t('municipal.assigned')} value={stats?.assigned || 0} color="#4A7C2C" icon="👷" />
                    <StatCard title={t('municipal.inProgress')} value={stats?.in_progress || 0} color="#FF6B6B" icon="🔧" />
                    <StatCard title={t('municipal.resolved')} value={stats?.resolved || 0} color="#4A7C2C" icon="✨" />
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    greeting: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
    },
    userName: {
        color: '#fff',
        fontSize: 26,
        fontWeight: 'bold',
        marginTop: 4,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        marginTop: 2,
    },
    headerBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        marginTop: -20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 24,
        marginBottom: 16,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    actionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    actionCount: {
        fontSize: 12,
        fontWeight: '500',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statCard: {
        width: (width - 52) / 2,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    statTitle: {
        fontSize: 12,
        marginTop: 4,
    },
});
