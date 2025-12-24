import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function Index() {
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            // Small delay to show loading
            await new Promise(resolve => setTimeout(resolve, 500));

            const token = await AsyncStorage.getItem('userToken');

            if (token) {
                // User is logged in, go to home
                router.replace('/(tabs)');
            } else {
                // No token, show login
                router.replace('/login');
            }
        } catch (error) {
            // On error, show login
            router.replace('/login');
        } finally {
            setIsChecking(false);
        }
    };

    // Show loading screen while checking
    return (
        <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#0B5394'
        }}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: '#fff', marginTop: 16, fontSize: 16 }}>
                Loading Bilagh...
            </Text>
        </View>
    );
}
