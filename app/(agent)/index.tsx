import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

interface Task {
    id: number;
    reportId: number;
    type: string;
    location: string;
    severity: 'low' | 'medium' | 'high';
    distance: string;
    priority: 'normal' | 'urgent';
}

export default function AgentHomeScreen() {
    const colorScheme = useColorScheme();
    const { t } = useTranslation();
    const router = useRouter();
    const isDark = colorScheme === 'dark';

    // Sample tasks for the agent
    const pendingTasks: Task[] = [
        {
            id: 1,
            reportId: 101,
            type: 'Pothole',
            location: 'Main Street, Downtown',
            severity: 'high',
            distance: '0.5 km',
            priority: 'urgent',
        },
        {
            id: 2,
            reportId: 102,
            type: 'Crack',
            location: 'Oak Avenue',
            severity: 'medium',
            distance: '1.2 km',
            priority: 'normal',
        },
        {
            id: 3,
            reportId: 103,
            type: 'Pothole',
            location: 'Park Road',
            severity: 'low',
            distance: '2.0 km',
            priority: 'normal',
        },
    ];

    const stats = {
        pendingVerifications: 5,
        completedToday: 3,
        totalCompleted: 47,
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return '#FF4B2B';
            case 'medium': return '#FFD200';
            case 'low': return '#4ECDC4';
            default: return '#999';
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
            {/* Header */}
            <LinearGradient
                colors={isDark ? ['#1a1a1a', '#0a0a0a'] : ['#0B5394', '#4A7C2C']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.greeting}>{t('agent.welcome')}</Text>
                        <Text style={styles.agentName}>{t('agent.fieldAgent')}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>{t('agent.onDuty')}</Text>
                    </View>
                </View>

                {/* Stats Cards */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.pendingVerifications}</Text>
                        <Text style={styles.statLabel}>{t('agent.pending')}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.completedToday}</Text>
                        <Text style={styles.statLabel}>{t('agent.today')}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.totalCompleted}</Text>
                        <Text style={styles.statLabel}>{t('agent.total')}</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
                        {t('agent.quickActions')}
                    </Text>
                    <View style={styles.actionsGrid}>
                        <TouchableOpacity
                            style={[styles.actionCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
                            onPress={() => router.push('/(agent)/verification')}
                        >
                            <LinearGradient
                                colors={['#0B5394', '#075A9E']}
                                style={styles.actionIcon}
                            >
                                <IconSymbol name="checkmark.shield.fill" size={24} color="#fff" />
                            </LinearGradient>
                            <Text style={[styles.actionText, { color: isDark ? '#fff' : '#000' }]}>
                                {t('agent.startVerification')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
                            onPress={() => router.push('/(agent)/map')}
                        >
                            <LinearGradient
                                colors={['#4A7C2C', '#2D5016']}
                                style={styles.actionIcon}
                            >
                                <IconSymbol name="map.fill" size={24} color="#fff" />
                            </LinearGradient>
                            <Text style={[styles.actionText, { color: isDark ? '#fff' : '#000' }]}>
                                {t('agent.viewMap')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Pending Tasks */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
                            {t('agent.pendingTasks')}
                        </Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
                        </TouchableOpacity>
                    </View>

                    {pendingTasks.map((task) => (
                        <TouchableOpacity
                            key={task.id}
                            style={[styles.taskCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
                            onPress={() => router.push('/(agent)/verification')}
                        >
                            <View style={[styles.taskSeverity, { backgroundColor: getSeverityColor(task.severity) }]} />
                            <View style={styles.taskContent}>
                                <View style={styles.taskHeader}>
                                    <Text style={[styles.taskType, { color: isDark ? '#fff' : '#000' }]}>
                                        {task.type}
                                    </Text>
                                    {task.priority === 'urgent' && (
                                        <View style={styles.urgentBadge}>
                                            <Text style={styles.urgentText}>{t('agent.urgent')}</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={[styles.taskLocation, { color: isDark ? '#999' : '#666' }]}>
                                    {task.location}
                                </Text>
                                <View style={styles.taskMeta}>
                                    <View style={styles.taskMetaItem}>
                                        <IconSymbol name="location.fill" size={14} color="#667eea" />
                                        <Text style={[styles.taskMetaText, { color: isDark ? '#999' : '#666' }]}>
                                            {task.distance}
                                        </Text>
                                    </View>
                                    <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(task.severity) + '20' }]}>
                                        <Text style={[styles.severityText, { color: getSeverityColor(task.severity) }]}>
                                            {task.severity.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <IconSymbol name="chevron.right" size={20} color={isDark ? '#666' : '#999'} />
                        </TouchableOpacity>
                    ))}
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
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 30,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    greeting: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
    },
    agentName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4ECDC4',
        marginRight: 6,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 4,
        alignItems: 'center',
    },
    statValue: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginTop: 4,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        marginTop: -10,
    },
    section: {
        marginTop: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    seeAll: {
        color: '#0B5394',
        fontSize: 14,
        fontWeight: '600',
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    actionCard: {
        flex: 1,
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    actionIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    taskCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    taskSeverity: {
        width: 4,
        height: '100%',
        borderRadius: 2,
        marginRight: 12,
    },
    taskContent: {
        flex: 1,
    },
    taskHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    taskType: {
        fontSize: 16,
        fontWeight: '600',
    },
    urgentBadge: {
        backgroundColor: '#FF4B2B',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginLeft: 8,
    },
    urgentText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    taskLocation: {
        fontSize: 14,
        marginBottom: 8,
    },
    taskMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    taskMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    taskMetaText: {
        fontSize: 12,
        marginLeft: 4,
    },
    severityBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    severityText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
});
