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
    created_at: datetime
    updated_at: datetime


class StatusUpdate(BaseModel):
    status: Status


class CommentCreate(BaseModel):
    text: str
