import { Platform } from 'react-native';

// API Configuration
// Use localhost for web, use your machine's IP for mobile devices
const LOCAL_IP = '192.168.2.224';
export const API_URL = Platform.OS === 'web'
    ? 'http://localhost:8000'
    : `http://${LOCAL_IP}:8000`;

export const API_ENDPOINTS = {
    // Auth
    LOGIN: `${API_URL}/token`,
    REGISTER: `${API_URL}/register`,
    ME: `${API_URL}/users/me`,

    // Reports
    REPORTS: `${API_URL}/reports`,
    REPORT_BY_ID: (id: number) => `${API_URL}/reports/${id}`,
};
