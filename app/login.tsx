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
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const { login: authLogin } = useAuth();
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
        const trimmedEmail = loginEmail.trim();
        const trimmedPassword = loginPassword; // Usually don't trim passwords as spaces might be intentional, but email should definitely be trimmed.

        setLoading(true);
        console.log('LOGIN: Starting login process...');
        console.log('LOGIN: API URL:', API_ENDPOINTS.LOGIN);
        console.log('LOGIN: Email:', `"${trimmedEmail}"`);

        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                console.error('LOGIN: Request timed out after 45s');
            }, 45000); // 45 second timeout for login

            // Call backend API with manual url-encoded string
            const body = `username=${encodeURIComponent(trimmedEmail)}&password=${encodeURIComponent(trimmedPassword)}`;

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
            const responseClone = response.clone();
            try {
                data = await response.json();
                console.log('LOGIN: Response data:', data);
            } catch (e) {
                console.error('LOGIN: Failed to parse JSON response');
                try {
                    const rawText = await responseClone.text();
                    console.error('LOGIN: Raw response text:', rawText);
                } catch (textError) {
                    console.error('LOGIN: Also failed to get raw text:', textError);
                }
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
                const userTimeoutId = setTimeout(() => userController.abort(), 20000); // Increased to 20s

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

                        // CRITICAL: Tell the React Context to update its internal user state
                        console.log('LOGIN: Syncing global context...');
                        await authLogin(data.access_token);

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
                        await authLogin(data.access_token);
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
        paddingTop: 80, // Increased for safe area
        paddingBottom: 60,
        alignItems: 'center',
        position: 'relative',
    },
    logoContainer: {
        alignItems: 'center',
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 12,
    },
    tagline: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
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
    formContainer: {
        flex: 1,
        marginTop: -40,
        backgroundColor: 'transparent',
    },
    scrollContent: {
        padding: 24,
        backgroundColor: 'transparent',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 32,
        textAlign: 'center',
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
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderRadius: 15,
        height: 60,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    input: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        height: '100%',
    },
    loginButton: {
        height: 60,
        borderRadius: 15,
        justifyContent: 'center',
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
        fontSize: 18,
        fontWeight: 'bold',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: 15,
        fontSize: 14,
        fontWeight: '600',
    },
    signupLink: {
        alignItems: 'center',
        marginBottom: 20,
    },
    signupText: {
        fontSize: 15,
    },
    signupTextBold: {
        fontWeight: 'bold',
        color: '#0B5394',
    },
    testAppLink: {
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 15,
        backgroundColor: 'rgba(11, 83, 148, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(11, 83, 148, 0.1)',
    },
    testAppText: {
        color: '#0B5394',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
