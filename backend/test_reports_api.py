from pymongo import MongoClient
import requests
import json
import auth

db_url = "mongodb+srv://kamelbilagh:kamelbilagh@cluster0.6vbwfjv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(db_url)
db = client.bilagh
user = db.users.find_one({"email": "kamel.aba@outlook.com"})

if user:
    # generate a valid token manually using backend auth code
    token = auth.create_access_token(data={"sub": user["email"]})
    print(f"Token: {token[:20]}...")
    
    res = requests.get("https://web-production-2a2b6.up.railway.app/reports/map", headers={"Authorization": f"Bearer {token}"})
    print("Status:", res.status_code)
    try:
        data = res.json()
        print("Total reports returned:", len(data) if isinstance(data, list) else data.get('detail', data))
    except Exception as e:
        print("Error parsing json:", e)
        print("Response text:", res.text[:200])
