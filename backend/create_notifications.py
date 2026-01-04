"""Script to create notifications table"""
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgre14@localhost:5432/bilagh")
engine = create_engine(DATABASE_URL)

def create_notifications_table():
    with engine.connect() as conn:
        # Check if table exists
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'notifications'
            )
        """))
        exists = result.scalar()
        
        if exists:
            print("Notifications table already exists")
            return
        
        print("Creating notifications table...")
        conn.execute(text("""
            CREATE TABLE notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                title VARCHAR NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR DEFAULT 'info',
                report_id INTEGER REFERENCES reports(id),
                is_read INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()
        print("Notifications table created successfully!")

if __name__ == "__main__":
    create_notifications_table()
