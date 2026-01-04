import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import { Tabs } from 'expo-router';
import React from 'react';

export default function AgentLayout() {
    const colorScheme = useColorScheme();
    const { t } = useTranslation();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#667eea',
                tabBarInactiveTintColor: colorScheme === 'dark' ? '#888' : '#999',
                tabBarStyle: {
                    backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff',
                    borderTopColor: colorScheme === 'dark' ? '#333' : '#eee',
                    height: 85,
                    paddingBottom: 20,
                    paddingTop: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: t('agent.home'),
                    tabBarIcon: ({ color, focused }) => (
                        <IconSymbol
                            name={focused ? 'house.fill' : 'house'}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="verification"
                options={{
                    title: t('agent.verification'),
                    tabBarIcon: ({ color, focused }) => (
                        <IconSymbol
                            name={focused ? 'checkmark.shield.fill' : 'checkmark.shield'}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="map"
                options={{
                    title: t('tabs.map'),
                    tabBarIcon: ({ color, focused }) => (
                        <IconSymbol
                            name={focused ? 'map.fill' : 'map'}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: t('agent.notifications'),
                    tabBarIcon: ({ color, focused }) => (
                        <IconSymbol
                            name={focused ? 'bell.fill' : 'bell'}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: t('tabs.profile'),
                    tabBarIcon: ({ color, focused }) => (
                        <IconSymbol
                            name={focused ? 'person.fill' : 'person'}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
