"""Owner: auth track (see TASKS.md). No dependency on other routers."""
from fastapi import APIRouter, HTTPException, status

from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.schemas.user import Token, UserCreate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token)
async def register(payload: UserCreate):
    db = get_db()
    if await db.users.find_one({"email": payload.email}):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")
    user = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "role": payload.role,
    }
    result = await db.users.insert_one(user)
    token = create_access_token({"sub": str(result.inserted_id), "role": payload.role})
    return Token(access_token=token)


@router.post("/login", response_model=Token)
async def login(email: str, password: str):
    db = get_db()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    token = create_access_token({"sub": str(user["_id"]), "role": user["role"]})
    return Token(access_token=token)
