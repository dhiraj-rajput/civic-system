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


async def score_complaint(db, doc: dict) -> tuple[float, str]:
    age_hours = (datetime.utcnow() - doc["created_at"]).total_seconds() / 3600
    age_score = min(age_hours / (24 * 7), 1.0)

    category_score = CATEGORY_WEIGHT.get(doc["category"], 0.3)

    cluster_count = await db.complaints.count_documents(
        {
            "category": doc["category"],
            "location": {
                "$near": {
                    "$geometry": doc["location"],
                    "$maxDistance": CLUSTER_RADIUS_METERS,
                }
            },
        }
    )
    cluster_score = min(cluster_count / 10, 1.0)

    raw = W_AGE * age_score + W_CATEGORY * category_score + W_CLUSTER * cluster_score
    score = round(raw * 100, 1)

    if score >= 85:
        label = "Critical"
    elif score >= 65:
        label = "High"
    elif score >= 40:
        label = "Medium"
    else:
        label = "Low"
    return score, label


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
    earliest_match = await db.complaints.find_one(
        {
            "_id": {"$ne": doc.get("_id")},
            "category": doc["category"],
            "created_at": {"$gte": cutoff},
            "location": {
                "$near": {
                    "$geometry": doc["location"],
                    "$maxDistance": CLUSTER_RADIUS_METERS,
                }
            },
        },
        sort=[("created_at", 1)],
    )
    if not earliest_match:
        return False, None

    group_id = str(earliest_match.get("duplicate_group_id") or earliest_match["_id"])
    return True, group_id
