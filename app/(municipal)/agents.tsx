import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_ENDPOINTS } from '@/constants/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

interface Agent {
    id: number;
    name: string;
    email: string;
}

export default function AgentsScreen() {
    const colorScheme = useColorScheme();
    const { t } = useTranslation();
    const isDark = colorScheme === 'dark';

    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAgents = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(API_ENDPOINTS.MUNICIPAL_AGENTS, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setAgents(data);
            }
        } catch (error) {
            console.error('Error fetching agents:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchAgents();
    }, [fetchAgents]);

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
                <Text style={styles.headerTitle}>
                    {t('municipal.agents')}
                </Text>
                <Text style={styles.headerSubtitle}>
                    {t('municipal.manageAgents')}
                </Text>
            </LinearGradient>

            <ScrollView
                style={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0B5394']} />
                }
            >
                {agents.length === 0 ? (
                    <View style={[styles.emptyState, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                        <IconSymbol name="person.fill" size={48} color={isDark ? '#333' : '#ddd'} />
                        <Text style={[styles.emptyTitle, { color: isDark ? '#fff' : '#000' }]}>
                            {t('municipal.noAgents')}
                        </Text>
                    </View>
                ) : (
                    agents.map((agent) => (
                        <View
                            key={agent.id}
                            style={[styles.agentCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
                        >
                            <View style={styles.agentIcon}>
                                <IconSymbol name="person.fill" size={28} color="#667eea" />
                            </View>
                            <View style={styles.agentInfo}>
                                <Text style={[styles.agentName, { color: isDark ? '#fff' : '#000' }]}>
                                    {agent.name}
                                </Text>
                                <Text style={[styles.agentEmail, { color: isDark ? '#999' : '#666' }]}>
                                    {agent.email}
                                </Text>
                            </View>
                            <View style={styles.statusBadge}>
                                <Text style={styles.statusText}>{t('municipal.active')}</Text>
                            </View>
                        </View>
                    ))
                )}
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
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 4,
        color: 'rgba(255,255,255,0.8)',
    },
    list: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    emptyState: {
        padding: 40,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
    },
    agentCard: {
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
    agentIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(102, 126, 234, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    agentInfo: {
        flex: 1,
    },
    agentName: {
        fontSize: 18,
        fontWeight: '600',
    },
    agentEmail: {
        fontSize: 14,
        marginTop: 2,
    },
    statusBadge: {
        backgroundColor: 'rgba(78, 205, 196, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        color: '#4ECDC4',
        fontSize: 12,
        fontWeight: '600',
    },
});
