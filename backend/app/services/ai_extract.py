"""Rule-based NLP engine for civic complaint analysis.

No external ML models required. All processing done via stdlib (re, difflib)
and rapidfuzz (fast string matching). Designed to run in < 10ms per complaint.

Functions:
    classify_complaint   — Category classification from keywords + regex
    detect_urgency       — CRITICAL/HIGH/MEDIUM/LOW urgency from text signals
    extract_duration     — Parse "for 2 weeks", "since last month" → structured dict
    extract_location_hints — Extract landmarks, road refs, gates from free text
    summarize_complaint  — Short ≤20-word summary of a complaint
    analyze_complaint    — Full pipeline combining all above functions
"""
import re
from collections import defaultdict
import difflib

# rapidfuzz gives ~10× speed boost for string matching; fall back to difflib
# if the package isn't installed (e.g. Docker cache not busted yet)
try:
    from rapidfuzz import fuzz as _fuzz
    def _ratio(a: str, b: str) -> float:
        return _fuzz.ratio(a, b) / 100.0
except ImportError:  # pragma: no cover
    def _ratio(a: str, b: str) -> float:  # type: ignore[misc]
        return difflib.SequenceMatcher(None, a, b).ratio()


__all__ = [
    "classify_complaint",
    "detect_urgency",
    "extract_duration",
    "extract_location_hints",
    "summarize_complaint",
    "analyze_complaint",
]

CATEGORY_RULES = {
    "pothole": {
        "keywords": [
            ("pothole", 10), ("pot hole", 10), ("road hole", 8), ("road damage", 7),
            ("road surface", 6), ("pavement crack", 7), ("broken road", 8), ("damaged road", 8),
            ("road broken", 8), ("road bad", 5), ("road condition", 5),
            ("crater", 8), ("ditch", 6), ("bump", 5), ("uneven road", 7),
            ("vehicle damage", 7), ("tyre", 5), ("tire", 5), ("flat tyre", 7),
            ("accident due to road", 9), ("road not repaired", 8),
            ("asphalt", 6), ("bitumen", 6), ("tar road", 5), ("cemented road", 4),
        ],
        "patterns": [
            r"hole[s]?\s+(?:in|on)\s+(?:the\s+)?road",
            r"road\s+(?:has|with)\s+(?:a\s+)?(?:big|large|deep|huge)?\s*hole",
            r"(?:car|vehicle|bike)\s+(?:got|getting)\s+(?:stuck|damaged)",
        ],
    },
    "garbage": {
        "keywords": [
            ("garbage", 10), ("trash", 10), ("waste", 8), ("litter", 8),
            ("rubbish", 9), ("dump", 8), ("dumping", 9), ("debris", 7),
            ("dirt", 6), ("filth", 8), ("dirty", 6), ("uncollected", 9),
            ("not collected", 9), ("no collection", 8), ("overflowing bin", 10),
            ("bin overflow", 10), ("dustbin", 8), ("garbage bin", 9),
            ("sanitation", 7), ("sweeping", 6), ("cleaning", 5),
            ("stench", 8), ("smell", 6), ("odor", 7), ("stink", 7),
            ("rats", 8), ("rodents", 8), ("mosquito", 7), ("insects", 6),
            ("solid waste", 8), ("municipal waste", 8),
        ],
        "patterns": [
            r"garbage\s+(?:not\s+)?(?:collected|picked|removed)",
            r"(?:pile|heap|mountain)\s+of\s+(?:garbage|trash|waste|rubbish)",
            r"open\s+(?:garbage|dump|dumping)\s+(?:site|area|spot)",
            r"illegal\s+(?:dumping|dump|waste)",
        ],
    },
    "streetlight": {
        "keywords": [
            ("streetlight", 10), ("street light", 10), ("lamp post", 9),
            ("light post", 9), ("road light", 9), ("street lamp", 9),
            ("no light", 8), ("dark road", 8), ("dark street", 8),
            ("light not working", 10), ("light out", 9), ("light broken", 9),
            ("bulb", 6), ("tube light", 7), ("pole", 5),
            ("electricity", 6), ("power outage", 6), ("public lighting", 9),
            ("night", 5), ("dark", 6), ("visibility", 7),
            ("light flickering", 8), ("light blinking", 8),
        ],
        "patterns": [
            r"(?:street|road|public)\s+light[s]?\s+(?:not|isn.t|aren.t)\s+(?:working|on|lit|functioning)",
            r"(?:lamp|light)\s+(?:post|pole)\s+(?:broken|damaged|fallen|leaning)",
            r"(?:area|road|street)\s+(?:is|remains)\s+dark",
            r"(?:no|without)\s+(?:street|road)?\s*light[s]?",
            r"gate\s+\d+.*(?:light|dark)",
        ],
    },
    "water_supply": {
        "keywords": [
            ("water supply", 10), ("no water", 10), ("water shortage", 10),
            ("water not coming", 10), ("water problem", 9), ("water issue", 9),
            ("water cut", 9), ("water cutoff", 9), ("water outage", 9),
            ("pipe burst", 10), ("pipe leak", 9), ("leaking pipe", 9),
            ("water leak", 9), ("burst pipe", 10), ("broken pipe", 9),
            ("dirty water", 9), ("contaminated water", 10), ("muddy water", 9),
            ("sewage", 9), ("drainage", 7), ("sewer", 8), ("drain block", 8),
            ("water pressure", 8), ("low pressure", 7), ("tap", 5),
            ("borewell", 8), ("bore well", 8), ("hand pump", 8),
            ("tanker", 7), ("water tanker", 9), ("water line", 8),
            ("flood", 8), ("waterlogging", 9), ("water logging", 9),
            ("overflow", 7), ("stagnant water", 9),
        ],
        "patterns": [
            r"(?:water|pipe|supply)\s+(?:is|has)\s+(?:leaking|burst|broken|blocked)",
            r"(?:no|without)\s+water\s+(?:supply|since|for)",
            r"water\s+(?:not|hasn.t|hasn't)\s+(?:come|coming|supplied|flowing)",
            r"(?:tap|taps)\s+(?:running|flowing)\s+(?:dry|empty|nothing)",
        ],
    },
    "other": {
        "keywords": [
            ("noise", 7), ("nuisance", 7), ("encroachment", 8),
            ("construction", 5), ("tree", 6), ("fallen tree", 9),
            ("stray dog", 8), ("animal", 6), ("park", 5),
            ("footpath", 7), ("sidewalk", 7), ("pavement blocked", 8),
            ("public property", 7), ("vandalism", 8),
        ],
        "patterns": [],
    },
}

