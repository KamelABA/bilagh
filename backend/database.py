from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

# MongoDB Atlas connection string
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("WARNING: DATABASE_URL not found in environment variables")
    print("Please set DATABASE_URL in your .env file")
    # Use a placeholder that will fail gracefully
    DATABASE_URL = "mongodb://localhost:27017"

try:
    client = AsyncIOMotorClient(DATABASE_URL, serverSelectionTimeoutMS=5000)
    db = client.bilagh
    print(f"MongoDB client initialized for database: bilagh")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    db = None

# Helper to get database
async def get_db():
    return db
