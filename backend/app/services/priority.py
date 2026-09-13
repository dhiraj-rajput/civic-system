"""Rule-based prioritization: age + category severity + nearby-similar-complaint count.

Owner: priority-engine track (see TASKS.md). Depends on the `complaints` collection
existing with a 2dsphere index on `location` (created at startup in app/main.py).
"""
from datetime import datetime

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
