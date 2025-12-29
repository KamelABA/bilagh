import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function Index() {
    const router = useRouter();

    useEffect(() => {
        // Small delay to show loading, then always go to login
        const timeout = setTimeout(() => {
            router.replace('/login');
        }, 500);

        return () => clearTimeout(timeout);
    }, []);

    // Show loading screen while redirecting
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
