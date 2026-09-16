from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

Category = Literal["pothole", "garbage", "streetlight", "water_supply", "other"]
Status = Literal["New", "Assigned", "In Progress", "Resolved"]


class Location(BaseModel):
    lat: float
    lng: float


class ComplaintCreate(BaseModel):
    category: Category
    description: str
    location: Location
    address_text: Optional[str] = None


class ComplaintOut(BaseModel):
    id: str
    ai_analysis: Optional[dict] = None
    complaint_id: str
    citizen_id: str
    category: Category
    description: str
    location: Location
    address_text: Optional[str] = None
    status: Status = "New"
    priority_score: float = 0.0
    priority_label: str = "Low"
    assigned_to: Optional[str] = None
    is_duplicate: bool = False
    duplicate_group_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None


class StatusUpdate(BaseModel):
    status: Status


class CommentCreate(BaseModel):
    text: str


class AssignUpdate(BaseModel):
    """Ported from ResolveAI's admin reassign-complaint flow, simplified to a
    free-text assignee (department name or officer name) since this scaffold
    doesn't have department/officer accounts. assigned_to is optional: omit
    it (or send {}) to fall back to the rule-based category->department
    auto-assign in routers/complaints.py."""

    assigned_to: Optional[str] = None


class HistoryEntry(BaseModel):
    """One audit-trail entry. Ported from ResolveAI's `/complaints/{id}/track`
    `history` list."""

    event: Literal["created", "status_changed", "assigned", "comment_added"]
    detail: str
    at: datetime


class ComplaintTrack(BaseModel):
    """Response for GET /complaints/{id}/track -- full audit trail, ported from
    ResolveAI's track_complaint service."""

    id: str
    complaint_id: str
    status: Status
    priority_score: float
    priority_label: str
    assigned_to: Optional[str] = None
    is_duplicate: bool = False
    duplicate_group_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    history: list[HistoryEntry] = []
