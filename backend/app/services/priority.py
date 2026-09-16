"""Rule-based prioritization: age + category severity + nearby-similar-complaint count,
plus rule-based duplicate detection (ported from ResolveAI's `ml_output.is_duplicate` /
`duplicate_group_id` shape, implemented here without ML -- same nearby-cluster query the
priority score already uses).

Owner: priority-engine track (see TASKS.md). Depends on the `complaints` collection
existing with a 2dsphere index on `location` (created at startup in app/main.py).
"""
from datetime import datetime, timedelta

CATEGORY_WEIGHT = {
    "water_supply": 1.0,
    "streetlight": 0.6,
    "pothole": 0.5,
    "garbage": 0.4,
    "other": 0.3,
}

W_AGE = 0.3
W_CATEGORY = 0.3
W_CLUSTER = 0.4
CLUSTER_RADIUS_METERS = 200
DUPLICATE_WINDOW_DAYS = 14


import difflib
import math

async def score_complaint(db, doc: dict, urgency_level: str = "LOW", duration_days: int = 0) -> tuple[float, str]:
    age_hours = (datetime.utcnow() - doc["created_at"]).total_seconds() / 3600
    if duration_days > 7:
        age_hours += (duration_days - 7) * 24
        
    age_score = min(age_hours / (24 * 7), 1.0)

    category_score = CATEGORY_WEIGHT.get(doc["category"], 0.3)

    # Use $geoWithin with $centerSphere for MongoDB 8 compatibility (avoids $near sort error in count_documents)
    # Earth radius in meters is approx 6,378,100
    radius_radians = CLUSTER_RADIUS_METERS / 6378100.0
    coords = doc["location"]["coordinates"]
    cluster_count = await db.complaints.count_documents(
        {
            "category": doc["category"],
            "location": {
                "$geoWithin": {
                    "$centerSphere": [coords, radius_radians]
                }
            },
        }
    )
    cluster_score = min(cluster_count / 10, 1.0)

    raw = W_AGE * age_score + W_CATEGORY * category_score + W_CLUSTER * cluster_score
    score = raw * 100
    
    if urgency_level == "CRITICAL":
        score *= 1.5
    elif urgency_level == "HIGH":
        score *= 1.2
        
    score = min(round(score, 1), 100.0)

    if score >= 85:
        label = "Critical"
    elif score >= 65:
        label = "High"
    elif score >= 40:
        label = "Medium"
    else:
        label = "Low"
    return score, label

def score_batch(complaints: list[dict]) -> list[tuple[float, str]]:
    results = []
    now = datetime.utcnow()
    for doc in complaints:
        age_hours = (now - doc["created_at"]).total_seconds() / 3600
        age_score = min(age_hours / (24 * 7), 1.0)
        category_score = CATEGORY_WEIGHT.get(doc["category"], 0.3)
        # Without DB, we assume cluster_score is 0 or pre-calculated
        cluster_score = doc.get("cluster_score", 0.0)
        raw = W_AGE * age_score + W_CATEGORY * category_score + W_CLUSTER * cluster_score
        score = raw * 100
        score = min(round(score, 1), 100.0)
        if score >= 85: label = "Critical"
        elif score >= 65: label = "High"
        elif score >= 40: label = "Medium"
        else: label = "Low"
        results.append((score, label))
    return results

def get_duplicate_score(new_doc: dict, candidate_doc: dict) -> float:
    time_diff = abs((new_doc["created_at"] - candidate_doc["created_at"]).total_seconds())
    if time_diff > DUPLICATE_WINDOW_DAYS * 86400:
        return 0.0
        
    score = 0.0
    if new_doc["category"] == candidate_doc["category"]:
        score += 0.4
        
    # Assuming the candidate is already retrieved via the $near geo-query, meaning it's within 200m
    score += 0.4 
    
    desc1 = new_doc.get("description", "")
    desc2 = candidate_doc.get("description", "")
    text_sim = difflib.SequenceMatcher(None, desc1, desc2).ratio()
    score += text_sim * 0.2
    
    return score


async def detect_duplicate(db, doc: dict) -> tuple[bool, str | None]:
    """Flag a newly-submitted complaint as a likely duplicate of an existing one.

    Rule: same category, within CLUSTER_RADIUS_METERS, submitted in the last
    DUPLICATE_WINDOW_DAYS. If a match exists, group this complaint under the
    earliest match's own duplicate_group_id (or its id, if it's the group root).
    Returns (is_duplicate, duplicate_group_id). A non-duplicate is the root of
    its own (implicit) group: duplicate_group_id is None and callers should
    treat the complaint's own id as the group id in that case.
    """
    cutoff = datetime.utcnow() - timedelta(days=DUPLICATE_WINDOW_DAYS)
    radius_radians = CLUSTER_RADIUS_METERS / 6378100.0
    coords = doc["location"]["coordinates"]
    earliest_match = await db.complaints.find_one(
        {
            "_id": {"$ne": doc.get("_id")},
            "category": doc["category"],
            "created_at": {"$gte": cutoff},
            "location": {
                "$geoWithin": {
                    "$centerSphere": [coords, radius_radians]
                }
            },
        },
        sort=[("created_at", 1)],
    )
    if not earliest_match:
        return False, None

    group_id = str(earliest_match.get("duplicate_group_id") or earliest_match["_id"])
    return True, group_id
