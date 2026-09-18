"""Comprehensive tests for:
- Feature 1: 4-Step Duplicate Clustering Pipeline with Synonyms
- Feature 2: Explainable Priority Breakdown
- Batch 2: Dynamic Priority Escalation & Evidence-Based Resolution
- Batch 3: Citizen Verification & Smart Officer Assignment
"""
import pytest
from datetime import datetime, timedelta
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

import app.core.database as database_module
from app.main import app
from app.services.priority import (
    extract_normalized_keywords,
    detect_duplicate,
    score_complaint,
    is_priority_higher,
)
from app.services.assignment import haversine_distance_km, get_smart_officer_recommendation


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def test_client():
    mock_db = AsyncMongoMockClient()["civic_test_batches"]
    database_module.db = mock_db
    database_module.get_db = lambda: mock_db

    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c, mock_db


# --- 1. Feature 1: 4-Step Duplicate Clustering Tests ---

def test_extract_normalized_keywords_with_synonyms():
    # Trench and crater should normalize to pothole
    text1 = "Deep trench and asphalt crater on roadway"
    k1 = extract_normalized_keywords(text1)
    assert "pothole" in k1

    # Waste and trash should normalize to garbage, overflowing to overflow
    text2 = "Overflowing waste bins with spilled trash"
    k2 = extract_normalized_keywords(text2)
    assert "garbage" in k2
    assert "overflow" in k2

    # Verify overlap: overflowing bins vs illegal dumping
    overflow_text = "Overflowing dustbin with spilled garbage"
    dump_text = "Illegal industrial dumping of construction debris"
    k_overflow = extract_normalized_keywords(overflow_text)
    k_dump = extract_normalized_keywords(dump_text)

    # They should NOT share >= 2 keywords (separate issues)
    shared = k_overflow.intersection(k_dump)
    # Both might map debris/garbage to garbage, but not overflow
    assert len(shared) < 2


@pytest.mark.anyio
async def test_duplicate_clustering_distinguishes_issues(test_client):
    c, db = test_client
    now = datetime.utcnow()

    # Master issue
    master = {
        "complaint_id": "CMP-TEST-001",
        "category": "garbage",
        "description": "Overflowing waste bins outside market with trash spilling",
        "location": {"type": "Point", "coordinates": [-74.0060, 40.7128]},
        "created_at": now - timedelta(days=2),
    }
    res = await db.complaints.insert_one(master)

    # Candidate A: Same location, same category, similar issue (overflowing garbage)
    # Synonyms: waste -> garbage, spilled -> overflow
    similar_doc = {
        "category": "garbage",
        "description": "Waste containers are overflowing and rubbish is everywhere",
        "location": {"type": "Point", "coordinates": [-74.0061, 40.7129]},
        "created_at": now - timedelta(days=1),
    }
    is_dup, group_id = await detect_duplicate(db, similar_doc)
    assert is_dup is True
    assert group_id == "CMP-TEST-001" or group_id == str(res.inserted_id)

    # Candidate B: Same location, same category, DIFFERENT issue (illegal dumping of demolition material)
    different_doc = {
        "category": "garbage",
        "description": "Illegal dumping of concrete tiles and demolition bricks",
        "location": {"type": "Point", "coordinates": [-74.0061, 40.7129]},
        "created_at": now - timedelta(days=1),
    }
    is_dup2, _ = await detect_duplicate(db, different_doc)
    assert is_dup2 is False


# --- 2. Feature 2: Explainable Priority Breakdown Tests ---

@pytest.mark.anyio
async def test_priority_breakdown_contains_all_factors(test_client):
    c, db = test_client
    now = datetime.utcnow()

    doc = {
        "category": "water_supply",
        "description": "Burst main pipe gushing water",
        "location": {"type": "Point", "coordinates": [-74.0060, 40.7128]},
        "created_at": now - timedelta(hours=50),
    }

    score, label, breakdown = await score_complaint(db, doc, urgency_level="HIGH")
    assert isinstance(score, float)
    assert label in ("High", "Critical")
    assert "age_hours" in breakdown
    assert "category_severity" in breakdown
    assert "similar_complaints" in breakdown
    assert "safety_factor" in breakdown
    assert "sla_urgency" in breakdown
    assert "summary" in breakdown
    assert len(breakdown["summary"]) > 10


# --- 3. Batch 2: Priority Escalation & Evidence Resolution Tests ---

def test_priority_tier_progression():
    assert is_priority_higher("Medium", "Low") is True
    assert is_priority_higher("High", "Medium") is True
    assert is_priority_higher("Critical", "High") is True
    assert is_priority_higher("Low", "High") is False
    assert is_priority_higher("Medium", "Medium") is False


