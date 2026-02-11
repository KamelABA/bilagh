import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { API_ENDPOINTS } from '@/constants/api';

export default function LoginScreen() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const { t } = useTranslation();
    const isDark = colorScheme === 'dark';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert(t('common.error'), t('auth.fillAllFields'));
            return;
        }

        setLoading(true);
        console.log('LOGIN: Starting login process...');
        console.log('LOGIN: API URL:', API_ENDPOINTS.LOGIN);
        console.log('LOGIN: Email:', email);

        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                console.error('LOGIN: Request timed out after 30s');
            }, 30000); // 30 second timeout

            // Call backend API
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            console.log('LOGIN: Sending request to backend...');
            const response = await fetch(API_ENDPOINTS.LOGIN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            console.log('LOGIN: Got response, status:', response.status);

            const data = await response.json();
            console.log('LOGIN: Response data:', data);

            if (response.ok) {
                console.log('LOGIN: Login successful, saving token...');
                // Save token
                await AsyncStorage.setItem('userToken', data.access_token);
                await AsyncStorage.setItem('userEmail', email);

                console.log('LOGIN: Fetching user profile...');
                // Fetch user profile to check role
                const userController = new AbortController();
                const userTimeoutId = setTimeout(() => userController.abort(), 10000);

                const userResponse = await fetch(API_ENDPOINTS.ME, {
                    headers: {
                        'Authorization': `Bearer ${data.access_token}`,
                    },
                    signal: userController.signal,
                });

                clearTimeout(userTimeoutId);
                console.log('LOGIN: User profile response status:', userResponse.status);

                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    console.log('LOGIN: User data:', userData);
                    await AsyncStorage.setItem('userRole', userData.role || 'user');
                    await AsyncStorage.setItem('userName', userData.full_name || userData.username || '');
                    await AsyncStorage.setItem('userEmail', userData.email || '');

                    console.log('LOGIN: Redirecting based on role:', userData.role);
                    // Redirect based on role
                    if (userData.role === 'agent') {
                        router.replace('/(agent)');
                    } else if (userData.role === 'municipal') {
                        router.replace('/(municipal)');
                    } else {
                        router.replace('/(tabs)');
                    }
                } else {
                    console.log('LOGIN: Profile fetch failed, redirecting to tabs anyway');
                    // Default to regular user tabs if profile fetch fails
                    router.replace('/(tabs)');
                }
            } else {
                console.error('LOGIN: Login failed:', data.detail);
                Alert.alert(t('common.error'), data.detail || t('auth.loginFailed'));
            }
        } catch (error: any) {
            console.error('LOGIN: Error occurred:', error);

            let errorMessage = t('auth.serverError');
            if (error.name === 'AbortError') {
                errorMessage = 'Request timeout. Please check:\n\n1. Backend server is running\n2. Phone and computer on same WiFi\n3. Correct IP address in settings';
                console.error('LOGIN: Request was aborted (timeout)');
            } else if (error.message?.includes('Network request failed')) {
                errorMessage = 'Cannot connect to server.\n\nPlease verify:\n• Backend running at ' + API_ENDPOINTS.LOGIN + '\n• Same WiFi network\n• Correct IP address';
                console.error('LOGIN: Network request failed - cannot reach server');
            }

            Alert.alert(t('common.error'), errorMessage);
        } finally {
            setLoading(false);
            console.log('LOGIN: Process completed');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
            <LinearGradient
                colors={isDark ? ['#1a1a1a', '#0a0a0a'] : ['#0B5394', '#4A7C2C']}
                style={styles.header}
            >
                <View style={styles.logoContainer}>
                    <IconSymbol name="mappin.circle.fill" size={60} color="#fff" />
                    <Text style={styles.appName}>{t('common.appName')}</Text>
                    <Text style={styles.tagline}>{t('common.tagline')}</Text>
                </View>
            </LinearGradient>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.formContainer}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
                        {t('auth.welcomeBack')}
                    </Text>
                    <Text style={[styles.subtitle, { color: isDark ? '#999' : '#666' }]}>
                        {t('auth.loginSubtitle')}
                    </Text>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>
                                {t('auth.email')}
                            </Text>
                            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                                <IconSymbol name="envelope.fill" size={20} color="#0B5394" />
                                <TextInput
                                    style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
                                    placeholder="Enter your email"
                                    placeholderTextColor={isDark ? '#666' : '#999'}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>
                                {t('auth.password')}
                            </Text>
                            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                                <IconSymbol name="lock.fill" size={20} color="#0B5394" />
                                <TextInput
                                    style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
                                    placeholder="Enter your password"
                                    placeholderTextColor={isDark ? '#666' : '#999'}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleLogin}
                            activeOpacity={0.8}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={['#0B5394', '#4A7C2C']}
                                style={styles.loginButton}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.loginButtonText}>
                                    {loading ? t('auth.signingIn') : t('auth.login')}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={[styles.dividerLine, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                            <Text style={[styles.dividerText, { color: isDark ? '#666' : '#999' }]}>OR</Text>
                            <View style={[styles.dividerLine, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                        </View>

                        <TouchableOpacity
                            onPress={() => router.push('/signup')}
                            style={styles.signupLink}
                        >
                            <Text style={[styles.signupText, { color: isDark ? '#999' : '#666' }]}>
                                {t('auth.dontHaveAccount')}{' '}
                                <Text style={styles.signupTextBold}>{t('auth.signup')}</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 40,
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
    },
    appName: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 16,
    },
    tagline: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.9,
        marginTop: 4,
    },
    formContainer: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 32,
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        paddingLeft: 12,
        fontSize: 16,
    },
    loginButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        paddingHorizontal: 16,
        fontSize: 12,
    },
    signupLink: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    signupText: {
        fontSize: 14,
    },
    signupTextBold: {
        color: '#0B5394',
        fontWeight: '600',
    },
});
