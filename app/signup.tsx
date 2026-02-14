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
    View,
} from 'react-native';

import { API_ENDPOINTS } from '@/constants/api';

export default function SignupScreen() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const isDark = colorScheme === 'dark';
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        if (!fullName || !email || !password || !confirmPassword) {
            Alert.alert(t('common.error'), t('auth.fillAllFields'));
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert(t('common.error'), t('auth.passwordsDontMatch'));
            return;
        }

        if (password.length < 6) {
            Alert.alert(t('common.error'), t('auth.passwordTooShort'));
            return;
        }

        setLoading(true);
        try {
            // Call backend API
            const response = await fetch(API_ENDPOINTS.REGISTER, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    username: email.split('@')[0], // Use email prefix as username
                    full_name: fullName,
                    phone: phone || null,
                    password: password,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Auto-login after successful signup
                const loginFormData = new URLSearchParams();
                loginFormData.append('username', email);
                loginFormData.append('password', password);

                const loginResponse = await fetch(API_ENDPOINTS.LOGIN, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: loginFormData.toString(),
                });

                const loginData = await loginResponse.json();

                if (loginResponse.ok) {
                    await AsyncStorage.setItem('userToken', loginData.access_token);
                    await AsyncStorage.setItem('userEmail', email);
                    await AsyncStorage.setItem('userName', fullName);
                    router.replace('/(tabs)');
                } else {
                    Alert.alert(t('common.success'), t('auth.accountCreatedPleaseLogin'), [
                        { text: 'OK', onPress: () => router.replace('/login') }
                    ]);
                }
            } else {
                Alert.alert(t('common.error'), data.detail || t('auth.signupFailed'));
            }
        } catch (error) {
            Alert.alert(t('common.error'), t('auth.serverError'));
            console.error('Signup error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
            <LinearGradient
                colors={isDark ? ['#1a1a1a', '#0a0a0a'] : ['#0B5394', '#4A7C2C']}
                style={styles.header}
            >
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.logoContainer}>
                    <IconSymbol name="mappin.circle.fill" size={50} color="#fff" />
                    <Text style={styles.appName}>{t('auth.createAccount')}</Text>
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
                    <Text style={[styles.subtitle, { color: isDark ? '#999' : '#666' }]}>
                        {t('auth.signupSubtitle')}
                    </Text>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>
                                {t('auth.fullName')} *
                            </Text>
                            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                                <IconSymbol name="person.fill" size={20} color="#0B5394" />
                                <TextInput
                                    style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
                                    placeholder={t('auth.enterFullName')}
                                    placeholderTextColor={isDark ? '#666' : '#999'}
                                    value={fullName}
                                    onChangeText={setFullName}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>
                                {t('auth.email')} *
                            </Text>
                            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                                <IconSymbol name="envelope.fill" size={20} color="#0B5394" />
                                <TextInput
                                    style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
                                    placeholder={t('auth.enterEmail')}
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
                                {t('auth.phone')} ({t('auth.optional')})
                            </Text>
                            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                                <IconSymbol name="phone.fill" size={20} color="#0B5394" />
                                <TextInput
                                    style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
                                    placeholder={t('auth.enterPhone')}
                                    placeholderTextColor={isDark ? '#666' : '#999'}
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>
                                {t('auth.password')} *
                            </Text>
                            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                                <IconSymbol name="lock.fill" size={20} color="#0B5394" />
                                <TextInput
                                    style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
                                    placeholder={t('auth.createPassword')}
                                    placeholderTextColor={isDark ? '#666' : '#999'}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>
                                {t('auth.confirmPassword')} *
                            </Text>
                            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                                <IconSymbol name="lock.fill" size={20} color="#0B5394" />
                                <TextInput
                                    style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
                                    placeholder={t('auth.confirmYourPassword')}
                                    placeholderTextColor={isDark ? '#666' : '#999'}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleSignup}
                            activeOpacity={0.8}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={['#0B5394', '#4A7C2C']}
                                style={styles.signupButton}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.signupButtonText}>
                                    {loading ? t('auth.creatingAccount') : t('auth.signup')}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.loginLink}
                        >
                            <Text style={[styles.loginText, { color: isDark ? '#999' : '#666' }]}>
                                {t('auth.alreadyHaveAccount')}{' '}
                                <Text style={styles.loginTextBold}>{t('auth.login')}</Text>
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
        paddingBottom: 30,
        alignItems: 'center',
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        left: 20,
        top: 60,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
    },
    appName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 12,
    },
    formContainer: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 24,
        textAlign: 'center',
    },
    form: {
        gap: 16,
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
    signupButton: {
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
    signupButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    loginLink: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    loginText: {
        fontSize: 14,
    },
    loginTextBold: {
        color: '#0B5394',
        fontWeight: '600',
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
