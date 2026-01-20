from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Any
from datetime import datetime
from models import ReportStatus, SeverityLevel, UserRole

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: str
    role: UserRole
    points: int
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Report Schemas
class ReportBase(BaseModel):
    type: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    severity: SeverityLevel = SeverityLevel.MEDIUM

class ReportCreate(ReportBase):
    image_url: Optional[str] = None

class ReportUpdate(BaseModel):
    status: Optional[ReportStatus] = None
    severity: Optional[SeverityLevel] = None

class Report(ReportBase):
    id: str
    user_id: str
    status: ReportStatus
    image_url: Optional[str] = None
    assigned_agent_id: Optional[str] = None
    municipal_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# Report with User info for agents
class UserInfo(BaseModel):
    id: str
    full_name: Optional[str] = None
    email: str
    phone: Optional[str] = None

class ReportWithUser(ReportBase):
    id: str
    user_id: str
    status: ReportStatus
    image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    user: UserInfo

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Notification Schemas
class Notification(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    report_id: Optional[str] = None
    is_read: int
    created_at: datetime
