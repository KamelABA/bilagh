from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import timedelta, datetime
import models
import schemas
import auth
from database import engine, get_db
import os
from dotenv import load_dotenv
import predict
import cloudinary_config

load_dotenv()

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Bilagh API", version="1.0.0")

# CORS Configuration - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to Bilagh API", "version": "1.0.0"}

# Authentication endpoints
@app.post("/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create new user
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        phone=user.phone,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/token", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

# Initialize agent user
@app.post("/init-agent")
def init_agent(db: Session = Depends(get_db)):
    # Check if agent already exists
    agent = db.query(models.User).filter(models.User.email == "agent@bilagh.dz").first()
    if agent:
        return {"message": "Agent user already exists", "email": agent.email}
    
    # Create agent user
    hashed_password = auth.get_password_hash("agent123")
    agent = models.User(
        email="agent@bilagh.dz",
        username="field_agent",
        full_name="Field Agent",
        phone="+213555123456",
        hashed_password=hashed_password,
        role="agent",  # Use lowercase string to match PostgreSQL enum
        points=0
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return {"message": "Agent user created successfully", "email": agent.email, "role": agent.role}

# Image upload endpoint
@app.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Upload an image to Cloudinary with compression.
    Returns the URL to use when creating a report.
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )
    
    # Validate file size (max 10MB)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB allowed.")
    
    try:
        # Upload to Cloudinary with compression
        result = cloudinary_config.upload_image(contents)
        return {
            "success": True,
            "url": result["url"],
            "public_id": result["public_id"],
            "width": result.get("width"),
            "height": result.get("height"),
            "format": result.get("format"),
            "size_bytes": result.get("bytes"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# Report endpoints
@app.post("/reports", response_model=schemas.Report, status_code=status.HTTP_201_CREATED)
def create_report(
    report: schemas.ReportCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_report = models.Report(**report.dict(), user_id=current_user.id)
    db.add(db_report)
    
    # Award points to user
    current_user.points += 10
    
    db.commit()
    db.refresh(db_report)
    return db_report

@app.get("/reports", response_model=List[schemas.Report])
def get_reports(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Report).filter(models.Report.user_id == current_user.id)
    if status:
        query = query.filter(models.Report.status == status)
    reports = query.offset(skip).limit(limit).all()
    return reports

@app.get("/reports/{report_id}", response_model=schemas.Report)
def get_report(
    report_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(models.Report).filter(
        models.Report.id == report_id,
        models.Report.user_id == current_user.id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@app.put("/reports/{report_id}", response_model=schemas.Report)
def update_report(
    report_id: int,
    report_update: schemas.ReportUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(models.Report).filter(
        models.Report.id == report_id,
        models.Report.user_id == current_user.id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    for key, value in report_update.dict(exclude_unset=True).items():
        setattr(report, key, value)
    
    db.commit()
    db.refresh(report)
    return report

@app.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(models.Report).filter(
        models.Report.id == report_id,
        models.Report.user_id == current_user.id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    db.delete(report)
    db.commit()
    return None

# Agent endpoints - for field agents to see and verify reports
@app.get("/agent/reports", response_model=List[schemas.ReportWithUser])
def get_all_reports_for_agent(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all reports for agents to verify. Only accessible by agents and admins."""
    if current_user.role not in [models.UserRole.agent, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized. Agent role required.")
    
    try:
        query = db.query(models.Report).options(
            joinedload(models.Report.user)
        )
        
        if status:
            query = query.filter(models.Report.status == status)
        
        # Order by newest first
        query = query.order_by(models.Report.created_at.desc())
        reports = query.offset(skip).limit(limit).all()
        return reports
    except Exception as e:
        import traceback
        print(f"Error fetching agent reports: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/agent/reports/{report_id}", response_model=schemas.ReportWithUser)
def get_report_for_agent(
    report_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific report with user info. Only accessible by agents and admins."""
    if current_user.role not in [models.UserRole.agent, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized. Agent role required.")
    
    report = db.query(models.Report).options(
        joinedload(models.Report.user)
    ).filter(models.Report.id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@app.put("/agent/reports/{report_id}/verify", response_model=schemas.Report)
def verify_report(
    report_id: int,
    verification: schemas.ReportUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Verify/update a report status. Only accessible by agents and admins."""
    if current_user.role not in [models.UserRole.agent, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized. Agent role required.")
    
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    for key, value in verification.dict(exclude_unset=True).items():
        # Handle Enum values
        if hasattr(value, 'value'):
            value = value.value
        setattr(report, key, value)
    
    # If status is verified, set verified_at
    if verification.status == models.ReportStatus.VERIFIED:
        report.verified_at = datetime.utcnow()
    
    db.commit()
    db.refresh(report)
    return report

@app.get("/agent/stats")
def get_agent_stats(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get statistics for the agent dashboard."""
    if current_user.role not in [models.UserRole.agent, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized. Agent role required.")
    
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    # Total pending reports
    pending_count = db.query(models.Report).filter(
        models.Report.status == models.ReportStatus.PENDING
    ).count()
    
    # Reports created today
    today = datetime.utcnow().date()
    today_count = db.query(models.Report).filter(
        func.date(models.Report.created_at) == today
    ).count()
    
    # Total reports
    total_count = db.query(models.Report).count()
    
    # Resolved reports
    resolved_count = db.query(models.Report).filter(
        models.Report.status == models.ReportStatus.RESOLVED
    ).count()
    
    return {
        "pending": pending_count,
        "today": today_count,
        "total": total_count,
        "resolved": resolved_count
    }

# Agent Notification endpoints
@app.get("/agent/notifications", response_model=List[schemas.Notification])
def get_agent_notifications(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get notifications for the current agent."""
    if current_user.role not in [models.UserRole.agent, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized. Agent role required.")
    
    notifications = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).limit(50).all()
    
    return notifications

@app.get("/agent/notifications/unread-count")
def get_unread_notification_count(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications for the current agent."""
    if current_user.role not in [models.UserRole.agent, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized. Agent role required.")
    
    count = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == 0
    ).count()
    
    return {"unread_count": count}

@app.put("/agent/notifications/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read."""
    if current_user.role not in [models.UserRole.agent, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized. Agent role required.")
    
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = 1
    db.commit()
    
    return {"message": "Notification marked as read"}

@app.put("/agent/notifications/mark-all-read")
def mark_all_notifications_as_read(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for the current agent."""
    if current_user.role not in [models.UserRole.agent, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized. Agent role required.")
    
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == 0
    ).update({"is_read": 1})
    db.commit()
    
    return {"message": "All notifications marked as read"}

# Municipal Authority endpoints
@app.post("/init-municipal")
def init_municipal(db: Session = Depends(get_db)):
    """Initialize municipal authority user."""
    # Check if municipal user already exists
    municipal = db.query(models.User).filter(models.User.email == "municipal@bilagh.dz").first()
    if municipal:
        return {"message": "Municipal user already exists", "email": municipal.email}
    
    # Create municipal user
    hashed_password = auth.get_password_hash("municipal123")
    municipal = models.User(
        email="municipal@bilagh.dz",
        username="municipal_authority",
        full_name="Municipal Authority",
        phone="+213555000000",
        hashed_password=hashed_password,
        role="municipal",
        points=0
    )
    db.add(municipal)
    db.commit()
    db.refresh(municipal)
    return {"message": "Municipal user created successfully", "email": municipal.email, "role": municipal.role}

@app.get("/municipal/reports", response_model=List[schemas.ReportWithUser])
def get_verified_reports_for_municipal(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all verified reports for municipal to approve/reject. Only accessible by municipal and admins."""
    if current_user.role not in [models.UserRole.municipal, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized. Municipal role required.")
    
    query = db.query(models.Report).options(
        joinedload(models.Report.user)
    )
    
    if status:
        query = query.filter(models.Report.status == status)
    else:
        # By default, show verified reports awaiting municipal action
        query = query.filter(models.Report.status.in_([
            models.ReportStatus.VERIFIED,
            models.ReportStatus.APPROVED,
            models.ReportStatus.ASSIGNED
        ]))
    
    query = query.order_by(models.Report.updated_at.desc())
    reports = query.offset(skip).limit(limit).all()
    return reports

@app.get("/municipal/all-reports", response_model=List[schemas.ReportWithUser])
def get_all_reports_for_municipal(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all reports for municipal overview. Only accessible by municipal and admins."""
    if current_user.role not in [models.UserRole.municipal, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized. Municipal role required.")
    
    query = db.query(models.Report).options(
        joinedload(models.Report.user)
    ).order_by(models.Report.created_at.desc())
    
    reports = query.offset(skip).limit(limit).all()
    return reports

@app.put("/municipal/reports/{report_id}/approve")
def approve_report(
    report_id: int,
    notes: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Approve a verified report. Only accessible by municipal and admins."""
    if current_user.role not in [models.UserRole.municipal, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized. Municipal role required.")
    
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    from datetime import datetime
    report.status = "approved"  # Use lowercase string for database compatibility
    report.municipal_notes = notes
    report.approved_at = datetime.utcnow()
    
    # Create notification for all agents
    agents = db.query(models.User).filter(models.User.role == models.UserRole.agent).all()
    for agent in agents:
        notification = models.Notification(
            user_id=agent.id,
            title="Report Approved",
            message=f"Report #{report.id} ({report.type}) at {report.location} has been approved by municipal.",
            type="info",
            report_id=report.id
        )
        db.add(notification)
    
    db.commit()
    db.refresh(report)
    return {"message": "Report approved successfully", "report_id": report.id, "status": report.status.value}

@app.put("/municipal/reports/{report_id}/reject")
def reject_report(
    report_id: int,
    notes: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Reject a report. Only accessible by municipal and admins."""
    if current_user.role not in [models.UserRole.municipal, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized. Municipal role required.")
    
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report.status = "rejected"  # Use lowercase string for database compatibility
    report.municipal_notes = notes
    
    # Create notification for all agents
    agents = db.query(models.User).filter(models.User.role == models.UserRole.agent).all()
    for agent in agents:
        notification = models.Notification(
            user_id=agent.id,
            title="Report Rejected",
            message=f"Report #{report.id} ({report.type}) at {report.location} has been rejected by municipal." + (f" Reason: {notes}" if notes else ""),
            type="alert",
            report_id=report.id
        )
        db.add(notification)
    
    db.commit()
    db.refresh(report)
    return {"message": "Report rejected", "report_id": report.id, "status": report.status.value}

@app.put("/municipal/reports/{report_id}/assign")
def assign_report_to_agent(
    report_id: int,
    agent_id: int,
    notes: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Assign an approved report to an agent for repair. Only accessible by municipal and admins."""
    if current_user.role not in [models.UserRole.municipal, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized. Municipal role required.")
    
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Verify the agent exists and has agent role
    agent = db.query(models.User).filter(models.User.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.role != models.UserRole.agent:
        raise HTTPException(status_code=400, detail="User is not an agent")
    
    report.status = "assigned"  # Use lowercase string for database compatibility
    report.assigned_agent_id = agent_id
    if notes:
        report.municipal_notes = notes
    
    # Create notification for the agent
    notification = models.Notification(
        user_id=agent_id,
        title="New Task Assigned",
        message=f"You have been assigned a new repair task: {report.type} at {report.location}",
        type="task",
        report_id=report.id
    )
    db.add(notification)
    
    db.commit()
    db.refresh(report)
    return {
        "message": "Report assigned to agent successfully", 
        "report_id": report.id, 
        "assigned_agent": agent.full_name or agent.username,
        "status": report.status.value
    }

@app.get("/municipal/agents")
def get_available_agents(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of available agents for task assignment. Only accessible by municipal and admins."""
    if current_user.role not in [models.UserRole.municipal, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized. Municipal role required.")
    
    agents = db.query(models.User).filter(models.User.role == models.UserRole.agent).all()
    return [{"id": a.id, "name": a.full_name or a.username, "email": a.email} for a in agents]

@app.get("/municipal/stats")
def get_municipal_stats(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get statistics for municipal dashboard. Only accessible by municipal and admins."""
    if current_user.role not in [models.UserRole.municipal, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized. Municipal role required.")
    
    from sqlalchemy import func
    
    stats = {
        "total": db.query(models.Report).count(),
        "pending": db.query(models.Report).filter(models.Report.status == models.ReportStatus.PENDING).count(),
        "verified": db.query(models.Report).filter(models.Report.status == models.ReportStatus.VERIFIED).count(),
        "approved": db.query(models.Report).filter(models.Report.status == models.ReportStatus.APPROVED).count(),
        "rejected": db.query(models.Report).filter(models.Report.status == models.ReportStatus.REJECTED).count(),
        "assigned": db.query(models.Report).filter(models.Report.status == models.ReportStatus.ASSIGNED).count(),
        "in_progress": db.query(models.Report).filter(models.Report.status == models.ReportStatus.IN_PROGRESS).count(),
        "resolved": db.query(models.Report).filter(models.Report.status == models.ReportStatus.RESOLVED).count(),
    }
    
    return stats

# Prediction endpoints
@app.post("/predict")
async def predict_damage(
    file: UploadFile = File(...)
):
    """
    Analyze an uploaded image for road damage using the ML model.
    Returns damage type, severity, and confidence levels.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read image data
        image_data = await file.read()
        
        # Perform prediction
        result = predict.predict_damage(image_data)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.get("/predict/model-info")
def get_model_info():
    """
    Get information about the loaded ML model.
    """
    return predict.get_model_info()


# Health check
@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

