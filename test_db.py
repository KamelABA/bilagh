import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

async def test_conn():
    load_dotenv('backend/.env')
    url = os.getenv("DATABASE_URL")
    print(f"Testing connection to: {url}")
    client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=5000)
    try:
        # The ismaster command is cheap and does not require auth.
        await client.admin.command('ismaster')
        print("Successfully connected to MongoDB Atlas!")
        
        db = client.bilagh
        count = await db.users.count_documents({})
        print(f"Users count: {count}")
        
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_conn())
