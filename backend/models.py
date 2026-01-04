from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum

class UserRole(str, enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"
    agent = "agent"
    municipal = "municipal"

class ReportStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"      # Agent verified the report
    APPROVED = "approved"      # Municipal approved for repair
    REJECTED = "rejected"      # Municipal rejected
    ASSIGNED = "assigned"      # Assigned to repair team
    IN_PROGRESS = "in-progress"
    RESOLVED = "resolved"

class SeverityLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String)
    phone = Column(String)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole, values_callable=lambda x: [e.value for e in x]), default=UserRole.USER)

    points = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    reports = relationship("Report", back_populates="user", foreign_keys="Report.user_id", primaryjoin="User.id==Report.user_id")
    assigned_reports = relationship("Report", back_populates="assigned_agent", foreign_keys="Report.assigned_agent_id", primaryjoin="User.id==Report.assigned_agent_id")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)  # Pothole, Crack, etc.
    location = Column(String, nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    description = Column(Text)
    status = Column(Enum(ReportStatus, values_callable=lambda x: [e.value for e in x]), default=ReportStatus.PENDING)
    severity = Column(Enum(SeverityLevel, values_callable=lambda x: [e.value for e in x]), default=SeverityLevel.MEDIUM)
    image_url = Column(String)
    
    # Municipal workflow fields
    assigned_agent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    municipal_notes = Column(Text, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="reports", foreign_keys=[user_id], primaryjoin="Report.user_id==User.id")
    assigned_agent = relationship("User", back_populates="assigned_reports", foreign_keys=[assigned_agent_id], primaryjoin="Report.assigned_agent_id==User.id")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String, default="info")  # info, task, alert
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=True)
    is_read = Column(Integer, default=0)  # 0 = unread, 1 = read
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="notifications")
    report = relationship("Report", backref="notifications")
