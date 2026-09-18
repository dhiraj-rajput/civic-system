from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

Category = Literal["pothole", "garbage", "streetlight", "water_supply", "other"]
Status = Literal["New", "Assigned", "In Progress", "Resolved", "Closed", "Reopened"]


class Location(BaseModel):
    lat: float
    lng: float


class ComplaintCreate(BaseModel):
    category: Category
    description: str
    location: Location
    address_text: Optional[str] = None
    borough: Optional[str] = None
    incident_zip: Optional[str] = None
    complaint_type: Optional[str] = None
    descriptor: Optional[str] = None
    agency: Optional[str] = None
    nyc311_unique_key: Optional[str] = None
    media_urls: List[str] = []


class StatusUpdate(BaseModel):
    status: Status


class CommentCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


class CommentOut(BaseModel):
    author_id: str
    author_name: str
    author_role: str
    text: str
    created_at: datetime


class AssignUpdate(BaseModel):
    assigned_to: Optional[str] = None
    officer_id: Optional[str] = None
    officer_name: Optional[str] = None


class HistoryEntry(BaseModel):
    event: str  # "created", "status_changed", "assigned", "comment_added", "escalated", "resolved", "verified", "reopened"
    detail: str
    at: datetime


class PriorityBreakdown(BaseModel):
    age_hours: float = 0.0
    age_factor: float = 0.0
    category_severity: float = 0.0
    similar_complaints: int = 0
    cluster_factor: float = 0.0
    safety_factor: float = 0.0
    sla_urgency: float = 0.0
    summary: str = ""


class EscalationEntry(BaseModel):
    at: datetime
    old_priority: str
    new_priority: str
    old_score: float
    new_score: float
    reason: str


class ResolutionEvidence(BaseModel):
    before_image_url: Optional[str] = None
    after_image_url: Optional[str] = None
    notes: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


class CitizenVerification(BaseModel):
    verified_at: datetime
    response: Literal["yes", "no"]
    rating: Optional[int] = Field(None, ge=1, le=5)
    feedback: Optional[str] = None


class ResolutionSubmit(BaseModel):
    before_image_url: Optional[str] = None
    after_image_url: Optional[str] = None
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class VerificationSubmit(BaseModel):
    response: Literal["yes", "no"]
    rating: Optional[int] = Field(None, ge=1, le=5)
    feedback: Optional[str] = None


class ComplaintOut(BaseModel):
    id: str
    ai_analysis: Optional[dict] = None
    complaint_id: str
    citizen_id: str
    category: Category
    description: str
    location: Location
    address_text: Optional[str] = None
    media_urls: List[str] = []
    status: Status = "New"
    priority_score: float = 0.0
    priority_label: str = "Low"
    priority_breakdown: Optional[PriorityBreakdown] = None
    escalation_history: List[EscalationEntry] = []
    assigned_to: Optional[str] = None
    assigned_officer_id: Optional[str] = None
    assigned_officer_name: Optional[str] = None
    is_duplicate: bool = False
    duplicate_group_id: Optional[str] = None
    resolution_evidence: Optional[ResolutionEvidence] = None
    citizen_verification: Optional[CitizenVerification] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    # Official NYC 311 Integration Fields
    nyc311_unique_key: Optional[str] = None
    agency: Optional[str] = None
    agency_name: Optional[str] = None
    complaint_type: Optional[str] = None
    descriptor: Optional[str] = None
    borough: Optional[str] = None
    incident_zip: Optional[str] = None
    resolution_description: Optional[str] = None
    street_name: Optional[str] = None
    cross_street_1: Optional[str] = None
    cross_street_2: Optional[str] = None
    community_board: Optional[str] = None
    landmark: Optional[str] = None
    open_data_channel_type: Optional[str] = None
    location_type: Optional[str] = None
    resolution_action_updated_date: Optional[str] = None
    comments: List[CommentOut] = []
    history: List[HistoryEntry] = []


class ComplaintTrack(BaseModel):
    id: str
    complaint_id: str
    status: Status
    priority_score: float
    priority_label: str
    priority_breakdown: Optional[PriorityBreakdown] = None
    escalation_history: List[EscalationEntry] = []
    assigned_to: Optional[str] = None
    assigned_officer_id: Optional[str] = None
    assigned_officer_name: Optional[str] = None
    is_duplicate: bool = False
    duplicate_group_id: Optional[str] = None
    resolution_evidence: Optional[ResolutionEvidence] = None
    citizen_verification: Optional[CitizenVerification] = None
    # Official NYC 311 Integration Fields
    nyc311_unique_key: Optional[str] = None
    agency: Optional[str] = None
    agency_name: Optional[str] = None
    complaint_type: Optional[str] = None
    descriptor: Optional[str] = None
    borough: Optional[str] = None
    incident_zip: Optional[str] = None
    resolution_description: Optional[str] = None
    media_urls: List[str] = []
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    history: List[HistoryEntry] = []
