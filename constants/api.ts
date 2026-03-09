
// ─── API Configuration ───────────────────────────────────────────────────────
// ⚠️  DEVELOPMENT MODE — Railway URL is being redeployed
// Switch back to PRODUCTION_API_URL once Railway is live again.
const PRODUCTION_API_URL = 'https://web-production-3f689.up.railway.app';

// Local backend — phone and PC must be on the same WiFi
export const LOCAL_IP = '192.168.2.224';
const DEV_API_URL = `http://${LOCAL_IP}:8000`;

// 👇 Use PRODUCTION_API_URL for sharing, DEV_API_URL for local testing
export const API_URL = PRODUCTION_API_URL;

export const API_ENDPOINTS = {
    // Auth
    LOGIN: `${API_URL}/token`,
    REGISTER: `${API_URL}/register`,
    ME: `${API_URL}/users/me`,

    // Reports (for users)
    REPORTS: `${API_URL}/reports`,
    MAP_REPORTS: `${API_URL}/reports/map`, // Map (all reports with coordinates)
    REPORT_BY_ID: (id: string) => `${API_URL}/reports/${id}`,

    // Agent endpoints
    AGENT_REPORTS: `${API_URL}/agent/reports`,
    AGENT_REPORT_BY_ID: (id: string) => `${API_URL}/agent/reports/${id}`,
    AGENT_VERIFY_REPORT: (id: string) => `${API_URL}/agent/reports/${id}/verify`,
    AGENT_STATS: `${API_URL}/agent/stats`,
    AGENT_NOTIFICATIONS: `${API_URL}/agent/notifications`,
    AGENT_NOTIFICATIONS_UNREAD: `${API_URL}/agent/notifications/unread-count`,
    AGENT_NOTIFICATION_READ: (id: string) => `${API_URL}/agent/notifications/${id}/read`,
    AGENT_NOTIFICATIONS_MARK_ALL_READ: `${API_URL}/agent/notifications/mark-all-read`,

    // Municipal endpoints
    MUNICIPAL_REPORTS: `${API_URL}/municipal/reports`,
    MUNICIPAL_ALL_REPORTS: `${API_URL}/municipal/all-reports`,
    MUNICIPAL_APPROVE: (id: string) => `${API_URL}/municipal/reports/${id}/approve`,
    MUNICIPAL_REJECT: (id: string) => `${API_URL}/municipal/reports/${id}/reject`,
    MUNICIPAL_ASSIGN: (id: string) => `${API_URL}/municipal/reports/${id}/assign`,
    MUNICIPAL_AGENTS: `${API_URL}/municipal/agents`,
    MUNICIPAL_STATS: `${API_URL}/municipal/stats`,

    // Image Upload
    UPLOAD_IMAGE: `${API_URL}/upload-image`,

    // Prediction
    PREDICT: `${API_URL}/predict`,
    MODEL_INFO: `${API_URL}/predict/model-info`,

    // AI Analysis (Geometric + Risk Assessment)
    ANALYZE_GEOMETRY: `${API_URL}/analyze-geometry`,
    ASSESS_RISK: `${API_URL}/assess-risk`,
    ANALYZE_COMPLETE: `${API_URL}/analyze-complete`,
    ANALYZE_COMPLETE_URL: `${API_URL}/analyze-complete-url`,
};
