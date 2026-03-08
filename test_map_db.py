import asyncio
import os
import sys

# Change to backend dir for imports
os.chdir('backend')
sys.path.insert(0, '.')

from database import db
from schemas import Report

async def test_response_model():
    # Fetch reports
    query = {
        "latitude": {"$exists": True, "$ne": None},
        "longitude": {"$exists": True, "$ne": None},
        "type": {"$exists": True, "$ne": None},
    }
    cursor = db.reports.find(query)
    
    reports = await cursor.to_list(length=500)
    print(f"\nFound {len(reports)} raw MongoDB docs.")
    
    from main import fix_id
    success_count = 0
    fail_count = 0
    for r in reports:
        try:
            fixed = fix_id(r)
            validated = Report(**fixed)
            success_count += 1
        except Exception as e:
            fail_count += 1
            print(f"Failed to validate report {fixed.get('id')}: {e}")
            
    print(f"\nSUCCESS: {success_count}, FAIL: {fail_count}")

if __name__ == "__main__":
    asyncio.run(test_response_model())
