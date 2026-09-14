"""Seed the `complaints` collection from NYC's 311 Service Request dataset
(https://data.cityofnewyork.us/resource/erm2-nwe9.json -- the dataset named
in the case study PDF), mapped onto this project's Category enum via
rule-based keyword matching -- same "real logic, not a fake AI claim"
approach as detect_duplicate()/department auto-assign in the backend.

Usage (run from the repo root, with the backend's venv active so `motor`
and `requests` are importable -- or `pip install -r backend/requirements.txt
requests` first):

    python scripts/seed_from_311.py --limit 100
    python scripts/seed_from_311.py --limit 500 --days 30
    python scripts/seed_from_311.py --dry-run --limit 20
    python scripts/seed_from_311.py --sample-file scripts/sample_311.json

Reads Mongo connection info from backend/.env via the backend's own
Settings class, so it seeds whatever database your backend is pointed at.
"""
import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

import requests
from motor.motor_asyncio import AsyncIOMotorClient

# Make the backend app importable so this script reuses the real priority
# engine, department seeding, and password hashing instead of duplicating
# that logic here.
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.routers.departments import seed_default_departments  # noqa: E402
from app.services.priority import detect_duplicate, score_complaint  # noqa: E402

NYC_311_ENDPOINT = "https://data.cityofnewyork.us/resource/erm2-nwe9.json"

# Rule-based complaint_type/descriptor -> this project's Category, by
# keyword. Checked in order; first match wins. Anything unmatched falls
# through to "other". This is the case study's "extract category from free
# text" bonus-AI ask, done with keyword rules rather than an LLM -- honest
# about what it is, same as the rest of this project's rule-based pieces.
CATEGORY_KEYWORDS = [
    ("streetlight", ["street light", "lamp"]),
    ("water_supply", ["water system", "water leak", "water supply", "hydrant"]),
    ("garbage", ["sanitation", "dirty condition", "missed collection", "garbage", "trash"]),
    ("pothole", ["pothole", "street condition", "highway condition"]),
]

# NYC's dataset has no user accounts. Rather than inventing fake citizens,
# every imported complaint is attributed to one clearly-labeled system
# account, created on first run.
SEED_CITIZEN_EMAIL = "nyc311-import@seed.local"
SEED_CITIZEN_NAME = "NYC 311 Import"


def map_category(complaint_type: str, descriptor: str) -> str:
    text = f"{complaint_type} {descriptor}".lower()
    for category, keywords in CATEGORY_KEYWORDS:
        if any(k in text for k in keywords):
            return category
    return "other"


def _parse_created_date(value):
    if not value:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


def fetch_311_records(limit: int, since_days: int) -> list[dict]:
    """Live call to NYC's Socrata SODA API."""
    since = (datetime.utcnow() - timedelta(days=since_days)).strftime("%Y-%m-%dT%H:%M:%S")
    params = {
        "$limit": limit,
        "$where": f"created_date > '{since}' AND latitude IS NOT NULL AND longitude IS NOT NULL",
        "$select": "unique_key,created_date,complaint_type,descriptor,incident_address,latitude,longitude,status",
        "$order": "created_date DESC",
    }
    resp = requests.get(NYC_311_ENDPOINT, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


async def ensure_seed_citizen(db) -> str:
    existing = await db.users.find_one({"email": SEED_CITIZEN_EMAIL})
    if existing:
        return str(existing["_id"])
    result = await db.users.insert_one(
        {
            "name": SEED_CITIZEN_NAME,
            "email": SEED_CITIZEN_EMAIL,
            "password_hash": hash_password(os.urandom(16).hex()),  # unguessable, nobody needs to log in as this account
            "role": "citizen",
            "department": None,
        }
    )
    return str(result.inserted_id)


async def seed(db, records: list[dict], citizen_id: str, dry_run: bool = False) -> dict:
    inserted = 0
    duplicates = 0
    skipped = 0

    for record in records:
        try:
            lat = float(record["latitude"])
            lng = float(record["longitude"])
        except (KeyError, TypeError, ValueError):
            skipped += 1
            continue

        category = map_category(record.get("complaint_type", ""), record.get("descriptor", ""))
        description = f"{record.get('complaint_type', 'Complaint')}: {record.get('descriptor', '')}".strip(": ")
        created_at = _parse_created_date(record.get("created_date")) or datetime.utcnow()

        if dry_run:
            inserted += 1
            continue

        count = await db.complaints.count_documents({})
        doc = {
            "complaint_id": f"CMP-{created_at.year}-{count + 1:04d}",
            "citizen_id": citizen_id,
            "category": category,
            "description": description or "No description provided",
            "location": {"type": "Point", "coordinates": [lng, lat]},
            "address_text": record.get("incident_address"),
            "status": "New",
            "priority_score": 0.0,
            "priority_label": "Low",
            "assigned_to": None,
            "is_duplicate": False,
            "duplicate_group_id": None,
            "created_at": created_at,
            "updated_at": created_at,
            "resolved_at": None,
            "comments": [],
            "history": [
                {
                    "event": "created",
                    "detail": f"Imported from NYC 311 dataset (unique_key={record.get('unique_key', 'n/a')})",
                    "at": created_at,
                }
            ],
        }
        result = await db.complaints.insert_one(doc)
        doc["_id"] = result.inserted_id

        score, label = await score_complaint(db, doc)
        is_dup, group_id = await detect_duplicate(db, doc)
        update = {"priority_score": score, "priority_label": label, "is_duplicate": is_dup}
        if is_dup:
            update["duplicate_group_id"] = group_id
            duplicates += 1
        await db.complaints.update_one({"_id": result.inserted_id}, {"$set": update})

        inserted += 1

    return {"inserted": inserted, "duplicates_flagged": duplicates, "skipped_missing_geo": skipped}


async def main_async(args):
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.mongo_db_name]

    await db.complaints.create_index([("location", "2dsphere")])
    await seed_default_departments(db)
    citizen_id = await ensure_seed_citizen(db)

    if args.sample_file:
        records = json.loads(Path(args.sample_file).read_text())[: args.limit]
        print(f"Loaded {len(records)} records from {args.sample_file}")
    else:
        records = fetch_311_records(args.limit, args.days)
        print(f"Fetched {len(records)} records from NYC Open Data")

    print(f"Seeding into {settings.mongo_uri}/{settings.mongo_db_name} ...")
    stats = await seed(db, records, citizen_id, dry_run=args.dry_run)
    print(stats)
    client.close()


def main():
    parser = argparse.ArgumentParser(description="Seed complaints from NYC 311 data")
    parser.add_argument("--limit", type=int, default=100, help="Max records to fetch/seed")
    parser.add_argument("--days", type=int, default=30, help="Only fetch complaints created in the last N days")
    parser.add_argument("--dry-run", action="store_true", help="Fetch and map but don't write to Mongo")
    parser.add_argument(
        "--sample-file",
        help="Read records from a local JSON file (same shape as the Socrata API response) instead of "
        "calling the live API -- useful offline, in CI, or behind a restrictive firewall. "
        "See scripts/sample_311.json for the expected shape.",
    )
    args = parser.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
