from pydantic import BaseModel, EmailStr
from typing import Optional
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
    id: int
    role: UserRole
    points: int
    created_at: datetime

    class Config:
        from_attributes = True

# Report Schemas
class ReportBase(BaseModel):
    type: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    severity: SeverityLevel = SeverityLevel.MEDIUM

class ReportCreate(ReportBase):
    pass

class ReportUpdate(BaseModel):
    status: Optional[ReportStatus] = None
    severity: Optional[SeverityLevel] = None

class Report(ReportBase):
    id: int
    user_id: int
    status: ReportStatus
    image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
