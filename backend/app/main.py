import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.database import get_db
from app.core.config import settings
from app.routers import analytics, auth, complaints, departments, upload, ai_router
from app.routers.departments import seed_default_departments


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.local_storage_dir, exist_ok=True)
    db = get_db()
    await db.complaints.create_index([("location", "2dsphere")])
    await db.complaints.create_index([("category", 1), ("status", 1), ("created_at", 1)])
    await db.complaints.create_index("assigned_to")
    await db.complaints.create_index("citizen_id")
    await db.complaints.create_index("duplicate_group_id")
    await db.complaints.create_index("created_at")
    await db.users.create_index("email", unique=True)
    await db.departments.create_index("category", unique=True)
    await seed_default_departments(db)
    yield


app = FastAPI(title="Smart Civic Complaint & Issue Management System", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.local_storage_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.local_storage_dir), name="uploads")

app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(analytics.router)
app.include_router(departments.router)
app.include_router(upload.router)
app.include_router(ai_router.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