URGENCY_RULES = {
    "CRITICAL": {
        "keywords": [
            ("electrocution", 20), ("electrocuted", 20), ("electric shock", 20),
            ("fire", 15), ("collapse", 15), ("collapsed", 15), ("falling", 12),
            ("injury", 15), ("injured", 15), ("accident", 13), ("hurt", 12),
            ("dead", 15), ("death", 15), ("fatality", 20), ("life threat", 20),
            ("life threatening", 20), ("dangerous", 12), ("extreme danger", 20),
            ("gas leak", 18), ("explosion", 20), ("fire hazard", 18),
        ],
        "patterns": [
            r"(?:someone|person|people)\s+(?:got|has|have)\s+(?:hurt|injured|died)",
            r"(?:risk|threat)\s+(?:to|of)\s+(?:life|lives|safety)",
            r"(?:live|bare|exposed)\s+(?:wire|wires|cable)",
        ],
    },
    "HIGH": {
        "keywords": [
            ("week", 8), ("weeks", 8), ("month", 10), ("months", 10),
            ("urgent", 10), ("emergency", 12), ("immediately", 10),
            ("hazard", 9), ("hazardous", 9), ("risk", 8), ("unsafe", 9),
            ("unacceptable", 8), ("severely", 8), ("critical", 9),
            ("children", 7), ("elderly", 7), ("hospital", 8),
            ("school", 7), ("flooded", 10), ("completely blocked", 10),
        ],
        "patterns": [
            r"(?:more|over|almost|nearly|about)\s+(?:a\s+)?(?:week|month|fortnight)",
            r"(?:\d+)\s+(?:weeks?|months?|days?)\s+(?:ago|back|since|now)",
            r"please\s+(?:fix|repair|resolve|address)\s+(?:urgently|immediately|asap)",
        ],
    },
    "MEDIUM": {
        "keywords": [
            ("days", 5), ("problem", 4), ("issue", 4), ("broken", 5),
            ("blocked", 5), ("not working", 6), ("failed", 5),
            ("inconvenience", 5), ("difficulty", 4), ("trouble", 4),
            ("please fix", 6), ("please repair", 6), ("attention", 5),
        ],
        "patterns": [
            r"(?:\d+)\s+days?",
            r"(?:since|for)\s+(?:the\s+)?(?:last\s+)?(?:few|couple\s+of)\s+days",
        ],
    },
    "LOW": {
        "keywords": [
            ("slight", 3), ("minor", 3), ("small", 3), ("little", 2),
        ],
        "patterns": [],
    },
}

