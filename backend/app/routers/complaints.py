"""Complaints Router.
Handles complaint creation, media storage, 4-step duplicate clustering,
explainable priority breakdown, dynamic escalation, evidence-based resolution,
citizen verification, and smart officer assignment.
"""
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.routers.departments import department_for_category
from app.schemas.complaint import (
    AssignUpdate,
    CommentCreate,
    ComplaintCreate,
    ComplaintOut,
    ComplaintTrack,
    ResolutionSubmit,
    StatusUpdate,
    VerificationSubmit,
)
from app.services.priority import (
    detect_duplicate, 
    score_complaint, 
    check_and_escalate_complaint
)
from app.services.assignment import get_smart_officer_recommendation
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
        media_urls=doc.get("media_urls", []),
        status=doc["status"],
        priority_score=doc["priority_score"],
        priority_label=doc["priority_label"],
        priority_breakdown=doc.get("priority_breakdown"),
        escalation_history=doc.get("escalation_history", []),
        assigned_to=doc.get("assigned_to"),
        assigned_officer_id=doc.get("assigned_officer_id"),
        assigned_officer_name=doc.get("assigned_officer_name"),
        is_duplicate=doc.get("is_duplicate", False),
        duplicate_group_id=doc.get("duplicate_group_id"),
        resolution_evidence=doc.get("resolution_evidence"),
        citizen_verification=doc.get("citizen_verification"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        resolved_at=doc.get("resolved_at"),
        ai_analysis=doc.get("ai_analysis"),
        nyc311_unique_key=doc.get("nyc311_unique_key"),
        agency=doc.get("agency"),
        agency_name=doc.get("agency_name"),
        complaint_type=doc.get("complaint_type"),
        descriptor=doc.get("descriptor"),
        borough=doc.get("borough"),
        incident_zip=doc.get("incident_zip"),
        resolution_description=doc.get("resolution_description"),
        comments=doc.get("comments", []),
        history=doc.get("history", []),
    )


