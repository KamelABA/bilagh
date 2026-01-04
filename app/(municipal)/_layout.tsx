import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function MunicipalLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { t } = useTranslation();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const role = await AsyncStorage.getItem('userRole');

            if (!token || role !== 'municipal') {
                router.replace('/login');
                return;
            }

            setIsAuthorized(true);
        } catch (error) {
            router.replace('/login');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }}>
                <ActivityIndicator size="large" color="#0B5394" />
            </View>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#0B5394',
                tabBarInactiveTintColor: isDark ? '#666' : '#999',
                tabBarStyle: {
                    backgroundColor: isDark ? '#1a1a1a' : '#fff',
                    borderTopColor: isDark ? '#333' : '#e5e5e5',
                    height: 85,
                    paddingTop: 8,
                    paddingBottom: 25,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '500',
                },
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: t('municipal.dashboard'),
                    tabBarIcon: ({ color, focused }) => (
                        <IconSymbol name="house.fill" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="complaints"
                options={{
                    title: t('municipal.complaints'),
                    tabBarIcon: ({ color, focused }) => (
                        <IconSymbol name="doc.text.fill" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="map"
                options={{
                    title: t('municipal.map'),
                    tabBarIcon: ({ color, focused }) => (
                        <IconSymbol name="map.fill" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="agents"
                options={{
                    title: t('municipal.agents'),
                    tabBarIcon: ({ color, focused }) => (
                        <IconSymbol name="person.fill" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: t('municipal.profile'),
                    tabBarIcon: ({ color, focused }) => (
                        <IconSymbol name="gear" size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
