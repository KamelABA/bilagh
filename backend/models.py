from enum import Enum

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"
    agent = "agent"
    municipal = "municipal"

class ReportStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"     
    APPROVED = "approved"     
    REJECTED = "rejected"     
    ASSIGNED = "assigned"     
    IN_PROGRESS = "in-progress"
    RESOLVED = "resolved"

class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
