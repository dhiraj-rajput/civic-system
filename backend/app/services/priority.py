"""Priority Engine and Duplicate Clustering.

Features:
1. 4-Step Duplicate Clustering Pipeline:
   - Step 1: Same category
   - Step 2: GPS distance <= 200m
   - Step 3: Filed within 14 days
   - Step 4: Issue-keyword overlap >= 2 after canonical synonym mapping
2. Explainable Priority Breakdown:
   - Returns score, label, and detailed priority_breakdown dict
3. Dynamic Priority Escalation (Batch 2):
   - Escalates priority as time passes, approaching/breaching SLA, or cluster growth
   - Progression: Low -> Medium -> High -> Critical (Monotonic: never decreases)
   - Tracks escalation history with timestamps and reasons
"""
import math
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple

CATEGORY_WEIGHT = {
    "water_supply": 1.0,
    "streetlight": 0.6,
    "pothole": 0.5,
    "garbage": 0.4,
    "other": 0.3,
}

PRIORITY_TIERS = ["Low", "Medium", "High", "Critical"]

W_AGE = 0.3
W_CATEGORY = 0.3
W_CLUSTER = 0.4
CLUSTER_RADIUS_METERS = 200
DUPLICATE_WINDOW_DAYS = 14

# Canonical Synonym Map for Step 4 of Duplicate Clustering
SYNONYM_MAP = {
    # Pothole synonyms
    "trench": "pothole",
    "crater": "pothole",
    "ditch": "pothole",
    "bump": "pothole",
    "crack": "pothole",
    "cracks": "pothole",
    "hole": "pothole",
    "holes": "pothole",
    "asphalt": "pothole",
    "pavement": "pothole",
    "roadway": "pothole",
    "road": "pothole",
    
    # Garbage synonyms
    "trash": "garbage",
    "waste": "garbage",
    "rubbish": "garbage",
    "debris": "garbage",
    "litter": "garbage",
    "dirt": "garbage",
    "filth": "garbage",
    "dumping": "dump",
    "dump": "dump",
    "bin": "dustbin",
    "bins": "dustbin",
    "dustbin": "dustbin",
    
    # Overflow synonyms
    "overflowing": "overflow",
    "overflowed": "overflow",
    "overflow": "overflow",
    "spill": "overflow",
    "spilling": "overflow",
    "heaping": "overflow",
    "pile": "overflow",
    
    # Streetlight synonyms
    "dark": "unlit",
    "darkness": "unlit",
    "blackout": "unlit",
    "lamp": "streetlight",
    "streetlamp": "streetlight",
    "bulb": "streetlight",
    "pole": "streetlight",
    "flickering": "blinking",
    "blinking": "blinking",
    "out": "unlit",
    
    # Water supply synonyms
    "burst": "pipe_leak",
    "bursting": "pipe_leak",
    "leaking": "pipe_leak",
    "leak": "pipe_leak",
    "gushing": "pipe_leak",
    "muddy": "dirty_water",
    "brown": "dirty_water",
    "contaminated": "dirty_water",
    "pressure": "water_pressure",
    "dry": "no_water",
}

STOP_WORDS = {
    "the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to", "for",
    "of", "and", "near", "has", "have", "had", "been", "there", "it", "its",
    "my", "our", "we", "they", "this", "that", "with", "from", "by", "as",
    "please", "help", "very", "due", "outside", "corner", "street", "avenue", "rd", "st"
}


def extract_normalized_keywords(text: str) -> Set[str]:
    """Tokenizes text, strips punctuation, and maps synonyms to canonical terms."""
    if not text:
        return set()
    words = re.findall(r'[a-zA-Z0-9_]+', text.lower())
    keywords = set()
    for w in words:
        if len(w) < 3 or w in STOP_WORDS:
            continue
        canonical = SYNONYM_MAP.get(w, w)
        keywords.add(canonical)
    return keywords


def _haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6378100.0  # Earth radius in meters
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


