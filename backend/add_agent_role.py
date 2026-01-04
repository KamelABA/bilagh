"""Script to add 'agent' role to the userrole enum in PostgreSQL"""
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgre14@localhost:5432/bilagh")

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # Check if 'agent' already exists in enum
    result = conn.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'agent' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'userrole')
        )
    """))
    exists = result.scalar()
    
    if not exists:
        # Add agent to enum - must be done outside transaction
        conn.execute(text("COMMIT"))
        conn.execute(text("ALTER TYPE userrole ADD VALUE 'agent'"))
        print("Added 'agent' to userrole enum")
    else:
        print("'agent' already exists in userrole enum")

print("Done!")
