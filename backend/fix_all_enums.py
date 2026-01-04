"""Script to fix ALL enum values in the database"""
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgre14@localhost:5432/bilagh")
engine = create_engine(DATABASE_URL)

def fix_all_enums():
    with engine.connect() as conn:
        # 1. Fix severitylevel enum - add lowercase values
        print("=== Fixing severitylevel enum ===")
        result = conn.execute(text("""
            SELECT enumlabel FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'severitylevel')
        """))
        current_values = [row[0] for row in result]
        print(f"Current severitylevel values: {current_values}")
        
        severity_values = ['low', 'medium', 'high']
        for value in severity_values:
            if value not in current_values:
                print(f"Adding severity value: {value}")
                try:
                    conn.execute(text(f"ALTER TYPE severitylevel ADD VALUE IF NOT EXISTS '{value}'"))
                    conn.commit()
                except Exception as e:
                    print(f"Error: {e}")
                    conn.rollback()
        
        # 2. Migrate severity values in reports table
        print("\n=== Migrating severity values in reports ===")
        result = conn.execute(text("SELECT DISTINCT severity FROM reports"))
        current_severities = [row[0] for row in result]
        print(f"Current severity values in reports: {current_severities}")
        
        severity_mappings = {
            'LOW': 'low',
            'MEDIUM': 'medium', 
            'HIGH': 'high',
        }
        
        for old_val, new_val in severity_mappings.items():
            if old_val in current_severities:
                print(f"Updating severity '{old_val}' to '{new_val}'...")
                try:
                    conn.execute(text(f"""
                        UPDATE reports 
                        SET severity = '{new_val}'::severitylevel 
                        WHERE severity = '{old_val}'::severitylevel
                    """))
                    conn.commit()
                    print(f"  Successfully updated!")
                except Exception as e:
                    print(f"  Error: {e}")
                    conn.rollback()
        
        # 3. Also fix userrole enum if needed
        print("\n=== Fixing userrole enum ===")
        result = conn.execute(text("""
            SELECT enumlabel FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'userrole')
        """))
        current_roles = [row[0] for row in result]
        print(f"Current userrole values: {current_roles}")
        
        # Verify final state
        print("\n=== Final verification ===")
        result = conn.execute(text("SELECT DISTINCT status, severity FROM reports"))
        for row in result:
            print(f"  status={row[0]}, severity={row[1]}")
        
        print("\nDone!")

if __name__ == "__main__":
    fix_all_enums()
