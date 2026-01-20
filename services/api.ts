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

    async getReportById(id: string): Promise<Report> {
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

    async updateReport(id: string, data: UpdateReportRequest): Promise<Report> {
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

    async deleteReport(id: string): Promise<void> {
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
        return new Promise((resolve, reject) => {
            const formData = new FormData();

            // Get file info from URI
            const filename = imageUri.split('/').pop() || 'image.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            console.log('API predictDamage - Using XMLHttpRequest');
            console.log('API predictDamage - URL:', API_ENDPOINTS.PREDICT);
            console.log('API predictDamage - Filename:', filename);
            console.log('API predictDamage - MIME Type:', type);

            // Append the image file
            formData.append('file', {
                uri: imageUri,
                name: filename,
                type: type,
            } as any);

            const xhr = new XMLHttpRequest();

            // Set up event handlers
            xhr.onreadystatechange = () => {
                if (xhr.readyState !== 4) return;

                console.log('API predictDamage - Response received:', xhr.status);

                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        console.log('API predictDamage - Success');
                        resolve(result);
                    } catch (e) {
                        reject(new Error(`Failed to parse response: ${xhr.responseText}`));
                    }
                } else if (xhr.status === 0) {
                    reject(new Error(
                        `Network connection failed\n\n` +
                        `Endpoint: ${API_ENDPOINTS.PREDICT}\n\n` +
                        `This usually means:\n` +
                        `• Connection was interrupted\n` +
                        `• Server is unreachable\n` +
                        `• Request was blocked\n\n` +
                        `Response: ${xhr.responseText || 'No response'}`
                    ));
                } else {
                    reject(new Error(`Server error (${xhr.status}): ${xhr.responseText}`));
                }
            };

            xhr.onerror = () => {
                console.error('API predictDamage - XHR Error');
                reject(new Error(
                    `Upload failed\n\n` +
                    `Endpoint: ${API_ENDPOINTS.PREDICT}\n\n` +
                    `Check:\n` +
                    `• Backend is running\n` +
                    `• Network is stable\n` +
                    `• Firewall allows connection`
                ));
            };

            xhr.ontimeout = () => {
                console.error('API predictDamage - Timeout');
                reject(new Error('Request timed out after 90 seconds. The server may be overloaded.'));
            };

            // Open and configure request
            xhr.open('POST', API_ENDPOINTS.PREDICT, true);
            xhr.timeout = 90000; // 90 second timeout

            // Send the request
            console.log('API predictDamage - Sending request...');
            xhr.send(formData);
        });
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
