// API Configuration
export const API_URL = 'http://192.168.2.224:8000';

export const API_ENDPOINTS = {
    // Auth
    LOGIN: `${API_URL}/token`,
    REGISTER: `${API_URL}/register`,
    ME: `${API_URL}/users/me`,

    // Reports
    REPORTS: `${API_URL}/reports`,
    REPORT_BY_ID: (id: number) => `${API_URL}/reports/${id}`,
};
