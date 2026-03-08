import asyncio, os, sys
sys.path.insert(0, 'backend')
os.chdir('backend')
from database import db

async def check():
    total = await db.reports.count_documents({})
    with_coords = await db.reports.count_documents({
        "latitude": {"$exists": True, "$ne": None},
        "longitude": {"$exists": True, "$ne": None}
    })
    with_type = await db.reports.count_documents({
        "latitude": {"$exists": True, "$ne": None},
        "longitude": {"$exists": True, "$ne": None},
        "type": {"$exists": True, "$ne": None}
    })
    print(f"Total reports: {total}")
    print(f"Reports with coords: {with_coords}")
    print(f"Reports with coords+type: {with_type}")

    sample = await db.reports.find({"latitude": {"$exists": True}}).to_list(length=5)
    for r in sample:
        print(f"  -> type={r.get('type')}, lat={r.get('latitude')}, lng={r.get('longitude')}, user={r.get('user_id')}")

asyncio.run(check())