def classify_complaint(description: str) -> dict:
    if not description or len(description.strip()) < 5:
        return {"category": "other", "confidence": 1.0, "matched_keywords": [], "method": "fallback"}
    
    desc_lower = description.lower()
    scores = defaultdict(float)
    matched = defaultdict(list)
    
    for cat, rules in CATEGORY_RULES.items():
        for kw, weight in rules["keywords"]:
            if kw in desc_lower:
                scores[cat] += weight
                matched[cat].append(kw)
                
        for pat in rules["patterns"]:
            if re.search(pat, desc_lower):
                scores[cat] += 15
                matched[cat].append(f"pattern_match: {pat}")
                
    if not scores:
        return {"category": "other", "confidence": 1.0, "matched_keywords": [], "method": "fallback"}
        
    best_cat = max(scores, key=scores.get)
    best_score = scores[best_cat]
    total_score = sum(scores.values())
    confidence = min(best_score / (total_score + 1e-5), 1.0)
    
    return {
        "category": best_cat,
        "confidence": confidence,
        "matched_keywords": matched[best_cat],
        "method": "rules"
    }

def detect_urgency(description: str) -> dict:
    if not description or len(description.strip()) < 5:
        return {"urgency_level": "LOW", "urgency_score": 0.0, "urgency_signals": []}
        
    desc_lower = description.lower()
    scores = defaultdict(float)
    signals = defaultdict(list)
    
    for level, rules in URGENCY_RULES.items():
        for kw, weight in rules["keywords"]:
            if kw in desc_lower:
                scores[level] += weight
                signals[level].append(kw)
                
        for pat in rules["patterns"]:
            if re.search(pat, desc_lower):
                scores[level] += 15
                signals[level].append(f"pattern_match: {pat}")
                
    if not scores:
        return {"urgency_level": "LOW", "urgency_score": 0.0, "urgency_signals": []}
        
    best_level = max(scores, key=scores.get)
    # Give precedence to higher urgency if score is somewhat close, 
    # but the simplest is just taking max score.
    
    # Actually, a better approach for urgency: if CRITICAL has any hits > threshold, it's critical.
    if scores.get("CRITICAL", 0) > 0:
        best_level = "CRITICAL"
    elif scores.get("HIGH", 0) > 0:
        best_level = "HIGH"
    elif scores.get("MEDIUM", 0) > 0:
        best_level = "MEDIUM"
    else:
        best_level = "LOW"
        
    return {
        "urgency_level": best_level,
        "urgency_score": scores.get(best_level, 0.0),
        "urgency_signals": signals[best_level]
    }

def extract_duration(text: str) -> dict:
    if not text:
        return {"value": 0, "unit": "unknown", "days": 0}
        
    desc_lower = text.lower()
    
    match = re.search(r"(\d+)\s+(day|week|month|year)s?", desc_lower)
    if match:
        val = int(match.group(1))
        unit = match.group(2)
        days = val
        if unit == 'week': days *= 7
        elif unit == 'month': days *= 30
        elif unit == 'year': days *= 365
        return {"value": val, "unit": unit, "days": days}
        
    match2 = re.search(r"since\s+(yesterday|last week|last month)", desc_lower)
    if match2:
        unit_str = match2.group(1)
        if unit_str == 'yesterday': return {"value": 1, "unit": "day", "days": 1}
        elif unit_str == 'last week': return {"value": 1, "unit": "week", "days": 7}
        elif unit_str == 'last month': return {"value": 1, "unit": "month", "days": 30}
        
    match3 = re.search(r"for\s+(a|an|one)\s+(day|week|month|year)", desc_lower)
    if match3:
        unit = match3.group(2)
        days = 1
        if unit == 'week': days = 7
        elif unit == 'month': days = 30
        elif unit == 'year': days = 365
        return {"value": 1, "unit": unit, "days": days}
        
    return {"value": 0, "unit": "unknown", "days": 0}

