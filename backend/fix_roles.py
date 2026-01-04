"""Script to fix user roles in the database by recreating users with correct enum values"""
from database import SessionLocal, engine
from sqlalchemy import text

def fix_roles():
    db = SessionLocal()
    try:
        # First, let's see the PostgreSQL enum values
        result = db.execute(text("SELECT enum_range(NULL::userrole)"))
        enum_values = result.fetchone()
        print(f"PostgreSQL enum values: {enum_values}")
        
        # The issue is the data has 'USER' but the enum expects 'user'
        # We need to directly update using PostgreSQL casting
        # First drop the constraint temporarily and update
        
        # Get users with uppercase roles using raw SQL that bypasses the enum check
        conn = engine.raw_connection()
        cursor = conn.cursor()
        
        # Update the role column directly
        cursor.execute("UPDATE users SET role = 'user' WHERE role::text = 'USER'")
        cursor.execute("UPDATE users SET role = 'agent' WHERE role::text = 'AGENT'")
        cursor.execute("UPDATE users SET role = 'admin' WHERE role::text = 'ADMIN'")
        conn.commit()
        
        print("Successfully updated roles to lowercase!")
        
        # Verify
        cursor.execute("SELECT id, email, role FROM users")
        rows = cursor.fetchall()
        print("\nUpdated users:")
        for row in rows:
            print(f"  ID: {row[0]}, Email: {row[1]}, Role: '{row[2]}'")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    fix_roles()
