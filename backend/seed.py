"""Database Seeding Script for Civic Complaint System.

Can be run inside Docker via:
    docker compose exec backend python seed.py

Or locally (with MongoDB running on localhost:27017):
    cd backend && python seed.py

Seeds:
- 1 Admin: admin@city.gov / Admin@1234
- 5 Officers across 5 municipal departments: Officer@1234
- 3 Citizens: Citizen@1234
- 12 realistic complaints across all categories, priorities, and statuses
- Complete audit trails, comments, SLA records, and duplicate detection
"""
import asyncio
from datetime import datetime, timedelta
import os
import sys

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.core.security import hash_password
from app.routers.departments import seed_default_departments, DEFAULT_DEPARTMENTS


async def seed():
    print(f"Connecting to MongoDB at {settings.mongo_uri} (db: {settings.mongo_db_name})...")
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.mongo_db_name]

    print("\n--- 1. Ensuring Indexes & Default Departments ---")
    await db.complaints.create_index([("location", "2dsphere")])
    await db.complaints.create_index([("category", 1), ("status", 1), ("created_at", 1)])
    await db.complaints.create_index("assigned_to")
    await db.complaints.create_index("citizen_id")
    await db.users.create_index("email", unique=True)
    await db.departments.create_index("category", unique=True)
    await seed_default_departments(db)
    print("  ✓ Indexes & departments ready.")

    print("\n--- 2. Seeding Users ---")
    users_to_seed = [
        # Admin
        {
            "name": "Chief Administrator",
            "email": "admin@city.gov",
            "password": "Admin@1234",
            "role": "admin",
            "department": None,
        },
        # Officers
        {
            "name": "Officer Sarah Chen",
            "email": "officer.electrical@city.gov",
            "password": "Officer@1234",
            "role": "officer",
            "department": "Electrical Maintenance",
        },
        {
            "name": "Officer Marcus Vance",
            "email": "officer.roads@city.gov",
            "password": "Officer@1234",
            "role": "officer",
            "department": "Roads & Public Works",
        },
        {
            "name": "Officer Priya Patel",
            "email": "officer.sanitation@city.gov",
            "password": "Officer@1234",
            "role": "officer",
            "department": "Sanitation Department",
        },
        {
            "name": "Officer David Kim",
            "email": "officer.water@city.gov",
            "password": "Officer@1234",
            "role": "officer",
            "department": "Water Board",
        },
        {
            "name": "Officer Elena Rostova",
            "email": "officer.general@city.gov",
            "password": "Officer@1234",
            "role": "officer",
            "department": "General Services",
        },
        # Citizens
        {
            "name": "Alex Rivera",
            "email": "citizen@example.com",
            "password": "Citizen@1234",
            "role": "citizen",
            "department": None,
        },
        {
            "name": "Jane Smith",
            "email": "jane@example.com",
            "password": "Citizen@1234",
            "role": "citizen",
            "department": None,
        },
        {
            "name": "Carlos Mendoza",
            "email": "carlos@example.com",
            "password": "Citizen@1234",
            "role": "citizen",
            "department": None,
        },
    ]

    user_map = {}
    for u in users_to_seed:
        existing = await db.users.find_one({"email": u["email"]})
        if existing:
            await db.users.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "name": u["name"],
                        "password_hash": hash_password(u["password"]),
                        "role": u["role"],
                        "department": u["department"],
                    }
                },
            )
            user_id = str(existing["_id"])
            print(f"  ✓ Updated user: {u['email']} ({u['role']})")
        else:
            res = await db.users.insert_one(
                {
                    "name": u["name"],
                    "email": u["email"],
                    "password_hash": hash_password(u["password"]),
                    "role": u["role"],
                    "department": u["department"],
                    "created_at": datetime.utcnow(),
                }
            )
            user_id = str(res.inserted_id)
            print(f"  + Created user: {u['email']} ({u['role']})")
        user_map[u["email"]] = user_id

    alex_id = user_map["citizen@example.com"]
    jane_id = user_map["jane@example.com"]
    carlos_id = user_map["carlos@example.com"]

    now = datetime.utcnow()

    print("\n--- 3. Seeding Complaints ---")
    # Clean old demo complaints if any exist to prevent duplicate explosion
    await db.complaints.delete_many({})

    complaints_data = [
        # 1. Critical Urgency Streetlight (In Progress)
        {
            "complaint_id": "CMP-2026-0001",
            "citizen_id": alex_id,
            "category": "streetlight",
            "description": "Exposed live electrical wires dangling from damaged street light pole near school gate. Extreme electrocution danger for children walking home.",
            "location": {"type": "Point", "coordinates": [-74.0060, 40.7128]},
            "address_text": "45 Elm Street, Gate 3, Sector 4",
            "status": "In Progress",
            "priority_score": 92.5,
            "priority_label": "Critical",
            "assigned_to": "Electrical Maintenance",
            "is_duplicate": False,
            "duplicate_group_id": None,
            "created_at": now - timedelta(days=2, hours=4),
            "updated_at": now - timedelta(hours=6),
            "resolved_at": None,
            "ai_analysis": {
                "category": "streetlight",
                "category_suggestion": "streetlight",
                "confidence": 0.94,
                "urgency_level": "CRITICAL",
                "summary": "Live electrical wires hanging from damaged street light pole creating electrocution danger.",
                "location_hints": {"near_refs": ["school gate"], "road_refs": ["elm street"]},
            },
            "comments": [
                {
                    "author_name": "Alex Rivera",
                    "author_role": "citizen",
                    "message": "Please hurry, kids play in this area every afternoon!",
                    "at": now - timedelta(days=2, hours=3),
                },
                {
                    "author_name": "Officer Sarah Chen",
                    "author_role": "officer",
                    "message": "Emergency electrical repair crew dispatched with power isolation kit.",
                    "at": now - timedelta(hours=6),
                },
            ],
            "history": [
                {"event": "created", "detail": "Complaint submitted (streetlight)", "at": now - timedelta(days=2, hours=4)},
                {"event": "assigned", "detail": "Assigned to Electrical Maintenance", "at": now - timedelta(days=2, hours=2)},
                {"event": "status_changed", "detail": "Status updated: Assigned -> In Progress", "at": now - timedelta(hours=6)},
                {"event": "comment_added", "detail": "Emergency electrical repair crew dispatched with power isolation kit.", "at": now - timedelta(hours=6)},
            ],
        },

        # 2. High Urgency Streetlight (Aging - Breaching 72h SLA)
        {
            "complaint_id": "CMP-2026-0002",
            "citizen_id": jane_id,
            "category": "streetlight",
            "description": "Streetlight on North Boulevard completely dark for over a week. Multiple vehicles had near misses with pedestrians at night.",
            "location": {"type": "Point", "coordinates": [-74.0062, 40.7130]},
            "address_text": "North Blvd near 5th Crossing",
            "status": "Assigned",
            "priority_score": 78.0,
            "priority_label": "High",
            "assigned_to": "Electrical Maintenance",
            "is_duplicate": False,
            "duplicate_group_id": None,
            "created_at": now - timedelta(days=4, hours=12),
            "updated_at": now - timedelta(days=4),
            "resolved_at": None,
            "ai_analysis": {
                "category": "streetlight",
                "category_suggestion": "streetlight",
                "confidence": 0.89,
                "urgency_level": "HIGH",
                "summary": "Streetlight completely dark for over a week with pedestrian hazard.",
                "location_hints": {"road_refs": ["north boulevard", "5th crossing"]},
            },
            "comments": [],
            "history": [
                {"event": "created", "detail": "Complaint submitted (streetlight)", "at": now - timedelta(days=4, hours=12)},
                {"event": "assigned", "detail": "Assigned to Electrical Maintenance", "at": now - timedelta(days=4)},
            ],
        },

        # 3. Critical Pothole (In Progress)
        {
            "complaint_id": "CMP-2026-0003",
            "citizen_id": carlos_id,
            "category": "pothole",
            "description": "Massive crater pothole on expressway off-ramp. Two cars had blown tires today and sudden braking nearly caused multi-car pileup.",
            "location": {"type": "Point", "coordinates": [-74.0020, 40.7150]},
            "address_text": "120 Main Blvd near North Junction",
            "status": "In Progress",
            "priority_score": 88.0,
            "priority_label": "Critical",
            "assigned_to": "Roads & Public Works",
            "is_duplicate": False,
            "duplicate_group_id": None,
            "created_at": now - timedelta(days=1, hours=8),
            "updated_at": now - timedelta(hours=14),
            "resolved_at": None,
            "ai_analysis": {
                "category": "pothole",
                "category_suggestion": "pothole",
                "confidence": 0.96,
                "urgency_level": "CRITICAL",
                "summary": "Massive crater pothole on expressway causing tire damage and near collisions.",
                "location_hints": {"road_refs": ["main blvd", "north junction"]},
            },
            "comments": [
                {
                    "author_name": "Officer Marcus Vance",
                    "author_role": "officer",
                    "message": "Warning cones placed around pothole. Bitumen patching truck scheduled for 2pm.",
                    "at": now - timedelta(hours=14),
                }
            ],
            "history": [
                {"event": "created", "detail": "Complaint submitted (pothole)", "at": now - timedelta(days=1, hours=8)},
                {"event": "assigned", "detail": "Assigned to Roads & Public Works", "at": now - timedelta(days=1, hours=5)},
                {"event": "status_changed", "detail": "Status updated: Assigned -> In Progress", "at": now - timedelta(hours=14)},
            ],
        },

        # 4. Pothole Duplicate Root
        {
            "complaint_id": "CMP-2026-0004",
            "citizen_id": alex_id,
            "category": "pothole",
            "description": "Deep asphalt trench across lane outside Metro Station exit 2 damaging suspension.",
            "location": {"type": "Point", "coordinates": [-74.0022, 40.7152]},
            "address_text": "Metro Station Exit 2, Station Road",
            "status": "Assigned",
            "priority_score": 64.0,
            "priority_label": "Medium",
            "assigned_to": "Roads & Public Works",
            "is_duplicate": False,
            "duplicate_group_id": None,
            "created_at": now - timedelta(days=2),
            "updated_at": now - timedelta(days=1, hours=18),
            "resolved_at": None,
            "ai_analysis": {
                "category": "pothole",
                "confidence": 0.91,
                "urgency_level": "MEDIUM",
                "summary": "Deep asphalt trench outside Metro Station exit 2.",
                "location_hints": {"near_refs": ["metro station"]},
            },
            "comments": [],
            "history": [
                {"event": "created", "detail": "Complaint submitted (pothole)", "at": now - timedelta(days=2)},
                {"event": "assigned", "detail": "Assigned to Roads & Public Works", "at": now - timedelta(days=1, hours=18)},
            ],
        },

        # 5. Pothole Duplicate Flagged
        {
            "complaint_id": "CMP-2026-0005",
            "citizen_id": jane_id,
            "category": "pothole",
            "description": "Pothole right outside Metro Station exit 2. Broken pavement makes it hard for bikes and cars.",
            "location": {"type": "Point", "coordinates": [-74.0023, 40.7153]},
            "address_text": "Station Road at Metro Entrance 2",
            "status": "Assigned",
            "priority_score": 42.0,
            "priority_label": "Low",
            "assigned_to": "Roads & Public Works",
            "is_duplicate": True,
            "duplicate_group_id": "CMP-2026-0004",
            "created_at": now - timedelta(days=1, hours=6),
            "updated_at": now - timedelta(days=1),
            "resolved_at": None,
            "ai_analysis": {
                "category": "pothole",
                "confidence": 0.88,
                "urgency_level": "LOW",
                "summary": "Pothole outside Metro Station exit 2 affecting traffic.",
                "location_hints": {"near_refs": ["metro station"]},
            },
            "comments": [],
            "history": [
                {"event": "created", "detail": "Complaint submitted (pothole)", "at": now - timedelta(days=1, hours=6)},
                {"event": "status_changed", "detail": "Flagged as likely duplicate of nearby pothole complaint(s)", "at": now - timedelta(days=1, hours=6)},
                {"event": "assigned", "detail": "Assigned to Roads & Public Works", "at": now - timedelta(days=1)},
            ],
        },

        # 6. Garbage (Resolved - Within SLA)
        {
            "complaint_id": "CMP-2026-0006",
            "citizen_id": jane_id,
            "category": "garbage",
            "description": "Overflowing waste bins outside Community Center on 8th Ave. Bags ripped open, rotten food smell.",
            "location": {"type": "Point", "coordinates": [-74.0090, 40.7180]},
            "address_text": "Corner of 8th Ave and Oak St",
            "status": "Resolved",
            "priority_score": 58.0,
            "priority_label": "Medium",
            "assigned_to": "Sanitation Department",
            "is_duplicate": False,
            "duplicate_group_id": None,
            "created_at": now - timedelta(days=3),
            "updated_at": now - timedelta(days=1, hours=10),
            "resolved_at": now - timedelta(days=1, hours=10),
            "ai_analysis": {
                "category": "garbage",
                "confidence": 0.95,
                "urgency_level": "MEDIUM",
                "summary": "Overflowing waste bins outside Community Center on 8th Ave.",
                "location_hints": {"near_refs": ["community center"], "road_refs": ["8th ave", "oak st"]},
            },
            "comments": [
                {
                    "author_name": "Officer Priya Patel",
                    "author_role": "officer",
                    "message": "Sanitation team 4 cleared the bins and swept the area. Sanitation supervisor inspected.",
                    "at": now - timedelta(days=1, hours=10),
                }
            ],
            "history": [
                {"event": "created", "detail": "Complaint submitted (garbage)", "at": now - timedelta(days=3)},
                {"event": "assigned", "detail": "Assigned to Sanitation Department", "at": now - timedelta(days=2, hours=18)},
                {"event": "status_changed", "detail": "Status updated: Assigned -> In Progress", "at": now - timedelta(days=2, hours=4)},
                {"event": "status_changed", "detail": "Status updated: In Progress -> Resolved", "at": now - timedelta(days=1, hours=10)},
            ],
        },

        # 7. Garbage (New - Unassigned)
        {
            "complaint_id": "CMP-2026-0007",
            "citizen_id": carlos_id,
            "category": "garbage",
            "description": "Illegal dumping of demolition debris and tiles on sidewalk during the night.",
            "location": {"type": "Point", "coordinates": [-74.0095, 40.7185]},
            "address_text": "Adjacent to 215 8th Avenue",
            "status": "New",
            "priority_score": 45.0,
            "priority_label": "Low",
            "assigned_to": None,
            "is_duplicate": False,
            "duplicate_group_id": None,
            "created_at": now - timedelta(hours=5),
            "updated_at": now - timedelta(hours=5),
            "resolved_at": None,
            "ai_analysis": {
                "category": "garbage",
                "confidence": 0.86,
                "urgency_level": "LOW",
                "summary": "Illegal dumping of demolition debris on sidewalk.",
                "location_hints": {"road_refs": ["8th avenue"]},
            },
            "comments": [],
            "history": [
                {"event": "created", "detail": "Complaint submitted (garbage)", "at": now - timedelta(hours=5)},
            ],
        },

        # 8. Water Supply (In Progress - High Priority)
        {
            "complaint_id": "CMP-2026-0008",
            "citizen_id": alex_id,
            "category": "water_supply",
            "description": "Underground potable water main burst. Clean water gushing into the road and neighborhood has zero water pressure since morning.",
            "location": {"type": "Point", "coordinates": [-74.0040, 40.7220]},
            "address_text": "72 Pine Road near Water Reservoir",
            "status": "In Progress",
            "priority_score": 85.0,
            "priority_label": "High",
            "assigned_to": "Water Board",
            "is_duplicate": False,
            "duplicate_group_id": None,
            "created_at": now - timedelta(days=1, hours=2),
            "updated_at": now - timedelta(hours=8),
            "resolved_at": None,
            "ai_analysis": {
                "category": "water_supply",
                "confidence": 0.96,
                "urgency_level": "HIGH",
                "summary": "Burst potable water main gushing into road with loss of water pressure.",
                "location_hints": {"near_refs": ["water reservoir"], "road_refs": ["pine road"]},
            },
            "comments": [
                {
                    "author_name": "Officer David Kim",
                    "author_role": "officer",
                    "message": "Water valve shut off upstream to isolate the breach. Excavation crew on site.",
                    "at": now - timedelta(hours=8),
                }
            ],
            "history": [
                {"event": "created", "detail": "Complaint submitted (water_supply)", "at": now - timedelta(days=1, hours=2)},
                {"event": "assigned", "detail": "Assigned to Water Board", "at": now - timedelta(days=1)},
                {"event": "status_changed", "detail": "Status updated: Assigned -> In Progress", "at": now - timedelta(hours=8)},
            ],
        },

        # 9. Water Supply (Aging - Breaching SLA > 72h)
        {
            "complaint_id": "CMP-2026-0009",
            "citizen_id": jane_id,
            "category": "water_supply",
            "description": "Contaminated brownish muddy water coming through domestic taps for past 4 days. Unfit for drinking or cooking.",
            "location": {"type": "Point", "coordinates": [-74.0045, 40.7225]},
            "address_text": "Block C, Green Terrace Apartments",
            "status": "Assigned",
            "priority_score": 79.5,
            "priority_label": "High",
            "assigned_to": "Water Board",
            "is_duplicate": False,
            "duplicate_group_id": None,
            "created_at": now - timedelta(days=3, hours=20),
            "updated_at": now - timedelta(days=3),
            "resolved_at": None,
            "ai_analysis": {
                "category": "water_supply",
                "confidence": 0.92,
                "urgency_level": "HIGH",
                "summary": "Contaminated muddy water from domestic taps for 4 days.",
                "location_hints": {"area_refs": ["green terrace apartments"]},
            },
            "comments": [],
            "history": [
                {"event": "created", "detail": "Complaint submitted (water_supply)", "at": now - timedelta(days=3, hours=20)},
                {"event": "assigned", "detail": "Assigned to Water Board", "at": now - timedelta(days=3)},
            ],
        },

        # 10. Other (New - Unassigned)
        {
            "complaint_id": "CMP-2026-0010",
            "citizen_id": carlos_id,
            "category": "other",
            "description": "Massive broken oak tree bough cracked and hanging dangerously over the public sidewalk following high winds.",
            "location": {"type": "Point", "coordinates": [-74.0080, 40.7250]},
            "address_text": "City Central Park, West Entrance Pathway",
            "status": "New",
            "priority_score": 52.0,
            "priority_label": "Medium",
            "assigned_to": None,
            "is_duplicate": False,
            "duplicate_group_id": None,
            "created_at": now - timedelta(hours=18),
            "updated_at": now - timedelta(hours=18),
            "resolved_at": None,
            "ai_analysis": {
                "category": "other",
                "confidence": 0.85,
                "urgency_level": "MEDIUM",
                "summary": "Broken tree limb hanging over public sidewalk after storm.",
                "location_hints": {"near_refs": ["city central park"]},
            },
            "comments": [],
            "history": [
                {"event": "created", "detail": "Complaint submitted (other)", "at": now - timedelta(hours=18)},
            ],
        },

        # 11. Other (Resolved)
        {
            "complaint_id": "CMP-2026-0011",
            "citizen_id": alex_id,
            "category": "other",
            "description": "Unauthorized wooden vendor stall obstructing the handicap wheelchair ramp near municipal market.",
            "location": {"type": "Point", "coordinates": [-74.0075, 40.7245]},
            "address_text": "Municipal Market Entrance Gate 1",
            "status": "Resolved",
            "priority_score": 40.0,
            "priority_label": "Low",
            "assigned_to": "General Services",
            "is_duplicate": False,
            "duplicate_group_id": None,
            "created_at": now - timedelta(days=2, hours=10),
            "updated_at": now - timedelta(hours=16),
            "resolved_at": now - timedelta(hours=16),
            "ai_analysis": {
                "category": "other",
                "confidence": 0.88,
                "urgency_level": "LOW",
                "summary": "Unauthorized vendor stall obstructing wheelchair ramp.",
                "location_hints": {"near_refs": ["municipal market"]},
            },
            "comments": [
                {
                    "author_name": "Officer Elena Rostova",
                    "author_role": "officer",
                    "message": "Encroachment notice served. Obstruction dismantled and wheelchair ramp restored.",
                    "at": now - timedelta(hours=16),
                }
            ],
            "history": [
                {"event": "created", "detail": "Complaint submitted (other)", "at": now - timedelta(days=2, hours=10)},
                {"event": "assigned", "detail": "Assigned to General Services", "at": now - timedelta(days=2)},
                {"event": "status_changed", "detail": "Status updated: Assigned -> In Progress", "at": now - timedelta(days=1)},
                {"event": "status_changed", "detail": "Status updated: In Progress -> Resolved", "at": now - timedelta(hours=16)},
            ],
        },

        # 12. Pothole (Resolved)
        {
            "complaint_id": "CMP-2026-0012",
            "citizen_id": jane_id,
            "category": "pothole",
            "description": "Cracked pavement and surface depression near pedestrian zebra crossing.",
            "location": {"type": "Point", "coordinates": [-74.0030, 40.7160]},
            "address_text": "Intersection of 3rd Street and Maple Ave",
            "status": "Resolved",
            "priority_score": 48.0,
            "priority_label": "Low",
            "assigned_to": "Roads & Public Works",
            "is_duplicate": False,
            "duplicate_group_id": None,
            "created_at": now - timedelta(days=3, hours=5),
            "updated_at": now - timedelta(days=1, hours=2),
            "resolved_at": now - timedelta(days=1, hours=2),
            "ai_analysis": {
                "category": "pothole",
                "confidence": 0.90,
                "urgency_level": "LOW",
                "summary": "Cracked pavement near pedestrian zebra crossing.",
                "location_hints": {"road_refs": ["3rd street", "maple ave"]},
            },
            "comments": [
                {
                    "author_name": "Officer Marcus Vance",
                    "author_role": "officer",
                    "message": "Cold-mix asphalt applied and roller compacted. Road reopened.",
                    "at": now - timedelta(days=1, hours=2),
                }
            ],
            "history": [
                {"event": "created", "detail": "Complaint submitted (pothole)", "at": now - timedelta(days=3, hours=5)},
                {"event": "assigned", "detail": "Assigned to Roads & Public Works", "at": now - timedelta(days=2, hours=12)},
                {"event": "status_changed", "detail": "Status updated: Assigned -> In Progress", "at": now - timedelta(days=2)},
                {"event": "status_changed", "detail": "Status updated: In Progress -> Resolved", "at": now - timedelta(days=1, hours=2)},
            ],
        },
    ]

    await db.complaints.insert_many(complaints_data)
    print(f"  ✓ Inserted {len(complaints_data)} realistic complaints.")

    print("\n" + "=" * 60)
    print("  SEEDING COMPLETE! Summary of Ready-to-Use Logins:")
    print("=" * 60)
    print("  Admin:")
    print("    admin@city.gov                     / Admin@1234")
    print("  Officers:")
    print("    officer.electrical@city.gov        / Officer@1234  (Electrical Maintenance)")
    print("    officer.roads@city.gov             / Officer@1234  (Roads & Public Works)")
    print("    officer.sanitation@city.gov        / Officer@1234  (Sanitation Department)")
    print("    officer.water@city.gov             / Officer@1234  (Water Board)")
    print("    officer.general@city.gov           / Officer@1234  (General Services)")
    print("  Citizens:")
    print("    citizen@example.com                / Citizen@1234  (Alex Rivera)")
    print("    jane@example.com                   / Citizen@1234  (Jane Smith)")
    print("    carlos@example.com                 / Citizen@1234  (Carlos Mendoza)")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
