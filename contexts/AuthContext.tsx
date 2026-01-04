import { API_ENDPOINTS } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
    id: number;
    email: string;
    username: string;
    full_name: string;
    phone: string;
    role: 'user' | 'agent' | 'admin';
    points: number;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (token) {
                const response = await fetch(API_ENDPOINTS.ME, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const userData = await response.json();
                    setUser(userData);
                } else {
                    // Token invalid, clear it
                    await AsyncStorage.removeItem('userToken');
                    setUser(null);
                }
            }
        } catch (error) {
            console.error('Error loading user:', error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (token: string) => {
        await AsyncStorage.setItem('userToken', token);
        await loadUser();
    };

    const logout = async () => {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userEmail');
        await AsyncStorage.removeItem('userRole');
        setUser(null);
    };

    const refreshUser = async () => {
        await loadUser();
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
