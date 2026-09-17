"""Owner: analytics track (see TASKS.md). Depends on complaints track merged
(reads the `complaints` collection; add no writes here).

by_priority / totals extend the by_status+by_department shape from ResolveAI's
GET /admin/analytics (adapted: this project has no departments, so
`assigned_to` stands in). /hotspots and /sla are new -- they directly answer
the case study's "high-priority locations" and "SLA performance" requirements,
which neither scaffold had implemented. Router-level `require_role("admin")`
matches ResolveAI's admin-only analytics gate."""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends

from app.core.database import get_db
from app.core.deps import require_role

router = APIRouter(prefix="/analytics", tags=["analytics"], dependencies=[Depends(require_role("admin"))])


@router.get("/summary")
async def summary():
    db = get_db()
    by_status = await db.complaints.aggregate(
        [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    ).to_list(None)
    by_category = await db.complaints.aggregate(
        [{"$group": {"_id": "$category", "count": {"$sum": 1}}}]
    ).to_list(None)
    by_priority = await db.complaints.aggregate(
        [{"$group": {"_id": "$priority_label", "count": {"$sum": 1}}}]
    ).to_list(None)

    total_complaints = await db.complaints.count_documents({})
    unresolved_count = await db.complaints.count_documents({"status": {"$ne": "Resolved"}})
    duplicate_count = await db.complaints.count_documents({"is_duplicate": True})
    unassigned_count = await db.complaints.count_documents(
        {"assigned_to": None, "status": {"$ne": "Resolved"}}
    )

    return {
        "total_complaints": total_complaints,
        "unresolved_count": unresolved_count,
        "duplicate_count": duplicate_count,
        "unassigned_count": unassigned_count,
        "by_status": by_status,
        "by_category": by_category,
        "by_priority": by_priority,
    }


@router.get("/aging")
async def aging(sla_hours: int = 72):
    db = get_db()
    now = datetime.utcnow()
    cutoff = now - timedelta(hours=sla_hours)
    docs = await db.complaints.find(
        {"status": {"$ne": "Resolved"}, "created_at": {"$lt": cutoff}}
    ).sort("created_at", 1).to_list(200)
    for d in docs:
        d["id"] = str(d.pop("_id"))
        d["hours_elapsed"] = round((now - d["created_at"]).total_seconds() / 3600, 1)
    return docs


@router.get("/hotspots")
async def hotspots(limit: int = 10, grid_precision: int = 3):
    """Cluster unresolved complaints into coarse location buckets (rounding
    lat/lng to `grid_precision` decimals -- ~100m at precision 3) to surface
    the case study's "high-priority locations". Returns clusters sorted by
    total priority score, highest first."""
    db = get_db()
    pipeline = [
        {"$match": {"status": {"$ne": "Resolved"}}},
        {
            "$project": {
                "category": 1,
                "priority_score": 1,
                "priority_label": 1,
                "lng": {
                    "$round": [
                        {"$arrayElemAt": ["$location.coordinates", 0]},
                        grid_precision,
                    ]
                },
                "lat": {
                    "$round": [
                        {"$arrayElemAt": ["$location.coordinates", 1]},
                        grid_precision,
                    ]
                },
            }
        },
        {
            "$group": {
                "_id": {"lat": "$lat", "lng": "$lng", "category": "$category"},
                "complaint_count": {"$sum": 1},
                "total_priority_score": {"$sum": "$priority_score"},
                "avg_priority_score": {"$avg": "$priority_score"},
                "critical_or_high_count": {
                    "$sum": {
                        "$cond": [
                            {"$in": ["$priority_label", ["Critical", "High"]]},
                            1,
                            0,
                        ]
                    }
                },
            }
        },
        {"$sort": {"total_priority_score": -1}},
        {"$limit": limit},
    ]
    clusters = await db.complaints.aggregate(pipeline).to_list(limit)
    return [
        {
            "lat": c["_id"]["lat"],
            "lng": c["_id"]["lng"],
            "category": c["_id"]["category"],
            "complaint_count": c["complaint_count"],
            "total_priority_score": round(c["total_priority_score"], 1),
            "avg_priority_score": round(c["avg_priority_score"], 1),
            "critical_or_high_count": c["critical_or_high_count"],
        }
        for c in clusters
    ]


@router.get("/sla")
async def sla(sla_hours: int = 72):
    """SLA performance: what fraction of resolved complaints were resolved
    within `sla_hours`, average resolution time, and how many open complaints
    are already breaching SLA. Directly answers the case study's "SLA
    performance" requirement (not present in either source scaffold)."""
    db = get_db()
    now = datetime.utcnow()
    cutoff = now - timedelta(hours=sla_hours)

    resolved_docs = await db.complaints.find(
        {"status": "Resolved", "resolved_at": {"$ne": None}}
    ).to_list(None)

    resolved_count = len(resolved_docs)
    within_sla = 0
    total_resolution_hours = 0.0
    for d in resolved_docs:
        hours = (d["resolved_at"] - d["created_at"]).total_seconds() / 3600
        total_resolution_hours += hours
        if hours <= sla_hours:
            within_sla += 1

    avg_resolution_hours = round(total_resolution_hours / resolved_count, 1) if resolved_count else None
    sla_compliance_pct = round(100 * within_sla / resolved_count, 1) if resolved_count else None

    breaching_now = await db.complaints.count_documents(
        {"status": {"$ne": "Resolved"}, "created_at": {"$lt": cutoff}}
    )
    open_count = await db.complaints.count_documents({"status": {"$ne": "Resolved"}})

    return {
        "sla_hours": sla_hours,
        "resolved_count": resolved_count,
        "resolved_within_sla": within_sla,
        "sla_compliance_pct": sla_compliance_pct,
        "avg_resolution_hours": avg_resolution_hours,
        "open_count": open_count,
        "breaching_sla_now": breaching_now,
    }


@router.get("/trend")
async def trend(days: int = 30):
    """Daily complaint volume and resolution trend for the past N days.

    Returns one object per day with:
      - date       : YYYY-MM-DD
      - filed      : complaints created on that day
      - resolved   : complaints resolved on that day
      - open       : cumulative unresolved as of end-of-day (approximated)
    Used by the Admin dashboard LineChart / AreaChart.
    """
    db = get_db()
    now = datetime.utcnow()
    start = now - timedelta(days=days)

    # Aggregate filed per day
    filed_pipeline = [
        {"$match": {"created_at": {"$gte": start}}},
        {
            "$group": {
                "_id": {
                    "y": {"$year": "$created_at"},
                    "m": {"$month": "$created_at"},
                    "d": {"$dayOfMonth": "$created_at"},
                },
                "count": {"$sum": 1},
            }
        },
    ]
    # Aggregate resolved per day
    resolved_pipeline = [
        {"$match": {"resolved_at": {"$gte": start, "$ne": None}}},
        {
            "$group": {
                "_id": {
                    "y": {"$year": "$resolved_at"},
                    "m": {"$month": "$resolved_at"},
                    "d": {"$dayOfMonth": "$resolved_at"},
                },
                "count": {"$sum": 1},
            }
        },
    ]

    filed_raw = await db.complaints.aggregate(filed_pipeline).to_list(None)
    resolved_raw = await db.complaints.aggregate(resolved_pipeline).to_list(None)

    def key(doc):
        g = doc["_id"]
        return f"{g['y']:04d}-{g['m']:02d}-{g['d']:02d}"

    filed_map = {key(d): d["count"] for d in filed_raw}
    resolved_map = {key(d): d["count"] for d in resolved_raw}

    # Build ordered day list
    result = []
    for i in range(days):
        day = start + timedelta(days=i + 1)
        label = day.strftime("%Y-%m-%d")
        result.append({
            "date": label,
            "filed": filed_map.get(label, 0),
            "resolved": resolved_map.get(label, 0),
        })

    return result

