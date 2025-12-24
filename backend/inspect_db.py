import sqlite3
import sys

# Connect to database
conn = sqlite3.connect('bilagh.db')
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

print("=" * 60)
print("BILAGH DATABASE TABLES")
print("=" * 60)

for table in tables:
    table_name = table[0]
    print(f"\n📊 Table: {table_name}")
    print("-" * 60)
    
    # Get table schema
    cursor.execute(f"PRAGMA table_info({table_name});")
    columns = cursor.fetchall()
    
    print(f"{'Column':<20} {'Type':<15} {'Not Null':<10} {'Default':<15}")
    print("-" * 60)
    for col in columns:
        col_name = col[1]
        col_type = col[2]
        not_null = "YES" if col[3] else "NO"
        default = col[4] if col[4] else ""
        print(f"{col_name:<20} {col_type:<15} {not_null:<10} {str(default):<15}")
    
    # Get row count
    cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
    count = cursor.fetchone()[0]
    print(f"\n📈 Total rows: {count}")
    
    # Show sample data if exists
    if count > 0:
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 3;")
        rows = cursor.fetchall()
        print(f"\n🔍 Sample data (first 3 rows):")
        for row in rows:
            print(f"  {row}")

print("\n" + "=" * 60)
print("✅ Database inspection complete!")
print("=" * 60)

conn.close()
