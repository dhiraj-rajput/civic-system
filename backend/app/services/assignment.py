"""Smart Officer Assignment Service (Batch 3).

Recommends the best officer within a department based on:
1. Department match
2. Current active workload (fewer open complaints = higher score)
3. Officer availability
4. Geographic proximity (Haversine distance to complaint)

Provides explainable recommendation reasons and supports admin override.
"""
import math
from typing import Dict, List, Optional, Tuple


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance in kilometers."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


async def get_smart_officer_recommendation(
    db, 
    complaint_doc: dict, 
    target_department: Optional[str] = None
) -> Dict:
    """Evaluates all officers in the department and returns ranked candidates with explainable reasons."""
    dept_name = target_department or complaint_doc.get("assigned_to")
    if not dept_name:
        # Fallback to category mapping
        from app.routers.departments import department_for_category
        dept_name = await department_for_category(db, complaint_doc.get("category", "other"))

    if not dept_name:
        return {
            "recommended_officer": None,
            "department": None,
            "reasons": ["No matching department found for complaint category"],
            "candidates": []
        }

    # Find all officers belonging to this department
    officers = await db.users.find(
        {"role": "officer", "department": dept_name}
    ).to_list(50)

    if not officers:
        return {
            "recommended_officer": None,
            "department": dept_name,
            "reasons": [f"No officers currently registered under {dept_name}"],
            "candidates": []
        }

    comp_coords = (complaint_doc.get("location") or {}).get("coordinates") or [-74.0060, 40.7128]
    comp_lng = comp_coords[0] if len(comp_coords) > 0 else -74.0060
    comp_lat = comp_coords[1] if len(comp_coords) > 1 else 40.7128

    # Batch workload counting across all officers in 1 single aggregation query (eliminates N+1)
    officer_ids = [str(o["_id"]) for o in officers]
    workload_pipeline = [
        {
            "$match": {
                "assigned_officer_id": {"$in": officer_ids},
                "status": {"$in": ["Assigned", "In Progress", "Reopened"]}
            }
        },
        {"$group": {"_id": "$assigned_officer_id", "count": {"$sum": 1}}}
    ]
    workload_counts = await db.complaints.aggregate(workload_pipeline).to_list(None)
    workload_map = {item["_id"]: item["count"] for item in workload_counts if item["_id"]}

    candidates = []
    for officer in officers:
        officer_id = str(officer["_id"])
        officer_name = officer.get("name", "Officer")

        # 1. Workload from pre-aggregated batch map
        open_workload = workload_map.get(officer_id, 0)

        # 2. Availability
        is_available = officer.get("is_available", True)

        # 3. Distance
        off_lat = officer.get("lat") or 40.7128
        off_lng = officer.get("lng") or -74.0060
        dist_km = haversine_distance_km(comp_lat, comp_lng, off_lat, off_lng)

        # Score calculation (0-100)
        # Workload factor: max 50 points (0 complaints = 50, 5 complaints = 25, >= 10 complaints = 0)
        workload_score = max(0, 50 - (open_workload * 5))

        # Proximity factor: max 35 points (0km = 35, 10km = 15, >= 20km = 0)
        proximity_score = max(0, 35 - (dist_km * 1.75))

        # Availability factor: max 15 points
        avail_score = 15 if is_available else 0

        total_score = round(workload_score + proximity_score + avail_score, 1)

        candidate_info = {
            "officer_id": officer_id,
            "name": officer_name,
            "email": officer.get("email"),
            "department": dept_name,
            "score": total_score,
            "active_workload": open_workload,
            "distance_km": dist_km,
            "is_available": is_available,
        }
        candidates.append(candidate_info)

    # Sort candidates by score descending
    candidates.sort(key=lambda c: c["score"], reverse=True)
    best = candidates[0]

    reasons = [
        f"Department Match: {dept_name}",
        f"Active Workload: {best['active_workload']} open cases (rank 1 of {len(candidates)})",
        f"Proximity: {best['distance_km']} km from incident location",
        "Availability: Ready for assignment" if best["is_available"] else "Availability: Limited",
    ]

    return {
        "recommended_officer": best,
        "department": dept_name,
        "score": best["score"],
        "reasons": reasons,
        "candidates": candidates
    }
