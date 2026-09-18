"""Departments. Ported from ResolveAI's `public_routes.py` (public GET
/departments, used to populate a submission-form dropdown) and its admin
department CRUD in `admin_routes.py` / `admin_services.py`.

New here (not in either scaffold): each department maps to one complaint
`category`, and `complaints.assign_complaint` uses that mapping to
auto-suggest a department when the admin doesn't name one -- a rule-based
stand-in for the "extract category" bonus-AI ask in the case study, without
overclaiming it's actually AI.
"""
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import get_db
from app.core.deps import require_role
from app.schemas.department import DepartmentCreate, DepartmentOut, DepartmentUpdate

router = APIRouter(prefix="/departments", tags=["departments"])

# Seeded on startup (see app/main.py) so category -> department routing works
# out of the box; admins can rename/describe them or add more via this router.
DEFAULT_DEPARTMENTS = [
    {"name": "Roads & Public Works", "category": "pothole", "description": "Potholes, road surface damage"},
    {"name": "Sanitation Department", "category": "garbage", "description": "Garbage collection and disposal"},
    {"name": "Electrical Maintenance", "category": "streetlight", "description": "Streetlights and public lighting"},
    {"name": "Water Board", "category": "water_supply", "description": "Water supply and distribution issues"},
    {"name": "General Services", "category": "other", "description": "Everything else"},
]


def _to_out(doc: dict) -> DepartmentOut:
    return DepartmentOut(
        id=str(doc["_id"]),
        name=doc["name"],
        category=doc["category"],
        description=doc.get("description"),
    )


@router.get("", response_model=list[DepartmentOut])
async def list_departments():
    """Public -- ported from ResolveAI's `GET /departments`. Used to populate
    the citizen submission form and the admin assignment dropdown."""
    db = get_db()
    docs = await db.departments.find().sort("name", 1).to_list(50)
    return [_to_out(d) for d in docs]


@router.post("", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
async def create_department(
    payload: DepartmentCreate, _admin: dict = Depends(require_role("admin"))
):
    db = get_db()
    # Check if department with exact same name already exists
    if await db.departments.find_one({"name": {"$regex": f"^{payload.name.strip()}$", "$options": "i"}}):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"A department named '{payload.name}' already exists.",
        )
    doc = payload.model_dump()
    doc["name"] = doc["name"].strip()
    result = await db.departments.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _to_out(doc)


@router.patch("/{department_id}", response_model=DepartmentOut)
async def update_department(
    department_id: str,
    payload: DepartmentUpdate,
    _admin: dict = Depends(require_role("admin")),
):
    db = get_db()
    if not ObjectId.is_valid(department_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid department id")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "name" in updates:
        updates["name"] = updates["name"].strip()
    if updates:
        await db.departments.update_one({"_id": ObjectId(department_id)}, {"$set": updates})
    doc = await db.departments.find_one({"_id": ObjectId(department_id)})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Department not found")
    return _to_out(doc)


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    department_id: str,
    _admin: dict = Depends(require_role("admin")),
):
    db = get_db()
    if not ObjectId.is_valid(department_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid department id")
    res = await db.departments.delete_one({"_id": ObjectId(department_id)})
    if res.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Department not found")
    return None


async def seed_default_departments(db) -> None:
    """Idempotent upsert, called once at startup from app/main.py."""
    for dept in DEFAULT_DEPARTMENTS:
        await db.departments.update_one(
            {"category": dept["category"]}, {"$setOnInsert": dept}, upsert=True
        )


async def department_for_category(db, category: str) -> str | None:
    """Rule-based category -> department lookup, used by the auto-assign
    fallback in complaints.py."""
    dept = await db.departments.find_one({"category": category})
    return dept["name"] if dept else None
