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

    // Reports (for users)
    REPORTS: `${API_URL}/reports`,
    REPORT_BY_ID: (id: number) => `${API_URL}/reports/${id}`,

    // Agent endpoints
    AGENT_REPORTS: `${API_URL}/agent/reports`,
    AGENT_REPORT_BY_ID: (id: number) => `${API_URL}/agent/reports/${id}`,
    AGENT_VERIFY_REPORT: (id: number) => `${API_URL}/agent/reports/${id}/verify`,
    AGENT_STATS: `${API_URL}/agent/stats`,
    AGENT_NOTIFICATIONS: `${API_URL}/agent/notifications`,
    AGENT_NOTIFICATIONS_UNREAD: `${API_URL}/agent/notifications/unread-count`,
    AGENT_NOTIFICATION_READ: (id: number) => `${API_URL}/agent/notifications/${id}/read`,
    AGENT_NOTIFICATIONS_MARK_ALL_READ: `${API_URL}/agent/notifications/mark-all-read`,

    // Municipal endpoints
    MUNICIPAL_REPORTS: `${API_URL}/municipal/reports`,
    MUNICIPAL_ALL_REPORTS: `${API_URL}/municipal/all-reports`,
    MUNICIPAL_APPROVE: (id: number) => `${API_URL}/municipal/reports/${id}/approve`,
    MUNICIPAL_REJECT: (id: number) => `${API_URL}/municipal/reports/${id}/reject`,
    MUNICIPAL_ASSIGN: (id: number) => `${API_URL}/municipal/reports/${id}/assign`,
    MUNICIPAL_AGENTS: `${API_URL}/municipal/agents`,
    MUNICIPAL_STATS: `${API_URL}/municipal/stats`,

    // Image Upload
    UPLOAD_IMAGE: `${API_URL}/upload-image`,

    // Prediction
    PREDICT: `${API_URL}/predict`,
    MODEL_INFO: `${API_URL}/predict/model-info`,
};
