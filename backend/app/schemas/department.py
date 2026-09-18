from typing import Optional

from pydantic import BaseModel

from app.schemas.complaint import Category


class DepartmentOut(BaseModel):
    id: str
    name: str
    category: Category
    description: Optional[str] = None


class DepartmentCreate(BaseModel):
    name: str
    category: Category
    description: Optional[str] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[Category] = None
    description: Optional[str] = None
