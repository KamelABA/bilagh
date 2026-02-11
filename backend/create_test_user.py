"""
Quick script to create a test user in MongoDB for login testing
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

async def create_test_user():
    client = AsyncIOMotorClient(DATABASE_URL)
    db = client.bilagh
    
    # Check if user exists
    existing = await db.users.find_one({"email": "test@bilagh.dz"})
    if existing:
        print("Test user already exists!")
        print(f"Email: test@bilagh.dz")
        print(f"Password: test123")
        return
    
    # Create test user
    test_user = {
        "email": "test@bilagh.dz",
        "username": "testuser",
        "full_name": "Test User",
        "phone": "+213555000000",
        "hashed_password": pwd_context.hash("test123"),
        "role": "user",
        "points": 0,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(test_user)
    print(f"\n>>> Test user created successfully!")
    print(f"Email: test@bilagh.dz")
    print(f"Password: test123")
    print(f"Role: user")
    print(f"\nYou can now login with these credentials in the mobile app.")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_user())
