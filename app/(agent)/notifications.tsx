import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_ENDPOINTS } from '@/constants/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface Notification {
    id: number;
    user_id: number;
    title: string;
    message: string;
    type: string;
    report_id: number | null;
    is_read: number;
    created_at: string;
}

export default function NotificationsScreen() {
    const colorScheme = useColorScheme();
    const { t } = useTranslation();
    const isDark = colorScheme === 'dark';

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            const response = await fetch(API_ENDPOINTS.AGENT_NOTIFICATIONS, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setNotifications(data);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchNotifications();
    }, [fetchNotifications]);

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'task': return 'doc.badge.plus';
            case 'alert': return 'exclamationmark.triangle.fill';
            case 'info': return 'info.circle.fill';
            default: return 'bell.fill';
        }
    };

    const getNotificationColor = (type: string): [string, string] => {
        switch (type) {
            case 'task': return ['#667eea', '#764ba2'];
            case 'alert': return ['#FF4B2B', '#FF416C'];
            case 'info': return ['#4ECDC4', '#44A08D'];
            default: return ['#667eea', '#764ba2'];
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} min ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days === 1) return 'Yesterday';
        return `${days} days ago`;
    };

    const markAsRead = async (id: number) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            await fetch(API_ENDPOINTS.AGENT_NOTIFICATION_READ(id), {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: 1 } : n)
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            await fetch(API_ENDPOINTS.AGENT_NOTIFICATIONS_MARK_ALL_READ, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: 1 }))
            );
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const unreadCount = notifications.filter(n => n.is_read === 0).length;

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
                <ActivityIndicator size="large" color="#667eea" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#000' }]}>
                    {t('agent.notifications')}
                </Text>
                {unreadCount > 0 && (
                    <TouchableOpacity style={styles.unreadBadge} onPress={markAllAsRead}>
                        <Text style={styles.unreadText}>{unreadCount} {t('agent.unread')}</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#667eea']} />
                }
            >
                {notifications.length === 0 ? (
                    <View style={styles.emptyState}>
                        <IconSymbol name="bell.slash" size={48} color={isDark ? '#333' : '#ddd'} />
                        <Text style={[styles.emptyText, { color: isDark ? '#fff' : '#000' }]}>
                            {t('agent.noNotifications')}
                        </Text>
                    </View>
                ) : (
                    notifications.map((notification) => (
                        <TouchableOpacity
                            key={notification.id}
                            style={[
                                styles.notificationCard,
                                { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
                                notification.is_read === 0 && styles.unreadCard,
                            ]}
                            onPress={() => markAsRead(notification.id)}
                        >
                            <LinearGradient
                                colors={getNotificationColor(notification.type)}
                                style={styles.notificationIcon}
                            >
                                <IconSymbol
                                    name={getNotificationIcon(notification.type)}
                                    size={20}
                                    color="#fff"
                                />
                            </LinearGradient>
                            <View style={styles.notificationContent}>
                                <View style={styles.notificationHeader}>
                                    <Text style={[styles.notificationTitle, { color: isDark ? '#fff' : '#000' }]}>
                                        {notification.title}
                                    </Text>
                                    {notification.is_read === 0 && <View style={styles.unreadDot} />}
                                </View>
                                <Text style={[styles.notificationMessage, { color: isDark ? '#999' : '#666' }]}>
                                    {notification.message}
                                </Text>
                                <Text style={[styles.notificationTime, { color: isDark ? '#666' : '#999' }]}>
                                    {formatTime(notification.created_at)}
                                </Text>
                            </View>
                        </TouchableOpacity>
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
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    unreadBadge: {
        backgroundColor: '#FF4B2B',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    unreadText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 16,
    },
    notificationCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    unreadCard: {
        borderLeftWidth: 3,
        borderLeftColor: '#667eea',
    },
    notificationIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    notificationContent: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    notificationTitle: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#667eea',
    },
    notificationMessage: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 6,
    },
    notificationTime: {
        fontSize: 11,
    },
});
