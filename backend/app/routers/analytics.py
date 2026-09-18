"""Analytics Router.
Provides summary metrics, SLA performance, aging alerts, trend analytics,
hotspots, geographic heatmap data, and intake telemetry for administrative dashboards.
"""
import asyncio
import csv
import io
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.core.database import get_db
from app.core.deps import require_role

router = APIRouter(prefix="/analytics", tags=["analytics"], dependencies=[Depends(require_role("admin"))])

ACTIVE_STATUSES = ["New", "Assigned", "In Progress", "Reopened"]
RESOLVED_STATUSES = ["Resolved", "Closed"]


@router.get("/summary")
async def summary():
    db = get_db()
    (
        by_status,
        by_category,
        by_priority,
        duplicate_count,
        unassigned_count,
        active_officers,
        active_departments,
    ) = await asyncio.gather(
        db.complaints.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]).to_list(20),
        db.complaints.aggregate([{"$group": {"_id": "$category", "count": {"$sum": 1}}}]).to_list(20),
        db.complaints.aggregate([{"$group": {"_id": "$priority_label", "count": {"$sum": 1}}}]).to_list(20),
        db.complaints.count_documents({"is_duplicate": True}),
        db.complaints.count_documents({"assigned_to": None, "status": {"$in": ACTIVE_STATUSES}}),
        db.complaints.distinct("assigned_officer_id", {"status": {"$in": ACTIVE_STATUSES}, "assigned_officer_id": {"$ne": None}}),
        db.complaints.distinct("assigned_to", {"status": {"$in": ACTIVE_STATUSES}, "assigned_to": {"$ne": None}}),
    )

    status_map = {item["_id"]: item["count"] for item in by_status if item.get("_id")}
    total_complaints = sum(status_map.values())
    unresolved_count = sum(status_map.get(s, 0) for s in ACTIVE_STATUSES)
    resolved_count = sum(status_map.get(s, 0) for s in RESOLVED_STATUSES)
    active_officers_count = len([o for o in active_officers if o])
    active_departments_count = len([d for d in active_departments if d])

    return {
        "total_complaints": total_complaints,
        "unresolved_count": unresolved_count,
        "resolved_count": resolved_count,
        "duplicate_count": duplicate_count,
        "unassigned_count": unassigned_count,
        "active_officers_count": active_officers_count,
        "active_departments_count": active_departments_count,
        "by_status": by_status,
        "by_category": by_category,
        "by_priority": by_priority,
    }


@router.get("/export")
async def export_analytics_report(
    format: str = Query("csv", regex="^(csv)$"),
):
    """Streams an exportable CSV report containing complaint aging, dispatch metadata, and SLA stats."""
    db = get_db()
    cursor = db.complaints.find({}).sort("created_at", -1)

    output = io.StringIO()
    writer = csv.writer(output)

    # Header row
    writer.writerow([
        "Complaint ID",
        "NYC 311 Key",
        "Category",
        "Status",
        "Priority Label",
        "Priority Score",
        "Borough",
        "Address",
        "Agency",
        "Assigned Department",
        "Assigned Officer",
        "Created At",
        "Resolved At",
        "Is Duplicate",
        "Verification Status",
        "Citizen Rating"
    ])

    async for doc in cursor:
        verification = doc.get("citizen_verification") or {}
        writer.writerow([
            doc.get("complaint_id", str(doc.get("_id", ""))),
            doc.get("nyc311_unique_key", ""),
            doc.get("category", ""),
            doc.get("status", ""),
            doc.get("priority_label", ""),
            doc.get("priority_score", 0),
            doc.get("borough", ""),
            doc.get("address_text", ""),
            doc.get("agency", ""),
            doc.get("assigned_to", "Unassigned"),
            doc.get("assigned_officer_name", "Unassigned"),
            doc.get("created_at", "").isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at", "")),
            doc.get("resolved_at", "").isoformat() if isinstance(doc.get("resolved_at"), datetime) else str(doc.get("resolved_at", "")),
            "Yes" if doc.get("is_duplicate") else "No",
            verification.get("response", "Pending"),
            verification.get("rating", "")
        ])

    csv_data = output.getvalue()
    filename = f"civic_analytics_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/aging")
async def aging(sla_hours: int = 72):
    db = get_db()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    cutoff = now - timedelta(hours=sla_hours)
    docs = await db.complaints.find(
        {"status": {"$in": ACTIVE_STATUSES}, "created_at": {"$lt": cutoff}}
    ).sort("created_at", 1).to_list(200)
    for d in docs:
        d["id"] = str(d.pop("_id"))
        d["hours_elapsed"] = round((now - d["created_at"]).total_seconds() / 3600, 1)
    return docs