@pytest.mark.anyio
async def test_resolution_with_evidence_and_citizen_verification(test_client):
    client, db = test_client

    # 1. Register Citizen & Officer
    r = await client.post(
        "/auth/register",
        json={"name": "Citizen User", "email": "cit@test.com", "password": "Password@123", "role": "citizen"}
    )
    cit_token = r.json()["access_token"]
    cit_h = {"Authorization": f"Bearer {cit_token}"}

    r = await client.post(
        "/auth/register",
        json={"name": "Officer Roads", "email": "off@test.com", "password": "Password@123", "role": "officer", "department": "Roads & Public Works"}
    )
    off_token = r.json()["access_token"]
    off_h = {"Authorization": f"Bearer {off_token}"}

    # 2. Citizen creates complaint with media
    r = await client.post(
        "/complaints",
        headers=cit_h,
        json={
            "category": "pothole",
            "description": "Deep crater on 5th Ave",
            "location": {"lat": 40.7128, "lng": -74.0060},
            "media_urls": ["http://localhost:3900/civic-media/photo1.jpg"],
        }
    )
    assert r.status_code == 201
    cid = r.json()["id"]
    assert len(r.json()["media_urls"]) == 1

    # 3. Assign to officer's department and move to In Progress
    from bson import ObjectId
    await db.complaints.update_one(
        {"_id": ObjectId(cid)},
        {"$set": {"assigned_to": "Roads & Public Works", "status": "In Progress"}}
    )

    # 4. Officer resolves with evidence
    r = await client.post(
        f"/complaints/{cid}/resolve",
        headers=off_h,
        json={
            "before_image_url": "http://localhost:3900/civic-media/before.jpg",
            "after_image_url": "http://localhost:3900/civic-media/after.jpg",
            "notes": "Asphalt patch poured and compacted.",
        }
    )
    assert r.status_code == 200
    res_data = r.json()
    assert res_data["status"] == "Resolved"
    assert res_data["resolution_evidence"]["notes"] == "Asphalt patch poured and compacted."
    assert res_data["resolved_at"] is not None

    # 5. Citizen verifies: No -> Reopened
    r = await client.post(
        f"/complaints/{cid}/verify",
        headers=cit_h,
        json={"response": "no", "feedback": "Asphalt already cracked again"}
    )
    assert r.status_code == 200
    assert r.json()["status"] == "Reopened"
    assert r.json()["citizen_verification"]["response"] == "no"

    # 6. Officer resolves again
    await client.post(
        f"/complaints/{cid}/resolve",
        headers=off_h,
        json={"notes": "Reinforced layer applied"}
    )

    # 7. Citizen verifies: Yes -> Closed
    r = await client.post(
        f"/complaints/{cid}/verify",
        headers=cit_h,
        json={"response": "yes"}
    )
    assert r.status_code == 200
    assert r.json()["status"] == "Closed"
    assert r.json()["citizen_verification"]["response"] == "yes"


# --- 4. Batch 3: Smart Officer Assignment Tests ---

def test_haversine_distance():
    d = haversine_distance_km(40.7128, -74.0060, 40.7150, -74.0020)
    assert d > 0
    assert d < 2.0  # < 2 km apart in lower Manhattan


@pytest.mark.anyio
async def test_smart_officer_recommendation(test_client):
    client, db = test_client

    # Add 2 officers in Roads department
    off1 = {
        "name": "Officer Busy",
        "email": "busy@city.gov",
        "role": "officer",
        "department": "Roads & Public Works",
        "lat": 40.7128,
        "lng": -74.0060,
        "is_available": True,
    }
    off2 = {
        "name": "Officer Available",
        "email": "free@city.gov",
        "role": "officer",
        "department": "Roads & Public Works",
        "lat": 40.7130,
        "lng": -74.0062,
        "is_available": True,
    }
    res1 = await db.users.insert_one(off1)
    await db.users.insert_one(off2)

    # Give Officer Busy 3 open complaints
    for i in range(3):
        await db.complaints.insert_one({
            "assigned_officer_id": str(res1.inserted_id),
            "status": "In Progress"
        })

    complaint = {
        "category": "pothole",
        "assigned_to": "Roads & Public Works",
        "location": {"type": "Point", "coordinates": [-74.0060, 40.7128]}
    }

    rec = await get_smart_officer_recommendation(db, complaint)
    assert rec["recommended_officer"] is not None
    # Officer Available should have higher score because workload is 0 vs 3
    assert rec["recommended_officer"]["name"] == "Officer Available"
    assert len(rec["reasons"]) >= 3
