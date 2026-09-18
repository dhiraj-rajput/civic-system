from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from app.services.ai_extract import classify_complaint
from app.services.gemini_service import analyze_with_gemini

router = APIRouter(prefix="/ai", tags=["ai"])

class AnalyzeRequest(BaseModel):
    description: str

class ClassifyResponse(BaseModel):
    category: str
    confidence: float
    matched_keywords: List[str]

@router.post("/analyze")
async def api_analyze_complaint(req: AnalyzeRequest) -> Dict[str, Any]:
    return await analyze_with_gemini(req.description)

@router.post("/classify", response_model=ClassifyResponse)
async def api_classify_complaint(req: AnalyzeRequest):
    res = classify_complaint(req.description)
    return ClassifyResponse(
        category=res["category"],
        confidence=res["confidence"],
        matched_keywords=res["matched_keywords"]
    )