@router.get("/hotspots")
async def hotspots(limit: int = 10, grid_precision: int = 3):
    """Cluster active complaints into coarse geographic buckets to highlight dense problem areas."""
    db = get_db()
    pipeline = [
        {"$match": {"status": {"$in": ACTIVE_STATUSES}}},
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
    """SLA performance: fraction of complaints resolved within sla_hours and current breach volume."""
    db = get_db()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    cutoff = now - timedelta(hours=sla_hours)

    sla_pipeline = [
        {"$match": {"status": {"$in": RESOLVED_STATUSES}, "resolved_at": {"$ne": None}}},
        {
            "$project": {
                "resolution_hours": {
                    "$divide": [{"$subtract": ["$resolved_at", "$created_at"]}, 3600000]
                }
            }
        },
        {
            "$group": {
                "_id": None,
                "resolved_count": {"$sum": 1},
                "total_hours": {"$sum": "$resolution_hours"},
                "within_sla": {
                    "$sum": {"$cond": [{"$lte": ["$resolution_hours", sla_hours]}, 1, 0]}
                }
            }
        }
    ]

    (agg_res, breaching_now, open_count) = await asyncio.gather(
        db.complaints.aggregate(sla_pipeline).to_list(1),
        db.complaints.count_documents({"status": {"$in": ACTIVE_STATUSES}, "created_at": {"$lt": cutoff}}),
        db.complaints.count_documents({"status": {"$in": ACTIVE_STATUSES}})
    )

    if agg_res and agg_res[0].get("resolved_count", 0) > 0:
        resolved_count = agg_res[0]["resolved_count"]
        total_resolution_hours = agg_res[0]["total_hours"]
        within_sla = agg_res[0]["within_sla"]
        avg_resolution_hours = round(total_resolution_hours / resolved_count, 1)
        sla_compliance_pct = round(100 * within_sla / resolved_count, 1)
    else:
        resolved_count = 0
        within_sla = 0
        avg_resolution_hours = None
        sla_compliance_pct = None

    active_breach_rate_pct = round(100 * breaching_now / open_count, 1) if open_count > 0 else 0.0

    return {
        "sla_hours": sla_hours,
        "resolved_count": resolved_count,
        "resolved_within_sla": within_sla,
        "sla_compliance_pct": sla_compliance_pct,
        "avg_resolution_hours": avg_resolution_hours,
        "open_count": open_count,
        "breaching_sla_now": breaching_now,
        "active_breach_rate_pct": active_breach_rate_pct,
    }


@router.get("/trend")
async def trend(days: int = 30):
    db = get_db()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    start = now - timedelta(days=days)

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

    filed_raw, resolved_raw = await asyncio.gather(
        db.complaints.aggregate(filed_pipeline).to_list(None),
        db.complaints.aggregate(resolved_pipeline).to_list(None),
    )

    def key(doc):
        g = doc["_id"]
        return f"{g['y']:04d}-{g['m']:02d}-{g['d']:02d}"

    filed_map = {key(d): d["count"] for d in filed_raw}
    resolved_map = {key(d): d["count"] for d in resolved_raw}

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


@router.get("/intake-telemetry")
async def intake_telemetry():
    """Computes dynamic 24-hour hourly distribution and borough jurisdiction breakdown from live database records."""
    db = get_db()

    # 1. Aggregate hourly distribution
    pipeline_hours = [
        {
            "$project": {
                "hour": {"$hour": "$created_at"},
            }
        },
        {
            "$group": {
                "_id": "$hour",
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}}
    ]
    raw_hours = await db.complaints.aggregate(pipeline_hours).to_list(None)
    hour_map = {item["_id"]: item["count"] for item in raw_hours if item["_id"] is not None}

    max_h_count = max(hour_map.values()) if hour_map else 1
    hourly_result = []
    for h in range(24):
        cnt = hour_map.get(h, 0)
        if h == 0:
            lbl = "12 AM"
        elif h < 12:
            lbl = f"{h} AM"
        elif h == 12:
            lbl = "12 PM"
        else:
            lbl = f"{h - 12} PM"

        hourly_result.append({
            "hour": f"{h:02d}",
            "label": lbl,
            "count": cnt,
            "peak": cnt >= (0.75 * max_h_count) if max_h_count > 0 else False
        })

    # 2. Aggregate Borough jurisdiction
    pipeline_boroughs = [
        {
            "$project": {
                "borough": {
                    "$cond": [
                        {"$and": [{"$ne": ["$borough", None]}, {"$ne": ["$borough", ""]}]},
                        "$borough",
                        {"$cond": [
                            {"$regexMatch": {"input": {"$ifNull": ["$address_text", ""]}, "regex": "Brooklyn", "options": "i"}},
                            "Brooklyn",
                            {"$cond": [
                                {"$regexMatch": {"input": {"$ifNull": ["$address_text", ""]}, "regex": "Queens", "options": "i"}},
                                "Queens",
                                {"$cond": [
                                    {"$regexMatch": {"input": {"$ifNull": ["$address_text", ""]}, "regex": "Bronx", "options": "i"}},
                                    "The Bronx",
                                    {"$cond": [
                                        {"$regexMatch": {"input": {"$ifNull": ["$address_text", ""]}, "regex": "Staten", "options": "i"}},
                                        "Staten Island",
                                        "Manhattan"
                                    ]}
                                ]}
                            ]}
                        ]}
                    ]
                }
            }
        },
        {
            "$group": {
                "_id": "$borough",
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"count": -1}}
    ]
    raw_boroughs = await db.complaints.aggregate(pipeline_boroughs).to_list(10)
    total_complaints = sum(b["count"] for b in raw_boroughs) or 1

    color_palette = ["bg-amber-500", "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-rose-500", "bg-indigo-500"]
    borough_result = []
    for idx, b in enumerate(raw_boroughs):
        name = b["_id"] or "Unassigned"
        cnt = b["count"]
        share = round((cnt / total_complaints) * 100)
        borough_result.append({
            "name": name,
            "count": cnt,
            "share": share,
            "color": color_palette[idx % len(color_palette)]
        })

    # 3. Peak Day of the week
    pipeline_dow = [
        {
            "$project": {
                "day": {"$dayOfWeek": "$created_at"}  # 1 = Sunday, 2 = Monday, ...
            }
        },
        {
            "$group": {
                "_id": "$day",
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"count": -1}}
    ]
    raw_dow = await db.complaints.aggregate(pipeline_dow).to_list(None)
    DOW_MAP = {1: "Sunday", 2: "Monday", 3: "Tuesday", 4: "Wednesday", 5: "Thursday", 6: "Friday", 7: "Saturday"}
    top_day = DOW_MAP.get(raw_dow[0]["_id"], "Monday") if raw_dow else "Monday"
    top_day_share = round((raw_dow[0]["count"] / total_complaints) * 100, 1) if raw_dow else 25.0

    return {
        "hourly": hourly_result,
        "boroughs": borough_result,
        "peak_day": top_day,
        "peak_day_share": top_day_share,
        "total_analyzed": total_complaints
    }


@router.get("/heatmap")
async def heatmap(
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    days: Optional[int] = Query(None),
    recurring_only: bool = Query(False),
    borough: Optional[str] = Query(None),
):
    """Returns granular complaint points for the interactive Civic Heatmap with multi-parameter filtering."""
    db = get_db()
    query: dict = {}

    if category and category != "All":
        query["category"] = category
    if priority and priority != "All":
        query["priority_label"] = priority
    if status_filter and status_filter != "All":
        query["status"] = status_filter
    if recurring_only:
        query["is_duplicate"] = True
    if days:
        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)
        query["created_at"] = {"$gte": cutoff}
    if borough and borough.strip() not in ("All", "All Boroughs", "All Locations", ""):
        b_clean = borough.strip()
        query["$or"] = [
            {"borough": {"$regex": b_clean, "$options": "i"}},
            {"address_text": {"$regex": b_clean, "$options": "i"}},
        ]

    projection = {
        "location": 1,
        "complaint_id": 1,
        "category": 1,
        "priority_score": 1,
        "priority_label": 1,
        "status": 1,
        "borough": 1,
        "address_text": 1,
        "is_duplicate": 1,
        "duplicate_group_id": 1,
        "created_at": 1,
    }
    docs = await db.complaints.find(query, projection=projection).sort("created_at", -1).to_list(1500)
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    points = []
    for d in docs:
        loc = d.get("location") or {}
        coords = loc.get("coordinates")
        lat = None
        lng = None
        if coords and isinstance(coords, (list, tuple)) and len(coords) >= 2:
            try:
                lng = float(coords[0])
                lat = float(coords[1])
            except (ValueError, TypeError):
                pass
        if lat is None or lng is None:
            try:
                if "lat" in loc and "lng" in loc and loc["lat"] is not None and loc["lng"] is not None:
                    lat = float(loc["lat"])
                    lng = float(loc["lng"])
            except (ValueError, TypeError):
                pass

        # Skip points with missing or zero coordinates
        if lat is None or lng is None or (lat == 0.0 and lng == 0.0):
            continue

        created_at = d.get("created_at", now)
        if not isinstance(created_at, datetime):
            created_at = now
        hours_elapsed = (now - created_at).total_seconds() / 3600
        points.append({
            "id": str(d["_id"]),
            "complaint_id": d.get("complaint_id", ""),
            "category": d.get("category", "other"),
            "priority_score": d.get("priority_score", 0.0),
            "priority_label": d.get("priority_label", "Low"),
            "status": d.get("status", "New"),
            "lat": lat,
            "lng": lng,
            "borough": d.get("borough", ""),
            "address_text": d.get("address_text", ""),
            "is_duplicate": d.get("is_duplicate", False),
            "duplicate_group_id": d.get("duplicate_group_id"),
            "hours_elapsed": round(hours_elapsed, 1),
            "is_sla_breached": hours_elapsed > 72 and d.get("status") in ACTIVE_STATUSES,
        })

    return points
