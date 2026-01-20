// Backend Model Types - Match Python models exactly

export enum UserRole {
    USER = 'user',
    ADMIN = 'admin',
}

export enum ReportStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in-progress',
    RESOLVED = 'resolved',
}

export enum SeverityLevel {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
}

export interface User {
    id: string;
    email: string;
    username: string;
    full_name: string | null;
    phone: string | null;
    role: UserRole;
    points: number;
    created_at: string;
}

export interface Report {
    id: string;
    user_id: string;
    type: string;
    location: string;
    latitude: number | null;
    longitude: number | null;
    description: string | null;
    status: ReportStatus;
    severity: SeverityLevel;
    image_url: string | null;
    created_at: string;
    updated_at: string;
}

// API Request Types
export interface LoginRequest {
    username: string; // email
    password: string;
}

export interface RegisterRequest {
    email: string;
    username: string;
    full_name?: string;
    phone?: string;
    password: string;
}

export interface CreateReportRequest {
    type: string;
    location: string;
    latitude?: number;
    longitude?: number;
    description?: string;
    severity?: SeverityLevel;
}

export interface UpdateReportRequest {
    status?: ReportStatus;
    severity?: SeverityLevel;
}

// API Response Types
export interface TokenResponse {
    access_token: string;
    token_type: string;
}

export interface ErrorResponse {
    detail: string;
}
