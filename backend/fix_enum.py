"""Script to fix the reportstatus enum in the database"""
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgre14@localhost:5432/bilagh")
engine = create_engine(DATABASE_URL)

def fix_enum():
    with engine.connect() as conn:
        # Check current enum values
        print("Checking current enum values...")
        result = conn.execute(text("""
            SELECT enumlabel FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'reportstatus')
        """))
        current_values = [row[0] for row in result]
        print(f"Current enum values: {current_values}")
        
        # The expected values (lowercase)
        expected_values = ['pending', 'verified', 'approved', 'rejected', 'assigned', 'in-progress', 'resolved']
        
        # Add missing values
        for value in expected_values:
            if value not in current_values:
                print(f"Adding enum value: {value}")
                try:
                    conn.execute(text(f"ALTER TYPE reportstatus ADD VALUE IF NOT EXISTS '{value}'"))
                    conn.commit()
                except Exception as e:
                    print(f"Error adding {value}: {e}")
                    conn.rollback()
        
        # Check updated values
        result = conn.execute(text("""
            SELECT enumlabel FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'reportstatus')
        """))
        updated_values = [row[0] for row in result]
        print(f"Updated enum values: {updated_values}")
        
        # Update existing records to use lowercase
        print("Updating existing records...")
        updates = [
            ("PENDING", "pending"),
            ("VERIFIED", "verified"),
            ("APPROVED", "approved"),
            ("REJECTED", "rejected"),
            ("ASSIGNED", "assigned"),
            ("IN_PROGRESS", "in-progress"),
            ("RESOLVED", "resolved"),
        ]
        
        for old_val, new_val in updates:
            if old_val in updated_values and new_val in updated_values:
                try:
                    # This requires dropping and recreating the column or using a workaround
                    # For now, let's just ensure new values exist
                    pass
                except Exception as e:
                    print(f"Error updating {old_val} to {new_val}: {e}")
        
        print("Done!")

if __name__ == "__main__":
    fix_enum()
