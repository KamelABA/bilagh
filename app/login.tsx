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

import { API_ENDPOINTS, LOCAL_IP } from '@/constants/api';

export default function LoginScreen() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const isDark = colorScheme === 'dark';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleTestLogin = async () => {
        const testEmail = 'test@bilagh.dz';
        const testPassword = 'test123';

        setEmail(testEmail);
        setPassword(testPassword);

        // Directly call login logic with test credentials
        await performLogin(testEmail, testPassword);
    };

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert(t('common.error'), t('auth.fillAllFields'));
            return;
        }
        await performLogin(email, password);
    };

    const performLogin = async (loginEmail: string, loginPassword: string) => {
        setLoading(true);
        console.log('LOGIN: Starting login process...');
        console.log('LOGIN: API URL:', API_ENDPOINTS.LOGIN);
        console.log('LOGIN: Email:', loginEmail);

        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                console.error('LOGIN: Request timed out after 30s');
            }, 30000); // 30 second timeout

            // Call backend API with manual url-encoded string
            const body = `username=${encodeURIComponent(loginEmail)}&password=${encodeURIComponent(loginPassword)}`;

            console.log('LOGIN: Sending request to backend...');
            const response = await fetch(API_ENDPOINTS.LOGIN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                body: body,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const responseStatus = response.status;
            console.log('LOGIN: Got response, status:', responseStatus);

            let data;
            try {
                data = await response.json();
                console.log('LOGIN: Response data:', data);
            } catch (e) {
                console.error('LOGIN: Failed to parse JSON response');
                throw new Error('Server returned invalid response. Please check backend logs.');
            }

            if (response.ok) {
                console.log('LOGIN: Login successful, saving token...');
                // Save token
                await AsyncStorage.multiSet([
                    ['userToken', data.access_token],
                    ['userEmail', loginEmail]
                ]);

                console.log('LOGIN: Fetching user profile...');
                // Fetch user profile to check role
                const userController = new AbortController();
                const userTimeoutId = setTimeout(() => userController.abort(), 10000);

                try {
                    const userResponse = await fetch(API_ENDPOINTS.ME, {
                        headers: {
                            'Authorization': `Bearer ${data.access_token}`,
                            'Accept': 'application/json',
                        },
                        signal: userController.signal,
                    });

                    clearTimeout(userTimeoutId);
                    console.log('LOGIN: User profile response status:', userResponse.status);

                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        console.log('LOGIN: User data:', userData);

                        await AsyncStorage.multiSet([
                            ['userRole', userData.role || 'user'],
                            ['userName', userData.full_name || userData.username || ''],
                            ['userEmail', userData.email || '']
                        ]);

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
                        router.replace('/(tabs)');
                    }
                } catch (profileError) {
                    console.warn('LOGIN: Error fetching profile:', profileError);
                    router.replace('/(tabs)');
                }
            } else {
                console.error('LOGIN: Login failed:', data?.detail || 'Unknown error');
                Alert.alert(t('common.error'), data?.detail || t('auth.loginFailed'));
            }
        } catch (error: any) {
            console.error('LOGIN: Error occurred:', error);

            let errorMessage = error.message || t('auth.serverError');
            if (error.name === 'AbortError') {
                errorMessage = 'Request timeout. Please check:\n\n1. Backend server is running\n2. Phone and computer on same WiFi\n3. Correct IP address (' + LOCAL_IP + ')';
            } else if (error.message?.includes('Network request failed')) {
                errorMessage = 'Cannot connect to server.\n\nPlease verify:\n• Backend running at ' + API_ENDPOINTS.LOGIN + '\n• Same WiFi network\n• Correct IP address: ' + LOCAL_IP;
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

                {/* Language Switcher */}
                <View style={styles.languageSwitcher}>
                    <TouchableOpacity
                        onPress={() => i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')}
                        style={styles.langButton}
                    >
                        <IconSymbol name="globe" size={16} color="#fff" />
                        <Text style={styles.langButtonText}>
                            {i18n.language === 'en' ? 'العربية' : 'English'}
                        </Text>
                    </TouchableOpacity>
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

                        <TouchableOpacity
                            onPress={handleTestLogin}
                            style={styles.testAppLink}
                        >
                            <Text style={styles.testAppText}>
                                {t('auth.testApp')}
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
    testAppLink: {
        alignItems: 'center',
        marginTop: 10,
        paddingBottom: 20,
    },
    testAppText: {
        color: '#4A7C2C',
        fontWeight: 'bold',
        fontSize: 16,
        textDecorationLine: 'underline',
    },
    languageSwitcher: {
        position: 'absolute',
        top: 60,
        right: 20,
    },
    langButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    langButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});
