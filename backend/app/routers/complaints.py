"""Owner: complaints track (see TASKS.md). Depends on app/core/database.py
(merged) and app/services/priority.py (can start against a stub that always
returns (0.0, "Low") if the priority track hasn't merged yet)."""
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, HTTPException, status

from app.core.database import get_db
from app.schemas.complaint import (
    CommentCreate,
    ComplaintCreate,
    ComplaintOut,
    StatusUpdate,
)
from app.services.priority import score_complaint

router = APIRouter(prefix="/complaints", tags=["complaints"])


def _to_out(doc: dict) -> ComplaintOut:
    coords = doc["location"]["coordinates"]
    return ComplaintOut(
        id=str(doc["_id"]),
        complaint_id=doc["complaint_id"],
        citizen_id=doc["citizen_id"],
        category=doc["category"],
        description=doc["description"],
        location={"lat": coords[1], "lng": coords[0]},
        address_text=doc.get("address_text"),
        status=doc["status"],
        priority_score=doc["priority_score"],
        priority_label=doc["priority_label"],
        assigned_to=doc.get("assigned_to"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.post("", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
async def create_complaint(payload: ComplaintCreate, citizen_id: str = "anonymous"):
    db = get_db()
    now = datetime.utcnow()
    count = await db.complaints.count_documents({})
    doc = {
        "complaint_id": f"CMP-{now.year}-{count + 1:04d}",
        "citizen_id": citizen_id,
        "category": payload.category,
        "description": payload.description,
        "location": {
            "type": "Point",
            "coordinates": [payload.location.lng, payload.location.lat],
        },
        "address_text": payload.address_text,
        "status": "New",
        "priority_score": 0.0,
        "priority_label": "Low",
        "assigned_to": None,
        "created_at": now,
        "updated_at": now,
        "comments": [],
    }
    result = await db.complaints.insert_one(doc)
    doc["_id"] = result.inserted_id
    score, label = await score_complaint(db, doc)
    await db.complaints.update_one(
        {"_id": result.inserted_id},
        {"$set": {"priority_score": score, "priority_label": label}},
    )
    doc["priority_score"], doc["priority_label"] = score, label
    return _to_out(doc)


@router.get("", response_model=list[ComplaintOut])
async def list_complaints(status_filter: str | None = None, category: str | None = None):
    db = get_db()
    query: dict = {}
    if status_filter:
        query["status"] = status_filter
    if category:
        query["category"] = category
    docs = await db.complaints.find(query).sort("priority_score", -1).to_list(200)
    return [_to_out(d) for d in docs]


@router.get("/{complaint_id}", response_model=ComplaintOut)
async def get_complaint(complaint_id: str):
    db = get_db()
    doc = await db.complaints.find_one({"_id": ObjectId(complaint_id)})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Complaint not found")
    return _to_out(doc)


@router.patch("/{complaint_id}/status", response_model=ComplaintOut)
async def update_status(complaint_id: str, payload: StatusUpdate):
    db = get_db()
    await db.complaints.update_one(
        {"_id": ObjectId(complaint_id)},
        {"$set": {"status": payload.status, "updated_at": datetime.utcnow()}},
    )
    doc = await db.complaints.find_one({"_id": ObjectId(complaint_id)})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Complaint not found")
    return _to_out(doc)


@router.post("/{complaint_id}/comments", response_model=ComplaintOut)
async def add_comment(complaint_id: str, payload: CommentCreate, author_id: str = "anonymous"):
    db = get_db()
    comment = {"author_id": author_id, "text": payload.text, "created_at": datetime.utcnow()}
    await db.complaints.update_one(
        {"_id": ObjectId(complaint_id)}, {"$push": {"comments": comment}}
    )
    doc = await db.complaints.find_one({"_id": ObjectId(complaint_id)})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Complaint not found")
    return _to_out(doc)