def _to_track(doc: dict) -> ComplaintTrack:
    return ComplaintTrack(
        id=str(doc["_id"]),
        complaint_id=doc["complaint_id"],
        status=doc["status"],
        priority_score=doc["priority_score"],
        priority_label=doc["priority_label"],
        priority_breakdown=doc.get("priority_breakdown"),
        escalation_history=doc.get("escalation_history", []),
        assigned_to=doc.get("assigned_to"),
        assigned_officer_id=doc.get("assigned_officer_id"),
        assigned_officer_name=doc.get("assigned_officer_name"),
        is_duplicate=doc.get("is_duplicate", False),
        duplicate_group_id=doc.get("duplicate_group_id"),
        resolution_evidence=doc.get("resolution_evidence"),
        citizen_verification=doc.get("citizen_verification"),
        nyc311_unique_key=doc.get("nyc311_unique_key"),
        agency=doc.get("agency"),
        agency_name=doc.get("agency_name"),
        complaint_type=doc.get("complaint_type"),
        descriptor=doc.get("descriptor"),
        borough=doc.get("borough"),
        incident_zip=doc.get("incident_zip"),
        resolution_description=doc.get("resolution_description"),
        media_urls=doc.get("media_urls", []),
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
    if user["role"] in ("admin", "officer"):
        return True
    if user["role"] == "citizen":
        return (
            doc["citizen_id"] == user["id"]
            or doc.get("citizen_id") == "citizen-nyc-seed"
            or bool(doc.get("nyc311_unique_key"))
        )
    return False


def _can_manage(doc: dict, user: dict) -> bool:
    """Who can change status / add department-side updates."""
    if user["role"] == "admin":
        return True
    if user["role"] == "officer":
        return (
            doc.get("assigned_to") == user.get("department")
            or doc.get("assigned_officer_id") == user["id"]
        )
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
    complaint_code = f"CMP-{now.year}-{count + 1:04d}"

    doc = {
        "complaint_id": complaint_code,
        "citizen_id": current_user["id"],
        "category": payload.category,
        "description": payload.description,
        "location": {
            "type": "Point",
            "coordinates": [payload.location.lng, payload.location.lat],
        },
        "address_text": payload.address_text,
        "media_urls": payload.media_urls,
        "status": "New",
        "priority_score": 0.0,
        "priority_label": "Low",
        "priority_breakdown": None,
        "escalation_history": [],
        "assigned_to": None,
        "assigned_officer_id": None,
        "assigned_officer_name": None,
        "is_duplicate": False,
        "duplicate_group_id": None,
        "resolution_evidence": None,
        "citizen_verification": None,
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

    # AI Extraction & Urgency
    ai_result = analyze_complaint(payload.description)
    doc["ai_analysis"] = {
        "category": ai_result["category"],
        "category_suggestion": ai_result["category_suggestion"],
        "confidence": ai_result["confidence"],
        "urgency_level": ai_result["urgency_level"],
        "summary": ai_result["summary"],
        "location_hints": ai_result["location_hints"],
        "duration": ai_result.get("duration"),
    }
    
    # Feature 2: Explainable Priority Calculation
    score_res = await score_complaint(
        db, doc, 
        urgency_level=ai_result["urgency_level"], 
        duration_days=ai_result.get("duration", {}).get("days", 0)
    )
    if len(score_res) == 3:
        score, label, breakdown = score_res
    else:
        score, label = score_res
        breakdown = None

    # Feature 1: 4-Step Duplicate Clustering Pipeline
    is_dup, group_id = await detect_duplicate(db, doc)

    update = {
        "priority_score": score,
        "priority_label": label,
        "priority_breakdown": breakdown,
        "is_duplicate": is_dup,
        "ai_analysis": doc["ai_analysis"]
    }
    
    if is_dup:
        update["duplicate_group_id"] = group_id
        history_entry = {
            "event": "status_changed",
            "detail": f"Flagged as likely duplicate of nearby {payload.category} cluster ({group_id})",
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
    db = get_db()
    query: dict = {}
    if status_filter:
        query["status"] = status_filter
    if category:
        query["category"] = category
    if current_user["role"] == "officer":
        # Officer sees department queue or cases assigned to them
        query["$or"] = [
            {"assigned_to": current_user.get("department")},
            {"assigned_officer_id": current_user["id"]}
        ]
    docs = await db.complaints.find(query).sort("priority_score", -1).to_list(200)

    # Dynamic escalation check for active complaints in queue
    escalated_docs = []
    for d in docs:
        if d.get("status") not in ("Resolved", "Closed"):
            escalation = await check_and_escalate_complaint(db, d)
            if escalation:
                d.update(escalation)
        escalated_docs.append(d)

    return [_to_out(d) for d in escalated_docs]


@router.get("/{complaint_id}", response_model=ComplaintOut)
async def get_complaint(complaint_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await _get_or_404(db, complaint_id)
    _require_view(doc, current_user)

    # Check for dynamic escalation
    if doc.get("status") not in ("Resolved", "Closed"):
        escalation = await check_and_escalate_complaint(db, doc)
        if escalation:
            doc.update(escalation)

    return _to_out(doc)


@router.get("/{complaint_id}/track", response_model=ComplaintTrack)
async def track_complaint(complaint_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await _get_or_404(db, complaint_id)
    _require_view(doc, current_user)
    return _to_track(doc)


# Batch 2: Evidence-Based Resolution
@router.post("/{complaint_id}/resolve", response_model=ComplaintOut)
async def resolve_complaint(
    complaint_id: str,
    payload: ResolutionSubmit,
    current_user: dict = Depends(get_current_user),
):
    """Allows officer or admin to resolve a complaint with required evidence (before/after photos, notes)."""
    db = get_db()
    doc = await _get_or_404(db, complaint_id)
    if not _can_manage(doc, current_user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized to resolve this complaint")

    now = datetime.utcnow()
    evidence = {
        "before_image_url": payload.before_image_url,
        "after_image_url": payload.after_image_url,
        "notes": payload.notes,
        "resolved_by": current_user["name"],
        "resolved_at": now,
        "metadata": payload.metadata or {},
    }

    update = {
        "status": "Resolved",
        "resolved_at": now,
        "resolution_evidence": evidence,
        "updated_at": now,
    }

    history_entry = {
        "event": "resolved",
        "detail": f"Resolved with evidence submitted by {current_user['name']} ({current_user['role']})",
        "at": now,
    }

    await db.complaints.update_one(
        {"_id": doc["_id"]},
        {"$set": update, "$push": {"history": history_entry}}
    )
    doc = await _get_or_404(db, complaint_id)
    return _to_out(doc)


# Batch 3: Citizen Verification
@router.post("/{complaint_id}/verify", response_model=ComplaintOut)
async def verify_complaint(
    complaint_id: str,
    payload: VerificationSubmit,
    current_user: dict = Depends(require_role("citizen")),
):
    """Allows citizen to verify resolution: Yes -> Closed; No -> Reopened."""
    db = get_db()
    doc = await _get_or_404(db, complaint_id)
    if doc["citizen_id"] != current_user["id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the reporting citizen can verify resolution")
    if doc["status"] != "Resolved":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Complaint must be in 'Resolved' status to verify")

    now = datetime.utcnow()
    verification = {
        "verified_at": now,
        "response": payload.response,
        "feedback": payload.feedback,
    }

    if payload.response == "yes":
        new_status = "Closed"
        detail = "Citizen verified issue is fixed. Case closed."
        event = "verified"
    else:
        new_status = "Reopened"
        detail = f"Citizen reported issue NOT fixed: {payload.feedback or 'No details'}. Returned to queue."
        event = "reopened"

    update = {
        "status": new_status,
        "citizen_verification": verification,
        "updated_at": now,
    }
    if new_status == "Reopened":
        update["resolved_at"] = None

    history_entry = {
        "event": event,
        "detail": detail,
        "at": now,
    }

    await db.complaints.update_one(
        {"_id": doc["_id"]},
        {"$set": update, "$push": {"history": history_entry}}
    )
    doc = await _get_or_404(db, complaint_id)
    return _to_out(doc)


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
    if payload.status in ("Resolved", "Closed") and not doc.get("resolved_at"):
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


# Batch 3: Smart Officer Assignment Recommendation
@router.get("/{complaint_id}/assign-recommendation")
async def get_assign_recommendation(
    complaint_id: str,
    _admin: dict = Depends(require_role("admin")),
):
    """Returns AI/rule-based recommended officer with reasons (workload, distance, availability)."""
    db = get_db()
    doc = await _get_or_404(db, complaint_id)
    recommendation = await get_smart_officer_recommendation(db, doc)
    return recommendation


@router.patch("/{complaint_id}/assign", response_model=ComplaintOut)
async def assign_complaint(
    complaint_id: str,
    payload: AssignUpdate | None = None,
    _admin: dict = Depends(require_role("admin")),
):
    """Assign to department and/or specific officer with support for admin override."""
    db = get_db()
    doc = await _get_or_404(db, complaint_id)
    now = datetime.utcnow()

    assigned_to = payload.assigned_to if payload and payload.assigned_to else None
    officer_id = payload.officer_id if payload and payload.officer_id else None
    officer_name = payload.officer_name if payload and payload.officer_name else None

    # If specific officer is provided, resolve department from officer record
    if officer_id and ObjectId.is_valid(officer_id):
        officer_doc = await db.users.find_one({"_id": ObjectId(officer_id)})
        if officer_doc:
            officer_name = officer_doc.get("name", officer_name)
            assigned_to = officer_doc.get("department") or assigned_to

    # Fallback to category department auto-mapping
    auto_assigned = False
    if not assigned_to:
        assigned_to = await department_for_category(db, doc["category"])
        auto_assigned = True
        if not assigned_to:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "No department mapped to this category; specify assigned_to explicitly",
            )

    update: dict = {
        "assigned_to": assigned_to,
        "assigned_officer_id": officer_id,
        "assigned_officer_name": officer_name,
        "updated_at": now
    }
    if doc["status"] in ("New", "Reopened"):
        update["status"] = "Assigned"

    if officer_name:
        detail = f"Assigned to {officer_name} ({assigned_to})"
    elif auto_assigned:
        detail = f"Auto-assigned to {assigned_to} (by category)"
    else:
        detail = f"Assigned to {assigned_to}"

    history_entry = {"event": "assigned", "detail": detail, "at": now}
    await db.complaints.update_one(
        {"_id": doc["_id"]}, {"$set": update, "$push": {"history": history_entry}}
    )
    doc = await _get_or_404(db, complaint_id)
    return _to_out(doc)


@router.post("/recalculate-priorities")
async def recalculate_priorities(_admin: dict = Depends(require_role("admin"))):
    """Triggers dynamic priority escalation evaluation across all active complaints."""
    db = get_db()
    cursor = db.complaints.find({"status": {"$in": ["New", "Assigned", "In Progress", "Reopened"]}})
    count = 0
    escalated = 0
    async for doc in cursor:
        count += 1
        res = await check_and_escalate_complaint(db, doc)
        if res:
            escalated += 1
    return {"checked": count, "escalated": escalated}


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
    comment = {
        "author_id": current_user["id"],
        "author_name": current_user["name"],
        "author_role": current_user["role"],
        "text": payload.text,
        "created_at": now,
    }
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
    db = get_db()
    doc = await _get_or_404(db, complaint_id)
    await db.complaints.delete_one({"_id": doc["_id"]})
