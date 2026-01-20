"""
PostgreSQL to MongoDB Migration Script
Transfers all data from PostgreSQL to MongoDB Atlas
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from bson import ObjectId

# PostgreSQL connection
POSTGRES_URL = "postgresql://postgres:postgre14@localhost:5432/bilagh"

# MongoDB connection
MONGO_URL = "mongodb+srv://kamelbilagh:kamelbilagh@cluster0.6vbwfjv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

async def migrate():
    print("=" * 60)
    print("PostgreSQL to MongoDB Migration")
    print("=" * 60)
    
    # Connect to PostgreSQL
    print("\n[1/5] Connecting to PostgreSQL...")
    try:
        pg_conn = psycopg2.connect(POSTGRES_URL, cursor_factory=RealDictCursor)
        pg_cursor = pg_conn.cursor()
        print("[OK] Connected to PostgreSQL")
    except Exception as e:
        print(f"[ERROR] Failed to connect to PostgreSQL: {e}")
        return
    
    # Connect to MongoDB
    print("\n[2/5] Connecting to MongoDB Atlas...")
    try:
        mongo_client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=10000)
        mongo_db = mongo_client.bilagh
        # Test connection
        await mongo_client.admin.command('ping')
        print("[OK] Connected to MongoDB Atlas")
    except Exception as e:
        print(f"[ERROR] Failed to connect to MongoDB: {e}")
        pg_conn.close()
        return
    
    user_id_map = {}
    report_id_map = {}
    
    # Migrate Users
    print("\n[3/5] Migrating Users...")
    try:
        pg_cursor.execute("SELECT * FROM users")
        users = pg_cursor.fetchall()
        print(f"   Found {len(users)} users in PostgreSQL")
        
        if users:
            mongo_users = []
            
            for user in users:
                new_id = ObjectId()
                user_id_map[user['id']] = str(new_id)
                
                mongo_user = {
                    "_id": new_id,
                    "email": user['email'],
                    "username": user['username'],
                    "full_name": user.get('full_name'),
                    "phone": user.get('phone'),
                    "hashed_password": user['hashed_password'],
                    "role": user.get('role', 'USER'),
                    "points": user.get('points', 0),
                    "created_at": user.get('created_at', datetime.utcnow())
                }
                mongo_users.append(mongo_user)
            
            # Clear existing users and insert new
            await mongo_db.users.delete_many({})
            await mongo_db.users.insert_many(mongo_users)
            print(f"   [OK] Migrated {len(mongo_users)} users")
        else:
            print("   No users to migrate")
    except Exception as e:
        print(f"   [ERROR] Error migrating users: {e}")
    
    # Migrate Reports
    print("\n[4/5] Migrating Reports...")
    try:
        pg_cursor.execute("SELECT * FROM reports")
        reports = pg_cursor.fetchall()
        print(f"   Found {len(reports)} reports in PostgreSQL")
        
        if reports:
            mongo_reports = []
            
            for report in reports:
                new_id = ObjectId()
                report_id_map[report['id']] = str(new_id)
                
                # Map user_id to new MongoDB ID
                new_user_id = user_id_map.get(report['user_id'], str(report['user_id']))
                new_agent_id = None
                if report.get('assigned_agent_id'):
                    new_agent_id = user_id_map.get(report['assigned_agent_id'], str(report['assigned_agent_id']))
                
                mongo_report = {
                    "_id": new_id,
                    "user_id": new_user_id,
                    "type": report['type'],
                    "location": report['location'],
                    "latitude": report.get('latitude'),
                    "longitude": report.get('longitude'),
                    "description": report.get('description'),
                    "status": report.get('status', 'pending'),
                    "severity": report.get('severity', 'medium'),
                    "image_url": report.get('image_url'),
                    "assigned_agent_id": new_agent_id,
                    "municipal_notes": report.get('municipal_notes'),
                    "verified_at": report.get('verified_at'),
                    "approved_at": report.get('approved_at'),
                    "created_at": report.get('created_at', datetime.utcnow()),
                    "updated_at": report.get('updated_at', datetime.utcnow())
                }
                mongo_reports.append(mongo_report)
            
            await mongo_db.reports.delete_many({})
            await mongo_db.reports.insert_many(mongo_reports)
            print(f"   [OK] Migrated {len(mongo_reports)} reports")
        else:
            print("   No reports to migrate")
    except Exception as e:
        print(f"   [ERROR] Error migrating reports: {e}")
    
    # Migrate Notifications
    print("\n[5/5] Migrating Notifications...")
    try:
        pg_cursor.execute("SELECT * FROM notifications")
        notifications = pg_cursor.fetchall()
        print(f"   Found {len(notifications)} notifications in PostgreSQL")
        
        if notifications:
            mongo_notifications = []
            
            for notif in notifications:
                new_id = ObjectId()
                new_user_id = user_id_map.get(notif['user_id'], str(notif['user_id']))
                new_report_id = None
                if notif.get('report_id'):
                    new_report_id = report_id_map.get(notif['report_id'], str(notif['report_id']))
                
                mongo_notif = {
                    "_id": new_id,
                    "user_id": new_user_id,
                    "title": notif['title'],
                    "message": notif['message'],
                    "type": notif.get('type', 'info'),
                    "report_id": new_report_id,
                    "is_read": notif.get('is_read', 0),
                    "created_at": notif.get('created_at', datetime.utcnow())
                }
                mongo_notifications.append(mongo_notif)
            
            await mongo_db.notifications.delete_many({})
            await mongo_db.notifications.insert_many(mongo_notifications)
            print(f"   [OK] Migrated {len(mongo_notifications)} notifications")
        else:
            print("   No notifications to migrate")
    except Exception as e:
        print(f"   [ERROR] Error migrating notifications: {e}")
    
    # Cleanup
    pg_cursor.close()
    pg_conn.close()
    mongo_client.close()
    
    print("\n" + "=" * 60)
    print("Migration Complete!")
    print("=" * 60)
    
    # Summary
    print("\nSummary:")
    print(f"  Users:         {len(user_id_map)} migrated")
    print(f"  Reports:       {len(report_id_map)} migrated")
    print("\nNote: User IDs have changed. Users can still log in with same email/password.")

if __name__ == "__main__":
    asyncio.run(migrate())