async def score_complaint(
    db,
    doc: dict,
    urgency_level: Optional[str] = None,
    duration_days: Optional[int] = None,
) -> Tuple[float, str, dict]:
    """Calculate an explainable priority score and detailed breakdown for a complaint.

    Returns:
        (score: float, label: str, breakdown: dict)
    """
    created = doc.get("created_at") or datetime.utcnow()
    now = datetime.utcnow()
    age_hours = max((now - created).total_seconds() / 3600.0, 0.0)

    # 1. Age Factor (scaled 0-1)
    age_score = min(age_hours / (24 * 7), 1.0)
    category_score = CATEGORY_WEIGHT.get(doc.get("category", "other"), 0.3)

    radius_radians = CLUSTER_RADIUS_METERS / 6378100.0
    coords = (doc.get("location") or {}).get("coordinates") or [0.0, 0.0]
    
    cluster_count = 0
    if db is not None:
        try:
            cluster_query = {
                "category": doc.get("category", "other"),
                "location": {
                    "$geoWithin": {
                        "$centerSphere": [coords, radius_radians]
                    }
                },
            }
            if doc.get("_id"):
                cluster_query["_id"] = {"$ne": doc["_id"]}
            cluster_count = await db.complaints.count_documents(cluster_query)
        except Exception:
            try:
                raw_cands = await db.complaints.find({"category": doc.get("category", "")}).to_list(100)
                cluster_count = sum(
                    1 for c in raw_cands
                    if str(c.get("_id")) != str(doc.get("_id")) and _haversine_distance_m(
                        coords[1], coords[0],
                        (c.get("location") or {}).get("coordinates", [0, 0])[1],
                        (c.get("location") or {}).get("coordinates", [0, 0])[0]
                    ) <= CLUSTER_RADIUS_METERS
                )
            except Exception:
                cluster_count = 0
    cluster_score = min((cluster_count + 1) / 10.0, 1.0)

    raw = W_AGE * age_score + W_CATEGORY * category_score + W_CLUSTER * cluster_score
    score = raw * 100.0
    
    safety_boost = 1.0
    if urgency_level == "CRITICAL":
        safety_boost = 1.5
        score *= safety_boost
    elif urgency_level == "HIGH":
        safety_boost = 1.2
        score *= safety_boost

    sla_boost = 1.0
    sla_urgency_pts = 0.0
    if age_hours > 72:
        sla_boost = 1.4
        sla_urgency_pts = 20.0
        score += sla_urgency_pts
    elif age_hours > 48:
        sla_boost = 1.2
        sla_urgency_pts = 10.0
        score += sla_urgency_pts

    score = round(min(score, 100.0), 1)

    if score >= 80:
        label = "Critical"
    elif score >= 50:
        label = "High"
    elif score >= 25:
        label = "Medium"
    else:
        label = "Low"

    breakdown = {
        "age_hours": round(age_hours, 1),
        "age_factor": round(age_score * W_AGE * 100, 1),
        "category_severity": round(category_score * W_CATEGORY * 100, 1),
        "similar_complaints": cluster_count,
        "cluster_factor": round(cluster_score * W_CLUSTER * 100, 1),
        "safety_factor": round((safety_boost - 1.0) * 100, 1),
        "sla_urgency": round(sla_urgency_pts, 1),
        "sla_multiplier": sla_boost,
        "summary": f"Calculated based on {cluster_count} similar complaints nearby, category severity ({doc.get('category')}), and age of {round(age_hours, 1)}h."
    }

    return score, label, breakdown


def get_duplicate_score(new_doc: dict, candidate_doc: dict) -> float:
    """Computes similarity score between 0.0 and 1.0 using the 4-step pipeline criteria."""
    if new_doc.get("category") != candidate_doc.get("category"):
        return 0.0
    
    time_diff = abs((new_doc["created_at"] - candidate_doc["created_at"]).total_seconds())
    if time_diff > DUPLICATE_WINDOW_DAYS * 86400:
        return 0.0

    k1 = extract_normalized_keywords(new_doc.get("description", ""))
    k2 = extract_normalized_keywords(candidate_doc.get("description", ""))
    shared = k1.intersection(k2)

    if len(shared) >= 2:
        return 0.8 + min(len(shared) * 0.05, 0.2)
    return 0.3


