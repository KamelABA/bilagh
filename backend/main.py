from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from typing import List, Optional, Dict, Any
from datetime import timedelta, datetime
import auth
from database import db
import os
from dotenv import load_dotenv
import predict
import cloudinary_config
import geometric_analysis
import risk_assessment
from models import UserRole, ReportStatus
import schemas
from bson import ObjectId

load_dotenv()

app = FastAPI(title="Bilagh API", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helpers
def fix_id(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
    return doc

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to Bilagh API (MongoDB)", "version": "1.0.0"}

# Authentication
@app.post("/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
async def register(user: schemas.UserCreate):
    if await db.users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await db.users.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Username already taken")
    
    hashed_password = auth.get_password_hash(user.password)
    user_dict = user.dict()
    user_dict.pop("password")
    
    new_user = {
        **user_dict,
        "hashed_password": hashed_password,
        "role": UserRole.USER,
        "points": 0,
        "created_at": datetime.utcnow()
    }
    result = await db.users.insert_one(new_user)
    new_user["id"] = str(result.inserted_id)
    return new_user

@app.post("/token", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.users.find_one({"email": form_data.username})
    if not user or not auth.verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    
    access_token = auth.create_access_token(
        data={"sub": user["email"]}, 
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: schemas.User = Depends(auth.get_current_user)):
    return current_user

# Initialization
@app.post("/init-agent")
async def init_agent():
    if await db.users.find_one({"email": "agent@bilagh.dz"}):
        return {"message": "Agent already exists"}
    
    new_agent = {
        "email": "agent@bilagh.dz",
        "username": "field_agent",
        "full_name": "Field Agent",
        "phone": "+213555123456",
        "hashed_password": auth.get_password_hash("agent123"),
        "role": UserRole.agent,
        "points": 0,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(new_agent)
    return {"message": "Agent created successfully"}

@app.post("/init-municipal")
async def init_municipal():
    if await db.users.find_one({"email": "municipal@bilagh.dz"}):
        return {"message": "Municipal already exists"}
    
    new_muni = {
        "email": "municipal@bilagh.dz",
        "username": "municipal_authority",
        "full_name": "Municipal Authority",
        "phone": "+213555000000",
        "hashed_password": auth.get_password_hash("municipal123"),
        "role": UserRole.municipal,
        "points": 0,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(new_muni)
    return {"message": "Municipal created successfully"}

# Image Upload
@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...), current_user: schemas.User = Depends(auth.get_current_user)):
    allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")
    
    try:
        result = cloudinary_config.upload_image(contents)
        return {
            "success": True, "url": result["url"], "public_id": result["public_id"],
            "width": result.get("width"), "height": result.get("height"),
            "format": result.get("format"), "size_bytes": result.get("bytes")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# User Reports
@app.post("/reports", response_model=schemas.Report, status_code=status.HTTP_201_CREATED)
async def create_report(report: schemas.ReportCreate, current_user: schemas.User = Depends(auth.get_current_user)):
    new_report = report.dict()
    new_report.update({
        "user_id": current_user.id,
        "status": ReportStatus.PENDING,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    res = await db.reports.insert_one(new_report)
    await db.users.update_one({"_id": ObjectId(current_user.id)}, {"$inc": {"points": 10}})
    new_report["id"] = str(res.inserted_id)
    return new_report

@app.get("/reports", response_model=List[schemas.Report])
async def get_reports(skip: int = 0, limit: int = 100, status: Optional[str] = None, current_user: schemas.User = Depends(auth.get_current_user)):
    query = {"user_id": current_user.id}
    if status: query["status"] = status
    cursor = db.reports.find(query).skip(skip).limit(limit)
    return [fix_id(r) for r in await cursor.to_list(length=limit)]

@app.get("/reports/{report_id}", response_model=schemas.Report)
async def get_report(report_id: str, current_user: schemas.User = Depends(auth.get_current_user)):
    if not ObjectId.is_valid(report_id): raise HTTPException(status_code=400, detail="Invalid ID")
    report = await db.reports.find_one({"_id": ObjectId(report_id), "user_id": current_user.id})
    if not report: raise HTTPException(status_code=404, detail="Report not found")
    return fix_id(report)

@app.put("/reports/{report_id}", response_model=schemas.Report)
async def update_report(report_id: str, report_update: schemas.ReportUpdate, current_user: schemas.User = Depends(auth.get_current_user)):
    if not ObjectId.is_valid(report_id): raise HTTPException(status_code=400, detail="Invalid ID")
    update_data = report_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    res = await db.reports.update_one({"_id": ObjectId(report_id), "user_id": current_user.id}, {"$set": update_data})
    if res.matched_count == 0: raise HTTPException(status_code=404, detail="Report not found")
    return fix_id(await db.reports.find_one({"_id": ObjectId(report_id)}))

@app.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(report_id: str, current_user: schemas.User = Depends(auth.get_current_user)):
    if not ObjectId.is_valid(report_id): raise HTTPException(status_code=400, detail="Invalid ID")
    res = await db.reports.delete_one({"_id": ObjectId(report_id), "user_id": current_user.id})
    if res.deleted_count == 0: raise HTTPException(status_code=404, detail="Report not found")
    return None

# Agent Endpoints
@app.get("/agent/reports", response_model=List[schemas.ReportWithUser])
async def get_all_reports_for_agent(skip: int = 0, limit: int = 100, status: Optional[str] = None, current_user: schemas.User = Depends(auth.get_current_user)):
    if current_user.role not in [UserRole.agent, UserRole.ADMIN]: raise HTTPException(status_code=403, detail="Not authorized")
    
    match = {"status": status} if status else {}
    pipeline = [
        {"$match": match}, {"$sort": {"created_at": -1}}, {"$skip": skip}, {"$limit": limit},
        {"$addFields": {"userObjectId": {"$toObjectId": "$user_id"}}},
        {"$lookup": {"from": "users", "localField": "userObjectId", "foreignField": "_id", "as": "user_info"}},
        {"$unwind": "$user_info"},
        {"$project": {"userObjectId": 0, "user_info.hashed_password": 0}}
    ]
    results = await db.reports.aggregate(pipeline).to_list(length=limit)
    return [fix_id({**r, "user": fix_id(r["user_info"])}) for r in results]

@app.get("/agent/reports/{report_id}", response_model=schemas.ReportWithUser)
async def get_report_for_agent(report_id: str, current_user: schemas.User = Depends(auth.get_current_user)):
    if current_user.role not in [UserRole.agent, UserRole.ADMIN]: raise HTTPException(status_code=403, detail="Not authorized")
    if not ObjectId.is_valid(report_id): raise HTTPException(status_code=400, detail="Invalid ID")
    
    pipeline = [
        {"$match": {"_id": ObjectId(report_id)}},
        {"$addFields": {"userObjectId": {"$toObjectId": "$user_id"}}},
        {"$lookup": {"from": "users", "localField": "userObjectId", "foreignField": "_id", "as": "user_info"}},
        {"$unwind": "$user_info"},
        {"$project": {"userObjectId": 0, "user_info.hashed_password": 0}}
    ]
    results = await db.reports.aggregate(pipeline).to_list(length=1)
    if not results: raise HTTPException(status_code=404, detail="Report not found")
    r = results[0]
    return fix_id({**r, "user": fix_id(r["user_info"])})

@app.put("/agent/reports/{report_id}/verify", response_model=schemas.Report)
async def verify_report(report_id: str, verification: schemas.ReportUpdate, current_user: schemas.User = Depends(auth.get_current_user)):
    if current_user.role not in [UserRole.agent, UserRole.ADMIN]: raise HTTPException(status_code=403, detail="Not authorized")
    if not ObjectId.is_valid(report_id): raise HTTPException(status_code=400, detail="Invalid ID")
    
    update_data = verification.dict(exclude_unset=True)
    if verification.status == ReportStatus.VERIFIED: update_data["verified_at"] = datetime.utcnow()
    
    res = await db.reports.update_one({"_id": ObjectId(report_id)}, {"$set": update_data})
    if res.matched_count == 0: raise HTTPException(status_code=404, detail="Report not found")
    return fix_id(await db.reports.find_one({"_id": ObjectId(report_id)}))

@app.get("/agent/stats")
async def get_agent_stats(current_user: schemas.User = Depends(auth.get_current_user)):
    if current_user.role not in [UserRole.agent, UserRole.ADMIN]: raise HTTPException(status_code=403, detail="Not authorized")
    
    today_start = datetime.combine(datetime.utcnow().date(), datetime.min.time())
    return {
        "pending": await db.reports.count_documents({"status": ReportStatus.PENDING}),
        "today": await db.reports.count_documents({"created_at": {"$gte": today_start}}),
        "total": await db.reports.count_documents({}),
        "resolved": await db.reports.count_documents({"status": ReportStatus.RESOLVED})
    }

@app.get("/agent/notifications", response_model=List[schemas.Notification])
async def get_agent_notifications(current_user: schemas.User = Depends(auth.get_current_user)):
    if current_user.role not in [UserRole.agent, UserRole.ADMIN]: raise HTTPException(status_code=403, detail="Not authorized")
    cursor = db.notifications.find({"user_id": current_user.id}).sort("created_at", -1).limit(50)
    return [fix_id(n) for n in await cursor.to_list(length=50)]

@app.get("/agent/notifications/unread-count")
async def get_unread_notification_count(current_user: schemas.User = Depends(auth.get_current_user)):
    if current_user.role not in [UserRole.agent, UserRole.ADMIN]: raise HTTPException(status_code=403, detail="Not authorized")
    count = await db.notifications.count_documents({"user_id": current_user.id, "is_read": 0})
    return {"unread_count": count}

@app.put("/agent/notifications/{notification_id}/read")
async def mark_notification_as_read(notification_id: str, current_user: schemas.User = Depends(auth.get_current_user)):
    if current_user.role not in [UserRole.agent, UserRole.ADMIN]: raise HTTPException(status_code=403, detail="Not authorized")
    if not ObjectId.is_valid(notification_id): raise HTTPException(status_code=400, detail="Invalid ID")
    await db.notifications.update_one({"_id": ObjectId(notification_id), "user_id": current_user.id}, {"$set": {"is_read": 1}})
    return {"message": "Marked as read"}

@app.put("/agent/notifications/mark-all-read")
async def mark_all_notifications_as_read(current_user: schemas.User = Depends(auth.get_current_user)):
    if current_user.role not in [UserRole.agent, UserRole.ADMIN]: raise HTTPException(status_code=403, detail="Not authorized")
    await db.notifications.update_many({"user_id": current_user.id, "is_read": 0}, {"$set": {"is_read": 1}})
    return {"message": "All marked as read"}

# Municipal Endpoints
@app.get("/municipal/reports", response_model=List[schemas.ReportWithUser])
async def get_verified_reports_for_municipal(skip: int = 0, limit: int = 100, status: Optional[str] = None, current_user: schemas.User = Depends(auth.get_current_user)):
    if current_user.role not in [UserRole.municipal, UserRole.ADMIN]: raise HTTPException(status_code=403, detail="Not authorized")
    
    statuses = [status] if status else [ReportStatus.VERIFIED, ReportStatus.APPROVED, ReportStatus.ASSIGNED]
    pipeline = [
        {"$match": {"status": {"$in": statuses}}}, {"$sort": {"updated_at": -1}}, {"$skip": skip}, {"$limit": limit},
        {"$addFields": {"userObjectId": {"$toObjectId": "$user_id"}}},
        {"$lookup": {"from": "users", "localField": "userObjectId", "foreignField": "_id", "as": "user_info"}},
        {"$unwind": "$user_info"}, {"$project": {"userObjectId": 0, "user_info.hashed_password": 0}}
    ]
    results = await db.reports.aggregate(pipeline).to_list(length=limit)
    return [fix_id({**r, "user": fix_id(r["user_info"])}) for r in results]

@app.put("/municipal/reports/{report_id}/approve")
async def approve_report(report_id: str, notes: Optional[str] = None, current_user: schemas.User = Depends(auth.get_current_user)):
    if current_user.role not in [UserRole.municipal, UserRole.ADMIN]: raise HTTPException(status_code=403, detail="Not authorized")
    if not ObjectId.is_valid(report_id): raise HTTPException(status_code=400, detail="Invalid ID")
    
    upd = {"status": ReportStatus.APPROVED, "municipal_notes": notes, "approved_at": datetime.utcnow()}
    res = await db.reports.update_one({"_id": ObjectId(report_id)}, {"$set": upd})
    if res.matched_count == 0: raise HTTPException(status_code=404, detail="Report not found")
    
    # Notifications
    agents = await db.users.find({"role": UserRole.agent}).to_list(length=100)
    notifs = [{
        "user_id": str(a["_id"]), "title": "Report Approved", "message": f"Report has been approved.",
        "type": "info", "report_id": report_id, "is_read": 0, "created_at": datetime.utcnow()
    } for a in agents]
    if notifs: await db.notifications.insert_many(notifs)
    return {"message": "Approved"}

@app.put("/municipal/reports/{report_id}/reject")
async def reject_report(report_id: str, notes: Optional[str] = None, current_user: schemas.User = Depends(auth.get_current_user)):
    if current_user.role not in [UserRole.municipal, UserRole.ADMIN]: raise HTTPException(status_code=403, detail="Not authorized")
    if not ObjectId.is_valid(report_id): raise HTTPException(status_code=400, detail="Invalid ID")
    
    upd = {"status": ReportStatus.REJECTED, "municipal_notes": notes}
    res = await db.reports.update_one({"_id": ObjectId(report_id)}, {"$set": upd})
    if res.matched_count == 0: raise HTTPException(status_code=404, detail="Report not found")
    
    agents = await db.users.find({"role": UserRole.agent}).to_list(length=100)
    notifs = [{
        "user_id": str(a["_id"]), "title": "Report Rejected", "message": f"Report rejected. {notes or ''}",
        "type": "alert", "report_id": report_id, "is_read": 0, "created_at": datetime.utcnow()
    } for a in agents]
    if notifs: await db.notifications.insert_many(notifs)
    return {"message": "Rejected"}

@app.put("/municipal/reports/{report_id}/assign")
async def assign_report(report_id: str, agent_id: str, notes: Optional[str] = None, current_user: schemas.User = Depends(auth.get_current_user)):
    if current_user.role not in [UserRole.municipal, UserRole.ADMIN]: raise HTTPException(status_code=403, detail="Not authorized")
    if not ObjectId.is_valid(report_id) or not ObjectId.is_valid(agent_id): raise HTTPException(status_code=400, detail="Invalid ID")
    
    agent = await db.users.find_one({"_id": ObjectId(agent_id), "role": UserRole.agent})
    if not agent: raise HTTPException(status_code=404, detail="Agent not found")
    
    upd = {"status": ReportStatus.ASSIGNED, "assigned_agent_id": agent_id, "municipal_notes": notes}
    res = await db.reports.update_one({"_id": ObjectId(report_id)}, {"$set": upd})
    if res.matched_count == 0: raise HTTPException(status_code=404, detail="Report not found")
    
    await db.notifications.insert_one({
        "user_id": agent_id, "title": "New Task", "message": "You have a new assignment.",
        "type": "task", "report_id": report_id, "is_read": 0, "created_at": datetime.utcnow()
    })
    return {"message": "Assigned"}

@app.get("/municipal/agents")
async def get_available_agents(current_user: schemas.User = Depends(auth.get_current_user)):
    if current_user.role not in [UserRole.municipal, UserRole.ADMIN]: raise HTTPException(status_code=403, detail="Not authorized")
    agents = await db.users.find({"role": UserRole.agent}).to_list(length=100)
    return [{"id": str(a["_id"]), "name": a.get("full_name", a["username"]), "email": a["email"]} for a in agents]

@app.get("/municipal/stats")
async def get_municipal_stats(current_user: schemas.User = Depends(auth.get_current_user)):
    if current_user.role not in [UserRole.municipal, UserRole.ADMIN]: raise HTTPException(status_code=403, detail="Not authorized")
    return {
        "total": await db.reports.count_documents({}),
        "pending": await db.reports.count_documents({"status": ReportStatus.PENDING}),
        "verified": await db.reports.count_documents({"status": ReportStatus.VERIFIED}),
        "approved": await db.reports.count_documents({"status": ReportStatus.APPROVED}),
        "rejected": await db.reports.count_documents({"status": ReportStatus.REJECTED}),
        "assigned": await db.reports.count_documents({"status": ReportStatus.ASSIGNED}),
        "in_progress": await db.reports.count_documents({"status": ReportStatus.IN_PROGRESS}),
        "resolved": await db.reports.count_documents({"status": ReportStatus.RESOLVED})
    }

# AI Endpoints
@app.post("/predict")
async def predict_damage(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"): raise HTTPException(status_code=400, detail="Image required")
    try: return predict.predict_damage(await file.read())
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/predict/model-info")
def get_model_info():
    return predict.get_model_info()

@app.post("/analyze-geometry")
async def analyze_road_damage_geometry(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"): raise HTTPException(status_code=400, detail="Image required")
    try: return geometric_analysis.analyze_road_damage_geometry(await file.read())
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.post("/assess-risk")
async def assess_road_damage_risk(
    damage_type: str, length_cm: float, width_cm: float, depth_cm: float, 
    road_type: str = "secondary", material: str = "asphalt", 
    volume_cm3: Optional[float] = None, severity_score: Optional[float] = None
):
    return risk_assessment.assess_risk(damage_type, length_cm, width_cm, depth_cm, volume_cm3, road_type, material, severity_score)

@app.post("/analyze-complete")
async def complete_analysis(file: UploadFile = File(...), road_type: str = "secondary", material: str = "asphalt"):
    if not file.content_type.startswith("image/"): raise HTTPException(status_code=400, detail="Image required")
    try:
        content = await file.read()
        geo = geometric_analysis.analyze_road_damage_geometry(content)
        if not geo.get("success") or not geo.get("detected"):
            return {"success": False, "detected": False, "message": "No damage", "geometry": geo, "risk_assessment": None}
        
        m = geo.get("measurements", {})
        risk = risk_assessment.assess_risk(
            geo.get("damage_type", "unknown"), m.get("length_cm", 0), m.get("width_cm", 0), m.get("estimated_depth_cm", 0),
            m.get("approx_volume_cm3"), road_type, material, geo.get("confidence", 0)
        )
        return {"success": True, "detected": True, "damage_type": geo.get("damage_type"), "geometry": geo, "risk_assessment": risk}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/analyze-complete-url")
async def complete_analysis_by_url(image_url: str, road_type: str = "secondary", material: str = "asphalt"):
    """
    Analyze road damage from an image URL (used by agent verification screen).
    Downloads the image and performs geometric + risk analysis.
    """
    import httpx
    
    if not image_url:
        raise HTTPException(status_code=400, detail="image_url is required")
    
    try:
        # Download the image
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(image_url)
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Failed to download image: HTTP {response.status_code}")
            content = response.content
        
        # Perform analysis
        geo = geometric_analysis.analyze_road_damage_geometry(content)
        if not geo.get("success") or not geo.get("detected"):
            return {"success": False, "detected": False, "message": "No damage detected", "geometry": geo, "risk_assessment": None}
        
        m = geo.get("measurements", {})
        risk = risk_assessment.assess_risk(
            geo.get("damage_type", "unknown"), 
            m.get("length_cm", 0), 
            m.get("width_cm", 0), 
            m.get("estimated_depth_cm", 0),
            m.get("approx_volume_cm3"), 
            road_type, 
            material, 
            geo.get("confidence", 0)
        )
        return {
            "success": True, 
            "detected": True, 
            "damage_type": geo.get("damage_type"), 
            "geometry": geo, 
            "risk_assessment": risk
        }
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Failed to download image: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Vercel serverless handler
handler = app

