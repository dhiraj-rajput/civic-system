"""Complaints Router.
Handles complaint creation, media storage, 4-step duplicate clustering,
explainable priority breakdown, dynamic escalation, evidence-based resolution,
citizen verification, and smart officer assignment.
"""
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pymongo import ReturnDocument

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.routers.departments import department_for_category
from app.routers.notifications import create_notification
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
from app.services.gemini_service import analyze_with_gemini

router = APIRouter(prefix="/complaints", tags=["complaints"])


def _to_out(doc: dict) -> ComplaintOut:
    coords = (doc.get("location") or {}).get("coordinates") or [0.0, 0.0]
    lat = coords[1] if len(coords) > 1 else 0.0
    lng = coords[0] if len(coords) > 0 else 0.0
    return ComplaintOut(
        id=str(doc["_id"]),
        complaint_id=doc["complaint_id"],
        citizen_id=doc["citizen_id"],
        category=doc["category"],
        description=doc["description"],
        location={"lat": lat, "lng": lng},
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
        street_name=doc.get("street_name"),
        cross_street_1=doc.get("cross_street_1"),
        cross_street_2=doc.get("cross_street_2"),
        community_board=doc.get("community_board"),
        landmark=doc.get("landmark"),
        open_data_channel_type=doc.get("open_data_channel_type"),
        location_type=doc.get("location_type"),
        resolution_action_updated_date=doc.get("resolution_action_updated_date"),
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
    """Finds complaint by MongoDB _id or human-readable complaint_id (CMP-XXXX-XXXX)."""
    query = {"complaint_id": complaint_id}
    if ObjectId.is_valid(complaint_id):
        query = {"$or": [{"_id": ObjectId(complaint_id)}, {"complaint_id": complaint_id}]}
    doc = await db.complaints.find_one(query)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Complaint not found")
    return doc


def _can_view(doc: dict, user: dict) -> bool:
    if user["role"] == "admin":
        return True
    if user["role"] == "officer":
        dept = user.get("department")
        return (
            (dept and doc.get("assigned_to") == dept)
            or (user.get("id") and doc.get("assigned_officer_id") == user["id"])
            or doc.get("assigned_to") is None
            or doc.get("citizen_id") == "citizen-nyc-seed"
            or bool(doc.get("nyc311_unique_key"))
        )
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
        dept = user.get("department")
        user_id = user.get("id")
        return (
            bool(dept and doc.get("assigned_to") == dept)
            or bool(user_id and doc.get("assigned_officer_id") == user_id)
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
    
    # Atomic sequence generation to eliminate concurrency collisions
    counter = await db.counters.find_one_and_update(
        {"_id": f"complaints_{now.year}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    seq = counter.get("seq", 1)
    complaint_code = f"CMP-{now.year}-{seq:04d}"

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
        "borough": payload.borough,
        "incident_zip": payload.incident_zip,
        "complaint_type": payload.complaint_type,
        "descriptor": payload.descriptor,
        "agency": payload.agency,
        "nyc311_unique_key": payload.nyc311_unique_key,
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

    # AI Extraction & Urgency (Gemini AI with rule-based fallback)
    ai_result = await analyze_with_gemini(payload.description)
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
    duration_days = (ai_result.get("duration") or {}).get("days", 0)
    score_res = await score_complaint(
        db, doc, 
        urgency_level=ai_result["urgency_level"], 
        duration_days=duration_days
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
    
    push_history = []
    if is_dup and group_id:
        update["duplicate_group_id"] = group_id
        history_entry = {
            "event": "status_changed",
            "detail": f"Flagged as likely duplicate of nearby {payload.category} cluster ({group_id})",
            "at": now,
        }
        push_history.append(history_entry)
        doc["history"].append(history_entry)
        # Tag the master candidate with duplicate_group_id if not already set
        master_query = {"complaint_id": group_id, "duplicate_group_id": None}
        if ObjectId.is_valid(group_id):
            master_query = {
                "$or": [{"complaint_id": group_id}, {"_id": ObjectId(group_id)}],
                "duplicate_group_id": None,
            }
        await db.complaints.update_one(master_query, {"$set": {"duplicate_group_id": group_id}})

    if ai_result["category"] != payload.category and ai_result["confidence"] > 0.7:
        ai_history_entry = {
            "event": "comment_added",
            "detail": f"AI suggested category: {ai_result['category']} (confidence: {ai_result['confidence']*100:.1f}%)",
            "at": now,
        }
        push_history.append(ai_history_entry)
        doc["history"].append(ai_history_entry)

    db_mutation = {"$set": update}
    if push_history:
        db_mutation["$push"] = {"history": {"$each": push_history}}

    await db.complaints.update_one({"_id": result.inserted_id}, db_mutation)
    doc.update(update)

    # Notify administrators of incoming complaint needing dispatch
    try:
        await create_notification(
            db,
            title="New Complaint Submitted",
            message=f"Complaint {complaint_code} ({payload.category}) submitted by citizen. Needs department assignment.",
            complaint_id=complaint_code,
            role="admin",
            notif_type="warning",
        )
    except Exception:
        pass

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
    unassigned_only: bool = False,
    sort_by: str = "newest",  # "newest", "priority", "oldest"
    limit: int = 2500,
    current_user: dict = Depends(require_role("admin", "officer")),
):
    db = get_db()
    query: dict = {}
    if status_filter and status_filter != "All":
        query["status"] = status_filter
    if category and category != "All":
        query["category"] = category
    if unassigned_only:
        query["assigned_to"] = None
    if current_user["role"] == "officer":
        # Officer sees department queue or cases assigned to them
        query["$or"] = [
            {"assigned_to": current_user.get("department")},
            {"assigned_officer_id": current_user["id"]}
        ]

    # Flexible sorting: default to newest first so newly filed citizen complaints appear immediately
    if sort_by == "priority":
        sort_criteria = [("priority_score", -1), ("created_at", -1)]
    elif sort_by == "oldest":
        sort_criteria = [("created_at", 1)]
    else:  # "newest"
        sort_criteria = [("created_at", -1)]

    docs = await db.complaints.find(query).sort(sort_criteria).to_list(limit)
    return [_to_out(d) for d in docs]


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

    # Notify citizen that complaint is resolved and ready for verification
    try:
        if doc.get("citizen_id"):
            await create_notification(
                db,
                title="Complaint Resolved - Please Verify",
                message=f"Complaint {doc['complaint_id']} has been resolved with evidence. Please review and rate the resolution.",
                complaint_id=doc["complaint_id"],
                user_id=doc["citizen_id"],
                role="citizen",
                notif_type="success",
            )
    except Exception:
        pass

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
        "rating": payload.rating,
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
        {"$set": update, "$push": {"history": history_entry}},
    )

    # Trigger notifications based on verification outcome
    try:
        if payload.response == "yes":
            if doc.get("assigned_officer_id"):
                stars_txt = f" with a {payload.rating}-star rating" if payload.rating else ""
                await create_notification(
                    db,
                    title="Resolution Confirmed & Closed",
                    message=f"Citizen confirmed resolution for {doc['complaint_id']}{stars_txt}. Case closed.",
                    complaint_id=doc["complaint_id"],
                    user_id=doc["assigned_officer_id"],
                    role="officer",
                    notif_type="success",
                )
        else:
            if doc.get("assigned_officer_id"):
                await create_notification(
                    db,
                    title="Resolution Disputed - Reopened",
                    message=f"Citizen disputed {doc['complaint_id']}: '{payload.feedback or 'No comment'}'. Returned to your queue.",
                    complaint_id=doc["complaint_id"],
                    user_id=doc["assigned_officer_id"],
                    role="officer",
                    notif_type="alert",
                )
            await create_notification(
                db,
                title="Complaint Reopened",
                message=f"Citizen disputed resolution on {doc['complaint_id']}. Returned to active queue.",
                complaint_id=doc["complaint_id"],
                role="admin",
                notif_type="warning",
            )
    except Exception:
        pass
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

    if payload.status == "Resolved":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "To mark a complaint as Resolved, please submit resolution evidence via POST /complaints/{id}/resolve",
        )

    now = datetime.utcnow()
    old_status = doc["status"]
    update: dict = {"status": payload.status, "updated_at": now}
    if payload.status in ("In Progress", "Reopened"):
        update["resolved_at"] = None
    elif payload.status == "Closed" and not doc.get("resolved_at"):
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

    # If specific officer is provided, validate existence and role
    if officer_id:
        if not ObjectId.is_valid(officer_id):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid officer ID")
        officer_doc = await db.users.find_one({"_id": ObjectId(officer_id), "role": "officer"})
        if not officer_doc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Officer not found or user is not an officer")
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

    try:
        # Notify assigned officer if individual assignment was made
        if officer_id:
            await create_notification(
                db,
                title="New Case Assigned",
                message=f"You have been assigned to case {doc['complaint_id']} ({doc['category']}).",
                complaint_id=doc["complaint_id"],
                user_id=officer_id,
                role="officer",
                notif_type="warning",
            )
        # Notify citizen of department/officer dispatch
        if doc.get("citizen_id"):
            await create_notification(
                db,
                title="Complaint Assigned",
                message=f"Your complaint {doc['complaint_id']} has been assigned to {assigned_to}.",
                complaint_id=doc["complaint_id"],
                user_id=doc["citizen_id"],
                role="citizen",
                notif_type="info",
            )
    except Exception:
        pass

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
        {"_id": doc["_id"]},
        {
            "$set": {"updated_at": now},
            "$push": {"comments": comment, "history": history_entry}
        }
    )
    doc = await _get_or_404(db, complaint_id)
    return _to_out(doc)


@router.delete("/{complaint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_complaint(complaint_id: str, _admin: dict = Depends(require_role("admin"))):
    db = get_db()
    doc = await _get_or_404(db, complaint_id)
    await db.complaints.delete_one({"_id": doc["_id"]})
