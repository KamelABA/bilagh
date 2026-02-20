from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import asyncio

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def test_conn():
    if not DATABASE_URL:
        print("DATABASE_URL not found")
        return
    
    print(f"Connecting to: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    try:
        client = AsyncIOMotorClient(DATABASE_URL, serverSelectionTimeoutMS=5000)
        await client.admin.command('ping')
        print("Ping successful!")
        db = client.bilagh
        user_count = await db.users.count_documents({})
        print(f"User count: {user_count}")
        test_user = await db.users.find_one({"email": "test@bilagh.dz"})
        print(f"Test user found: {test_user is not None}")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_conn())
