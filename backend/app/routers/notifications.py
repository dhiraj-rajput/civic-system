from datetime import datetime
from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationOut(BaseModel):
    id: str
    title: str
    message: str
    complaint_id: Optional[str] = None
    user_id: Optional[str] = None
    role: Optional[str] = None
    type: str = "info"
    read: bool = False
    created_at: datetime


def _to_out(doc: dict) -> NotificationOut:
    return NotificationOut(
        id=str(doc["_id"]),
        title=doc.get("title", ""),
        message=doc.get("message", ""),
        complaint_id=doc.get("complaint_id"),
        user_id=doc.get("user_id"),
        role=doc.get("role"),
        type=doc.get("type", "info"),
        read=doc.get("read", False),
        created_at=doc.get("created_at", datetime.utcnow()),
    )


async def create_notification(
    db,
    *,
    title: str,
    message: str,
    complaint_id: Optional[str] = None,
    user_id: Optional[str] = None,
    role: Optional[str] = None,
    notif_type: str = "info",
):
    """Utility to persist a notification event for targeted users or roles."""
    doc = {
        "title": title,
        "message": message,
        "complaint_id": complaint_id,
        "user_id": user_id,
        "role": role,
        "type": notif_type,
        "read": False,
        "created_at": datetime.utcnow(),
    }
    await db.notifications.insert_one(doc)


@router.get("", response_model=dict)
async def list_notifications(
    limit: int = Query(30, ge=1, le=100),
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user),
):
    """Retrieve in-app notifications for the authenticated user and their active role."""
    db = get_db()
    
    # Notifications targeted to user id, role, or broadcast to all
    or_clauses = [
        {"user_id": current_user["id"]},
        {"recipient": "all"},
    ]
    if current_user.get("role"):
        or_clauses.append({"role": current_user["role"]})

    query: dict = {"$or": or_clauses}
    if unread_only:
        query["read"] = False

    cursor = db.notifications.find(query).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(limit)

    # Count total unread
    unread_query = dict(query)
    unread_query["read"] = False
    unread_count = await db.notifications.count_documents(unread_query)

    return {
        "notifications": [_to_out(d) for d in docs],
        "unread_count": unread_count,
    }


@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Mark an individual notification as read."""
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid notification ID")
    
    db = get_db()
    res = await db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"read": True}},
    )
    if res.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    return {"status": "ok"}


@router.post("/read-all")
async def mark_all_as_read(
    current_user: dict = Depends(get_current_user),
):
    """Mark all notifications relevant to this user/role as read."""
    db = get_db()
    or_clauses = [
        {"user_id": current_user["id"]},
        {"recipient": "all"},
    ]
    if current_user.get("role"):
        or_clauses.append({"role": current_user["role"]})

    await db.notifications.update_many(
        {"$or": or_clauses, "read": False},
        {"$set": {"read": True}},
    )
    return {"status": "ok"}
