"""Gemini AI service for complaint categorization, urgency classification, and summarization.

Gracefully uses Google Gemini (gemini-1.5-flash) if GEMINI_API_KEY is configured.
Falls back seamlessly to the rule-based NLP engine (ai_extract.py) if the key is missing or on error.
"""
import os
import json
import logging
import httpx
from typing import Dict, Any, Optional

from app.core.config import settings
from app.services.ai_extract import analyze_complaint as rule_analyze

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

CATEGORY_LABELS = {
    "pothole": "Pothole / Road Damage",
    "garbage": "Garbage / Sanitation",
    "streetlight": "Streetlight / Public Lighting",
    "water_supply": "Water Supply / Drainage",
    "other": "General / Other",
}

def get_gemini_api_key() -> Optional[str]:
    return getattr(settings, "gemini_api_key", None) or os.environ.get("GEMINI_API_KEY")

async def analyze_with_gemini(description: str) -> Dict[str, Any]:
    """Analyze a civic complaint using Gemini AI with automatic rule-based fallback."""
    api_key = get_gemini_api_key()
    
    # If no Gemini API key configured, use rule-based extractor immediately
    if not api_key or api_key.strip() in ("", "your_gemini_api_key_here", "CHANGE_ME"):
        result = rule_analyze(description)
        result["engine"] = "rule_based"
        return result

    system_prompt = (
        "You are an expert civic municipal AI assistant. Analyze the following citizen civic complaint description. "
        "Return ONLY a raw valid JSON object (no markdown, no code blocks) with the following structure:\n"
        "{\n"
        '  "category": "pothole" | "garbage" | "streetlight" | "water_supply" | "other",\n'
        '  "confidence": float (0.0 to 1.0),\n'
        '  "urgency_level": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",\n'
        '  "urgency_score": int (0 to 100),\n'
        '  "summary": "Concise 1-sentence executive summary under 20 words",\n'
        '  "matched_keywords": ["keyword1", "keyword2"]\n'
        "}"
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": f"{system_prompt}\n\nComplaint description: {description}"}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 300,
            "responseMimeType": "application/json"
        }
    }

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            response = await client.post(
                f"{GEMINI_API_URL}?key={api_key.strip()}",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                text_content = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text_content)
                
                cat = parsed.get("category", "other").lower()
                if cat not in CATEGORY_LABELS:
                    cat = "other"
                    
                urgency_lvl = parsed.get("urgency_level", "MEDIUM").upper()
                if urgency_lvl not in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
                    urgency_lvl = "MEDIUM"

                return {
                    "category": cat,
                    "category_suggestion": CATEGORY_LABELS.get(cat, "General / Other"),
                    "confidence": float(parsed.get("confidence", 0.95)),
                    "urgency_level": urgency_lvl,
                    "urgency_score": int(parsed.get("urgency_score", 50)),
                    "urgency_signals": [],
                    "duration": None,
                    "location_hints": {"landmarks": [], "road_refs": []},
                    "summary": parsed.get("summary", description[:80]),
                    "matched_keywords": parsed.get("matched_keywords", []),
                    "method": "gemini_flash",
                    "engine": "gemini"
                }
            else:
                logger.warning(f"Gemini API returned status {response.status_code}: {response.text}")
    except Exception as exc:
        logger.warning(f"Gemini API call failed, falling back to rule-based engine: {exc}")

    # Fallback to local rule engine
    result = rule_analyze(description)
    result["engine"] = "rule_based"
    return result
