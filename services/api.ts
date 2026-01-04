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

    // Prediction
    async predictDamage(imageUri: string): Promise<PredictionResult> {
        const formData = new FormData();

        // Get file info from URI
        const filename = imageUri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        // Append the image file
        formData.append('file', {
            uri: imageUri,
            name: filename,
            type: type,
        } as any);

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

        try {
            const response = await fetch(API_ENDPOINTS.PREDICT, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Prediction failed');
            }

            return response.json();
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            }
            throw error;
        }
    }

    async getModelInfo(): Promise<ModelInfo> {
        const response = await fetch(API_ENDPOINTS.MODEL_INFO);

        if (!response.ok) {
            throw new Error('Failed to get model info');
        }

        return response.json();
    }
}

// Prediction types
export interface BoundingBox {
    class: string;
    label: string;
    label_ar: string;
    confidence: number;
    severity_score: number;
    severity_level: 'none' | 'low' | 'medium' | 'high';
    color: string;
    bbox: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        xc: number;
        yc: number;
        width: number;
        height: number;
    };
    area_ratio: number;
}

export interface PredictionResult {
    success: boolean;
    detected: boolean;
    damage_type: string | null;
    damage_label: string | null;
    damage_label_ar: string | null;
    confidence: number;
    severity_score: number;
    severity: 'none' | 'low' | 'medium' | 'high';
    color: string;
    bounding_boxes: BoundingBox[];
    image_size: { width: number; height: number } | null;
    all_predictions: Array<{
        class: string;
        label: string;
        confidence: number;
        severity?: number;
    }>;
    message: string;
    error?: string;
}

export interface ModelInfo {
    available: boolean;
    model_path?: string;
    input_shape?: string;
    output_shape?: string;
    area_threshold?: number;
    classes?: string[];
    labels?: Record<string, string>;
    labels_ar?: Record<string, string>;
    error?: string;
    message?: string;
}

export const apiService = new ApiService();