async def detect_duplicate(db, doc: dict) -> Tuple[bool, Optional[str]]:
    """4-Step Duplicate Clustering Pipeline:
    Step 1: Same category
    Step 2: GPS distance <= 200m ($centerSphere)
    Step 3: Filed within 14 days
    Step 4: >= 2 shared keywords after canonical synonym mapping

    Yes -> duplicate / link to master issue (returns True, master_group_id)
    No -> separate issue (returns False, None)
    """
    cutoff = datetime.utcnow() - timedelta(days=DUPLICATE_WINDOW_DAYS)
    radius_radians = CLUSTER_RADIUS_METERS / 6378100.0
    coords = doc["location"]["coordinates"]

    new_keywords = extract_normalized_keywords(doc.get("description", ""))

    # Find candidates meeting steps 1, 2, and 3
    candidates = []
    try:
        cursor = db.complaints.find(
            {
                "_id": {"$ne": doc.get("_id")},
                "category": doc["category"],
                "created_at": {"$gte": cutoff},
                "location": {
                    "$geoWithin": {
                        "$centerSphere": [coords, radius_radians]
                    }
                },
            }
        ).sort("created_at", 1)
        candidates = await cursor.to_list(20)
    except Exception:
        candidates = []

    if not candidates:
        try:
            fallback_cursor = db.complaints.find(
                {
                    "_id": {"$ne": doc.get("_id")},
                    "category": doc["category"],
                    "created_at": {"$gte": cutoff},
                }
            ).sort("created_at", 1)
            raw_cands = await fallback_cursor.to_list(50)
            candidates = [
                c for c in raw_cands
                if _haversine_distance_m(
                    coords[1], coords[0],
                    c.get("location", {}).get("coordinates", [0, 0])[1],
                    c.get("location", {}).get("coordinates", [0, 0])[0]
                ) <= CLUSTER_RADIUS_METERS
            ]
        except Exception:
            candidates = []

    # Step 4: Check keyword overlap with synonym mapping
    for cand in candidates:
        cand_keywords = extract_normalized_keywords(cand.get("description", ""))
        shared = new_keywords.intersection(cand_keywords)
        if len(shared) >= 2:
            master_id = str(cand.get("duplicate_group_id") or cand.get("complaint_id") or cand["_id"])
            return True, master_id

    return False, None


def is_priority_higher(new_label: str, old_label: str) -> bool:
    """Returns True if new_label is strictly higher tier than old_label."""
    try:
        new_idx = PRIORITY_TIERS.index(new_label)
        old_idx = PRIORITY_TIERS.index(old_label)
        return new_idx > old_idx
    except ValueError:
        return False


async def check_and_escalate_complaint(db, doc: dict) -> Optional[dict]:
    """Evaluates whether an active complaint should be dynamically escalated.
    Monotonic: Priority is never decreased.
    Returns escalation update dict if escalated, else None.
    """
    if doc.get("status") in ("Resolved", "Closed"):
        return None

    now = datetime.utcnow()
    created_at = doc.get("created_at", now)
    age_hours = (now - created_at).total_seconds() / 3600

    current_label = doc.get("priority_label", "Low")
    current_score = doc.get("priority_score", 0.0)

    # Recompute priority with latest age & cluster count
    ai_urgency = (doc.get("ai_analysis") or {}).get("urgency_level", "LOW")
    new_score, new_label, breakdown = await score_complaint(db, doc, urgency_level=ai_urgency)

    reason = None
    # SLA breaches force escalation
    if age_hours >= 96 and is_priority_higher("Critical", current_label):
        new_label = "Critical"
        new_score = max(new_score, 88.0)
        reason = f"SLA severely breached ({int(age_hours)}h elapsed > 96h limit)"
    elif age_hours >= 72 and is_priority_higher("High", current_label):
        new_label = "High"
        new_score = max(new_score, 70.0)
        reason = f"SLA breached ({int(age_hours)}h elapsed > 72h limit)"
    elif age_hours >= 48 and current_label == "Low":
        new_label = "Medium"
        new_score = max(new_score, 45.0)
        reason = f"SLA deadline approaching ({int(age_hours)}h elapsed)"
    elif is_priority_higher(new_label, current_label):
        reason = f"Cluster density increased or conditions aggravated (score {current_score} -> {new_score})"

    if reason and (is_priority_higher(new_label, current_label) or new_score > current_score):
        escalation_entry = {
            "at": now,
            "old_priority": current_label,
            "new_priority": new_label,
            "old_score": current_score,
            "new_score": new_score,
            "reason": reason,
        }
        history_entry = {
            "event": "escalated",
            "detail": f"Priority escalated: {current_label} -> {new_label} ({reason})",
            "at": now,
        }
        update = {
            "priority_score": new_score,
            "priority_label": new_label,
            "priority_breakdown": breakdown,
            "updated_at": now,
        }
        await db.complaints.update_one(
            {"_id": doc["_id"]},
            {
                "$set": update,
                "$push": {
                    "escalation_history": escalation_entry,
                    "history": history_entry,
                },
            },
        )
        return {**update, "escalation_entry": escalation_entry}

    return None
