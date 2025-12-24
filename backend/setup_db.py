"""
PostgreSQL Database Setup Script
Run this to create tables in PostgreSQL database
"""
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv
import os

load_dotenv()

# Database connection parameters
DB_HOST = "localhost"
DB_PORT = "5432"
DB_USER = "postgres"
DB_PASSWORD = "postgre14"  # Change this to your PostgreSQL password
DB_NAME = "bilagh"

def create_database():
    """Create the bilagh database if it doesn't exist"""
    try:
        # Connect to default postgres database
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database="postgres"
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
        exists = cursor.fetchone()
        
        if not exists:
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(DB_NAME)))
            print(f"✅ Database '{DB_NAME}' created successfully!")
        else:
            print(f"ℹ️  Database '{DB_NAME}' already exists")
        
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Error creating database: {e}")
        return False

def create_tables():
    """Create tables using SQLAlchemy models"""
    try:
        from database import engine, Base
        from models import User, Report
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully!")
        
        # Verify tables
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        print("\n📊 Created tables:")
        for table in tables:
            print(f"  - {table}")
            columns = inspector.get_columns(table)
            print(f"    Columns: {len(columns)}")
        
        return True
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

def test_connection():
    """Test database connection"""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"\n✅ Connected to PostgreSQL!")
        print(f"   Version: {version[0][:50]}...")
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

def main():
    print("=" * 60)
    print("BILAGH POSTGRESQL DATABASE SETUP")
    print("=" * 60)
    
    print("\n1️⃣  Creating database...")
    if not create_database():
        print("\n⚠️  Please check your PostgreSQL installation and credentials")
        return
    
    print("\n2️⃣  Testing connection...")
    if not test_connection():
        return
    
    print("\n3️⃣  Creating tables...")
    if not create_tables():
        return
    
    print("\n" + "=" * 60)
    print("✅ DATABASE SETUP COMPLETE!")
    print("=" * 60)
    print("\n🚀 You can now run: python main.py")
    print(f"📊 Database: {DB_NAME}")
    print(f"🔗 Connection: postgresql://{DB_USER}:***@{DB_HOST}:{DB_PORT}/{DB_NAME}")

if __name__ == "__main__":
    main()
