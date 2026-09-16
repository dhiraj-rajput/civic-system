"""Owner: complaints track (see TASKS.md). Depends on app/core/database.py
(merged) and app/services/priority.py.

RBAC (citizen/officer/admin), assignment, audit-trail history, and DELETE are
ported from ResolveAI's role-scoped routers (complaint_routes.py,
dept_routes.py, admin_routes.py) and their services -- reimplemented against
this project's single `complaints` collection and its own Category/Status
enums, using app/core/deps.py instead of ResolveAI's per-service token checks.
"""
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.routers.departments import department_for_category
from app.schemas.complaint import (
    AssignUpdate,
    CommentCreate,
    ComplaintCreate,
    ComplaintOut,
    ComplaintTrack,
    StatusUpdate,
)
from app.services.priority import detect_duplicate, score_complaint
from app.services.ai_extract import analyze_complaint

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
        is_duplicate=doc.get("is_duplicate", False),
        duplicate_group_id=doc.get("duplicate_group_id"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        resolved_at=doc.get("resolved_at"),
        ai_analysis=doc.get("ai_analysis"),
    )


def _to_track(doc: dict) -> ComplaintTrack:
    return ComplaintTrack(
        id=str(doc["_id"]),
        complaint_id=doc["complaint_id"],
        status=doc["status"],
        priority_score=doc["priority_score"],
        priority_label=doc["priority_label"],
        assigned_to=doc.get("assigned_to"),
        is_duplicate=doc.get("is_duplicate", False),
        duplicate_group_id=doc.get("duplicate_group_id"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        resolved_at=doc.get("resolved_at"),
        history=doc.get("history", []),
    )


async def _get_or_404(db, complaint_id: str) -> dict:
    if not ObjectId.is_valid(complaint_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid complaint id")
    doc = await db.complaints.find_one({"_id": ObjectId(complaint_id)})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Complaint not found")
    return doc


def _can_view(doc: dict, user: dict) -> bool:
    if user["role"] == "admin":
        return True
    if user["role"] == "citizen":
        return doc["citizen_id"] == user["id"]
    if user["role"] == "officer":
        return doc.get("assigned_to") == user.get("department")
    return False


def _can_manage(doc: dict, user: dict) -> bool:
    """Who can change status / add department-side updates."""
    if user["role"] == "admin":
        return True
    if user["role"] == "officer":
        return doc.get("assigned_to") == user.get("department")
    return False


def _require_view(doc: dict, user: dict) -> None:
    if not _can_view(doc, user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized to view this complaint")


@router.post("", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
async def create_complaint(
    payload: ComplaintCreate, current_user: dict = Depends(require_role("citizen"))
):
    db = get_db()
    now = datetime.utcnow()
    count = await db.complaints.count_documents({})
    doc = {
        "complaint_id": f"CMP-{now.year}-{count + 1:04d}",
        "citizen_id": current_user["id"],
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
        "is_duplicate": False,
        "duplicate_group_id": None,
        "created_at": now,
        "updated_at": now,
        "resolved_at": None,
        "comments": [],
        "history": [
            {
                "event": "created",
                "detail": f"Complaint submitted ({payload.category})",
                "at": now,
            }
        ],
    }
    result = await db.complaints.insert_one(doc)
    doc["_id"] = result.inserted_id

    ai_result = analyze_complaint(payload.description)
    doc["ai_analysis"] = {
        "category_suggestion": ai_result["category"],
        "urgency_level": ai_result["urgency_level"],
        "summary": ai_result["summary"],
        "location_hints": ai_result["location_hints"]
    }
    
    score, label = await score_complaint(
        db, doc, 
        urgency_level=ai_result["urgency_level"], 
        duration_days=ai_result.get("duration", {}).get("days", 0)
    )
    is_dup, group_id = await detect_duplicate(db, doc)
    update = {"priority_score": score, "priority_label": label, "is_duplicate": is_dup, "ai_analysis": doc["ai_analysis"]}
    
    if is_dup:
        update["duplicate_group_id"] = group_id
        history_entry = {
            "event": "status_changed",
            "detail": f"Flagged as likely duplicate of nearby {payload.category} complaint(s)",
            "at": now,
        }
        doc["history"].append(history_entry)
        await db.complaints.update_one({"_id": result.inserted_id}, {"$push": {"history": history_entry}})

    if ai_result["category"] != payload.category and ai_result["confidence"] > 0.7:
        ai_history_entry = {
            "event": "comment_added",
            "detail": f"AI suggested category: {ai_result['category']} (confidence: {ai_result['confidence']*100:.1f}%)",
            "at": now,
        }
        doc["history"].append(ai_history_entry)
        await db.complaints.update_one({"_id": result.inserted_id}, {"$push": {"history": ai_history_entry}})

    await db.complaints.update_one({"_id": result.inserted_id}, {"$set": update})
    doc.update(update)
    return _to_out(doc)


@router.get("/mine", response_model=list[ComplaintOut])
async def list_my_complaints(current_user: dict = Depends(require_role("citizen"))):
    """Ported from ResolveAI's `GET /complaints/list` (personal complaint
    history)."""
    db = get_db()
    docs = await db.complaints.find({"citizen_id": current_user["id"]}).sort(
        "created_at", -1
    ).to_list(200)
    return [_to_out(d) for d in docs]


@router.get("", response_model=list[ComplaintOut])
async def list_complaints(
    status_filter: str | None = None,
    category: str | None = None,
    current_user: dict = Depends(require_role("admin", "officer")),
):
    """Admin: full queue, optionally filtered. Officer: automatically scoped
    to their own department's queue -- ported from ResolveAI's
    `GET /department/complaints` (department-scoped) vs
    `GET /admin/complaints` (global) split, merged into one endpoint here."""
    db = get_db()
    query: dict = {}
    if status_filter:
        query["status"] = status_filter
    if category:
        query["category"] = category
    if current_user["role"] == "officer":
        query["assigned_to"] = current_user.get("department")
    docs = await db.complaints.find(query).sort("priority_score", -1).to_list(200)
    return [_to_out(d) for d in docs]


@router.get("/{complaint_id}", response_model=ComplaintOut)
async def get_complaint(complaint_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await _get_or_404(db, complaint_id)
    _require_view(doc, current_user)
    return _to_out(doc)


@router.get("/{complaint_id}/track", response_model=ComplaintTrack)
async def track_complaint(complaint_id: str, current_user: dict = Depends(get_current_user)):
    """Full audit trail. Ported from ResolveAI's GET /complaints/{id}/track,
    including its role-scoped visibility (citizen: own only; officer: own
    department only; admin: any)."""
    db = get_db()
    doc = await _get_or_404(db, complaint_id)
    _require_view(doc, current_user)
    return _to_track(doc)


@router.patch("/{complaint_id}/status", response_model=ComplaintOut)
async def update_status(
    complaint_id: str,
    payload: StatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    doc = await _get_or_404(db, complaint_id)
    if not _can_manage(doc, current_user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized to update this complaint")

    now = datetime.utcnow()
    old_status = doc["status"]
    update: dict = {"status": payload.status, "updated_at": now}
    if payload.status == "Resolved" and not doc.get("resolved_at"):
        update["resolved_at"] = now

    history_entry = {
        "event": "status_changed",
        "detail": f"{old_status} -> {payload.status} (by {current_user['role']})",
        "at": now,
    }
    await db.complaints.update_one(
        {"_id": doc["_id"]}, {"$set": update, "$push": {"history": history_entry}}
    )
    doc = await _get_or_404(db, complaint_id)
    return _to_out(doc)


@router.patch("/{complaint_id}/assign", response_model=ComplaintOut)
async def assign_complaint(
    complaint_id: str,
    payload: AssignUpdate | None = None,
    _admin: dict = Depends(require_role("admin")),
):
    """Assign/reassign to a department. Ported from ResolveAI's admin
    `reassign_complaint`. If no `assigned_to` is given, falls back to the
    rule-based category -> department mapping (see routers/departments.py) --
    a lightweight stand-in for the case study's "extract category" bonus-AI
    ask, without pretending it's ML."""
    db = get_db()
    doc = await _get_or_404(db, complaint_id)
    now = datetime.utcnow()

    assigned_to = payload.assigned_to if payload and payload.assigned_to else None
    auto_assigned = False
    if not assigned_to:
        assigned_to = await department_for_category(db, doc["category"])
        auto_assigned = True
        if not assigned_to:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "No department mapped to this category; specify assigned_to explicitly",
            )

    update: dict = {"assigned_to": assigned_to, "updated_at": now}
    if doc["status"] == "New":
        update["status"] = "Assigned"

    detail = f"Auto-assigned to {assigned_to} (by category)" if auto_assigned else f"Assigned to {assigned_to}"
    history_entry = {"event": "assigned", "detail": detail, "at": now}
    await db.complaints.update_one(
        {"_id": doc["_id"]}, {"$set": update, "$push": {"history": history_entry}}
    )
    doc = await _get_or_404(db, complaint_id)
    return _to_out(doc)


@router.post("/{complaint_id}/comments", response_model=ComplaintOut)
async def add_comment(
    complaint_id: str,
    payload: CommentCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    doc = await _get_or_404(db, complaint_id)
    _require_view(doc, current_user)

    now = datetime.utcnow()
    comment = {"author_id": current_user["id"], "author_role": current_user["role"], "text": payload.text, "created_at": now}
    history_entry = {
        "event": "comment_added",
        "detail": f"{current_user['role']} commented",
        "at": now,
    }
    await db.complaints.update_one(
        {"_id": doc["_id"]}, {"$push": {"comments": comment, "history": history_entry}}
    )
    doc = await _get_or_404(db, complaint_id)
    return _to_out(doc)


@router.delete("/{complaint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_complaint(complaint_id: str, _admin: dict = Depends(require_role("admin"))):
    """Ported from ResolveAI's admin `remove_complaint_by_admin`."""
    db = get_db()
    doc = await _get_or_404(db, complaint_id)
    await db.complaints.delete_one({"_id": doc["_id"]})
