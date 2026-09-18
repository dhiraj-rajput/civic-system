import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.database import get_db, close_db
from app.core.config import settings
from app.routers import analytics, auth, complaints, departments, upload, ai_router, notifications
from app.routers.departments import seed_default_departments


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.local_storage_dir, exist_ok=True)
    db = get_db()
    # Geospatial and compound indexes for fast 4-step duplicate clustering
    await db.complaints.create_index([("location", "2dsphere")])
    await db.complaints.create_index([("category", 1), ("location", "2dsphere"), ("created_at", -1)])
    await db.complaints.create_index([("category", 1), ("status", 1), ("created_at", 1)])
    await db.complaints.create_index([("status", 1), ("created_at", 1)])
    await db.complaints.create_index([("status", 1), ("priority_score", -1)])
    # Business keys and assignment filters
    await db.complaints.create_index("complaint_id", unique=True)
    await db.complaints.create_index([("assigned_officer_id", 1), ("status", 1)])
    await db.complaints.create_index("assigned_to")
    await db.complaints.create_index("citizen_id")
    await db.complaints.create_index("duplicate_group_id")
    await db.complaints.create_index("created_at")
    # User and Department constraints
    await db.users.create_index("email", unique=True)
    await db.users.create_index([("role", 1), ("department", 1)])
    # Ensure single admin invariant at database level
    try:
        await db.users.create_index(
            [("role", 1)],
            unique=True,
            partialFilterExpression={"role": "admin"}
        )
    except Exception:
        pass
    await db.departments.create_index("category", unique=True)
    await db.notifications.create_index([("user_id", 1), ("read", 1), ("created_at", -1)])
    await db.notifications.create_index([("role", 1), ("read", 1), ("created_at", -1)])
    await seed_default_departments(db)
    yield
    close_db()


app = FastAPI(title="Smart Civic Complaint & Issue Management System", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"  # Permissive for local testing while specifying origins
    ],
    allow_credentials=True,
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
app.include_router(notifications.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
