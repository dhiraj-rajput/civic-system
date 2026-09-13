"""Owner: analytics track (see TASKS.md). Depends on complaints track merged
(reads the `complaints` collection; add no writes here)."""
from datetime import datetime, timedelta

from fastapi import APIRouter

from app.core.database import get_db

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
async def summary():
    db = get_db()
    by_status = await db.complaints.aggregate(
        [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    ).to_list(None)
    by_category = await db.complaints.aggregate(
        [{"$group": {"_id": "$category", "count": {"$sum": 1}}}]
    ).to_list(None)
    return {"by_status": by_status, "by_category": by_category}


@router.get("/aging")
async def aging(sla_hours: int = 72):
    db = get_db()
    cutoff = datetime.utcnow() - timedelta(hours=sla_hours)
    docs = await db.complaints.find(
        {"status": {"$ne": "Resolved"}, "created_at": {"$lt": cutoff}}
    ).to_list(200)
    for d in docs:
        d["id"] = str(d.pop("_id"))
    return docs
