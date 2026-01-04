"""Script to create agent user directly in database"""
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os
import bcrypt

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgre14@localhost:5432/bilagh")

# Hash password
password = "agent123"
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
hashed_password = hashed.decode('utf-8')

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # Check if agent exists
    result = conn.execute(text("""
        SELECT id FROM users WHERE email = 'agent@bilagh.dz'
    """))
    existing = result.fetchone()
    
    if existing:
        print("Agent user already exists!")
    else:
        # Insert agent user directly with raw SQL
        conn.execute(text("""
            INSERT INTO users (email, username, full_name, phone, hashed_password, role, points, created_at)
            VALUES (:email, :username, :full_name, :phone, :hashed_password, 'agent', 0, NOW())
        """), {
            'email': 'agent@bilagh.dz',
            'username': 'field_agent',
            'full_name': 'Field Agent',
            'phone': '+213555123456',
            'hashed_password': hashed_password
        })
        conn.commit()
        print("Agent user created successfully!")
        print("Email: agent@bilagh.dz")
        print("Password: agent123")
