"""Script to add municipal role to database enum and create municipal user."""
import sys
sys.path.append('.')

from database import engine, SessionLocal
from sqlalchemy import text
import auth

def main():
    db = SessionLocal()
    
    try:
        # Add municipal to the enum if it doesn't exist
        # For PostgreSQL, we need to alter the enum type
        with engine.connect() as conn:
            # Check if municipal value exists in enum
            result = conn.execute(text("""
                SELECT 1 FROM pg_enum 
                WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'userrole')
                AND enumlabel = 'municipal'
            """))
            
            if not result.fetchone():
                # Add municipal to the enum
                conn.execute(text("ALTER TYPE userrole ADD VALUE 'municipal'"))
                conn.commit()
                print("Added 'municipal' to userrole enum")
            else:
                print("'municipal' already exists in userrole enum")
        
        # Now create the municipal user
        from models import User, UserRole
        
        municipal = db.query(User).filter(User.email == "municipal@bilagh.dz").first()
        
        if municipal:
            print(f"Municipal user already exists: {municipal.email}")
            return
        
        # Create municipal user with direct SQL to avoid enum issues
        hashed_password = auth.get_password_hash("municipal123")
        
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO users (email, username, full_name, phone, hashed_password, role, points, created_at)
                VALUES (:email, :username, :full_name, :phone, :hashed_password, 'municipal', :points, NOW())
            """), {
                "email": "municipal@bilagh.dz",
                "username": "municipal_authority",
                "full_name": "Municipal Authority",
                "phone": "+213555000000",
                "hashed_password": hashed_password,
                "points": 0
            })
            conn.commit()
        
        print(f"Municipal user created successfully!")
        print(f"Email: municipal@bilagh.dz")
        print(f"Password: municipal123")
        print(f"Role: municipal")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