def extract_location_hints(text: str) -> dict:
    hints = {"landmarks": [], "road_refs": [], "area_refs": [], "near_refs": []}
    if not text:
        return hints
        
    desc_lower = text.lower()
    
    near_matches = re.finditer(r"near\s+([a-z0-9\s]+?)(?=\.|,|and|$)", desc_lower)
    for m in near_matches:
        hints["near_refs"].append(m.group(1).strip())
        
    at_matches = re.finditer(r"at\s+([a-z0-9\s]+?)(?=\.|,|and|$)", desc_lower)
    for m in at_matches:
        hints["landmarks"].append(m.group(1).strip())
        
    front_matches = re.finditer(r"in front of\s+([a-z0-9\s]+?)(?=\.|,|and|$)", desc_lower)
    for m in front_matches:
        hints["landmarks"].append(m.group(1).strip())
        
    corner_matches = re.finditer(r"corner of\s+([a-z0-9\s]+?)\s+and\s+([a-z0-9\s]+?)(?=\.|,|$)", desc_lower)
    for m in corner_matches:
        hints["road_refs"].append(f"{m.group(1).strip()} and {m.group(2).strip()}")
        
    gate_matches = re.finditer(r"gate\s+\d+", desc_lower)
    for m in gate_matches:
        hints["landmarks"].append(m.group(0).strip())
        
    road_matches = re.finditer(r"([a-z0-9\s]+?(?:road|street|avenue|lane))", desc_lower)
    for m in road_matches:
        rd = m.group(1).strip()
        if len(rd.split()) <= 4:
            hints["road_refs"].append(rd)
            
    return hints

def summarize_complaint(description: str, max_words: int = 20) -> str:
    if not description:
        return ""
        
    first_sentence = re.split(r'[.!?]', description)[0].strip()
    words = first_sentence.split()
    
    if len(words) > max_words:
        first_clause = re.split(r'[,;]', first_sentence)[0].strip()
        words = first_clause.split()
        if len(words) > max_words:
            words = words[:max_words]
        summary = " ".join(words) + "..."
    else:
        summary = first_sentence
        
    if summary:
        summary = summary[0].upper() + summary[1:]
        
    return summary

def analyze_complaint(description: str) -> dict:
    """Run the full analysis pipeline on a complaint description.

    Returns a dict with:
        category           — best-match category slug
        confidence         — 0.0–1.0 confidence in the category
        category_suggestion— human-readable category label
        urgency_level      — CRITICAL | HIGH | MEDIUM | LOW
        urgency_score      — raw urgency signal score
        duration           — {value, unit, days} if a duration was found
        location_hints     — {landmarks, road_refs, area_refs, near_refs}
        summary            — short ≤20-word summary (clean, no technical suffix)
        matched_keywords   — keywords that drove the category decision
        method             — 'rules' | 'fallback'
    """
    classification = classify_complaint(description)
    urgency = detect_urgency(description)
    duration = extract_duration(description)
    location_hints = extract_location_hints(description)
    summary_text = summarize_complaint(description)

    # Human-readable category labels
    CATEGORY_LABELS = {
        "pothole": "Pothole / Road Damage",
        "garbage": "Garbage / Sanitation",
        "streetlight": "Streetlight / Public Lighting",
        "water_supply": "Water Supply / Drainage",
        "other": "General / Other",
    }

    return {
        "category": classification["category"],
        "category_suggestion": CATEGORY_LABELS.get(classification["category"], classification["category"]),
        "confidence": round(classification["confidence"], 3),
        "urgency_level": urgency["urgency_level"],
        "urgency_score": urgency["urgency_score"],
        "urgency_signals": urgency["urgency_signals"],
        "duration": duration,
        "location_hints": location_hints,
        "summary": summary_text,   # clean summary without technical suffix
        "matched_keywords": classification["matched_keywords"],
        "method": classification["method"],
    }
