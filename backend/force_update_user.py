"""
Force update/create test user with correct password
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def update_test_user():
    client = AsyncIOMotorClient(DATABASE_URL)
    db = client.bilagh
    
    hashed_password = pwd_context.hash("test123")
    
    # Update or insert
    await db.users.update_one(
        {"email": "test@bilagh.dz"},
        {"$set": {
            "username": "testuser",
            "full_name": "Test User",
            "phone": "+213555000000",
            "hashed_password": hashed_password,
            "role": "USER",
            "points": 0,
            "updated_at": datetime.utcnow()
        }},
        upsert=True
    )
    
    print(f"\n>>> Test user updated/created successfully!")
    print(f"Email: test@bilagh.dz")
    print(f"Password: test123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(update_test_user())
