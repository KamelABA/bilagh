import { API_ENDPOINTS } from '@/constants/api';
import {
    CreateReportRequest,
    RegisterRequest,
    Report,
    ReportStatus,
    TokenResponse,
    UpdateReportRequest,
    User
} from '@/types/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ApiService {
    private async getAuthHeader(): Promise<{ Authorization: string } | {}> {
        const token = await AsyncStorage.getItem('userToken');
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    // Authentication
    async login(email: string, password: string): Promise<TokenResponse> {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await fetch(API_ENDPOINTS.LOGIN, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }

        return response.json();
    }

    async register(data: RegisterRequest): Promise<User> {
        const response = await fetch(API_ENDPOINTS.REGISTER, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Registration failed');
        }

        return response.json();
    }

    async getCurrentUser(): Promise<User> {
        const authHeader = await this.getAuthHeader();
        const response = await fetch(API_ENDPOINTS.ME, {
            headers: {
                ...authHeader,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to get user info');
        }

        return response.json();
    }

    // Reports
    async createReport(data: CreateReportRequest): Promise<Report> {
        const authHeader = await this.getAuthHeader();
        const response = await fetch(API_ENDPOINTS.REPORTS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create report');
        }

        return response.json();
    }

    async getReports(status?: ReportStatus): Promise<Report[]> {
        const authHeader = await this.getAuthHeader();
        const url = status
            ? `${API_ENDPOINTS.REPORTS}?status=${status}`
            : API_ENDPOINTS.REPORTS;

        const response = await fetch(url, {
            headers: {
                ...authHeader,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch reports');
        }

        return response.json();
    }

    async getReportById(id: number): Promise<Report> {
        const authHeader = await this.getAuthHeader();
        const response = await fetch(API_ENDPOINTS.REPORT_BY_ID(id), {
            headers: {
                ...authHeader,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch report');
        }

        return response.json();
    }

    async updateReport(id: number, data: UpdateReportRequest): Promise<Report> {
        const authHeader = await this.getAuthHeader();
        const response = await fetch(API_ENDPOINTS.REPORT_BY_ID(id), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update report');
        }

        return response.json();
    }

    async deleteReport(id: number): Promise<void> {
        const authHeader = await this.getAuthHeader();
        const response = await fetch(API_ENDPOINTS.REPORT_BY_ID(id), {
            method: 'DELETE',
            headers: {
                ...authHeader,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to delete report');
        }
    }

    // Helper to check if user is authenticated
    async isAuthenticated(): Promise<boolean> {
        const token = await AsyncStorage.getItem('userToken');
        return !!token;
    }

    // Logout
    async logout(): Promise<void> {
        await AsyncStorage.clear();
    }
}

export const apiService = new ApiService();
