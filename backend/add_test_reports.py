from pymongo import MongoClient
import uuid
from datetime import datetime
import json
import urllib.request
import base64

db_url = "mongodb+srv://kamelbilagh:kamelbilagh@cluster0.6vbwfjv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(db_url)
db = client.bilagh

print("Counting existing reports:", db.reports.count_documents({}))

try:
    user = db.users.find_one({"email": "kamel.aba@outlook.com"})
    if not user:
        user = db.users.find_one({}) # fallback
    
    if user:
        print("Using user:", user['email'])
        user_id = str(user.get('_id'))
    else:
        user_id = str(uuid.uuid4())
        
    reports = [
        {
            "_id": str(uuid.uuid4()),
            "type": "crack",
            "location": "Avenue de l'Indépendance, Algiers, Algeria", 
            "latitude": 36.752887,
            "longitude": 3.042048,
            "description": "Large longitudinal crack detected. Danger score: 26.5/100 (Low Risk)",
            "severity": "high",
            "status": "pending",
            "user_id": user_id,
            "image_url": "https://res.cloudinary.com/demo/image/upload/v1/crack_sample.jpg",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": str(uuid.uuid4()),
            "type": "pothole",
            "location": "Rue Didouche Mourad, Algiers, Algeria",
            "latitude": 36.76218,
            "longitude": 3.0528,
            "description": "Deep pothole causing hazard. Danger score: 65/100 (High Risk)",
            "severity": "high",
            "status": "pending",
            "user_id": user_id,
            "image_url": "https://res.cloudinary.com/demo/image/upload/v1/pothole_sample.jpg",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    db.reports.insert_many(reports)
    print("Successfully added mock damage reports to the database!")
except Exception as e:
    print("Error:", e)