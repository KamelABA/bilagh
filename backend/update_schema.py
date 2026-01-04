from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgre14@localhost:5432/bilagh")
engine = create_engine(DATABASE_URL)

def update_schema():
    with engine.connect() as conn:
        print("Checking reports table schema...")
        
        # Check if columns exist
        columns_to_add = [
            ("assigned_agent_id", "INTEGER REFERENCES users(id)"),
            ("municipal_notes", "TEXT"),
            ("verified_at", "TIMESTAMP"),
            ("approved_at", "TIMESTAMP")
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                # Try to select the column to see if it exists
                conn.execute(text(f"SELECT {col_name} FROM reports LIMIT 1"))
                print(f"Column '{col_name}' already exists.")
            except Exception:
                # Column doesn't exist, so add it
                print(f"Adding column '{col_name}'...")
                conn.rollback() # Rollback the failed select
                try:
                    conn.execute(text(f"ALTER TABLE reports ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                    print(f"Successfully added '{col_name}'.")
                except Exception as e:
                    print(f"Failed to add '{col_name}': {e}")
                    conn.rollback()
        
        print("Schema update check complete.")

if __name__ == "__main__":
    update_schema()
