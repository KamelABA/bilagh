"""Script to migrate existing records from uppercase to lowercase enum values"""
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgre14@localhost:5432/bilagh")
engine = create_engine(DATABASE_URL)

def migrate_enum_values():
    with engine.connect() as conn:
        # First, let's see what status values exist in the reports table
        result = conn.execute(text("SELECT DISTINCT status FROM reports"))
        current_statuses = [row[0] for row in result]
        print(f"Current status values in reports: {current_statuses}")
        
        # Mapping from old uppercase to new lowercase
        mappings = {
            'PENDING': 'pending',
            'IN_PROGRESS': 'in-progress',
            'RESOLVED': 'resolved',
            'VERIFIED': 'verified',
            'APPROVED': 'approved',
            'REJECTED': 'rejected',
            'ASSIGNED': 'assigned',
        }
        
        # Update each record - we need to use raw SQL to bypass SQLAlchemy's enum validation
        for old_val, new_val in mappings.items():
            if old_val in current_statuses:
                print(f"Updating '{old_val}' to '{new_val}'...")
                try:
                    # Use text-based update to bypass enum validation
                    conn.execute(text(f"""
                        UPDATE reports 
                        SET status = '{new_val}'::reportstatus 
                        WHERE status = '{old_val}'::reportstatus
                    """))
                    conn.commit()
                    print(f"  Successfully updated!")
                except Exception as e:
                    print(f"  Error: {e}")
                    conn.rollback()
        
        # Verify the update
        result = conn.execute(text("SELECT DISTINCT status FROM reports"))
        updated_statuses = [row[0] for row in result]
        print(f"Updated status values in reports: {updated_statuses}")

if __name__ == "__main__":
    migrate_enum_values()
