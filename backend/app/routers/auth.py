"""Owner: auth track (see TASKS.md).

get_current_user / require_role now live in app/core/deps.py (ported from
ResolveAI's auth_dependencies.py + per-service role checks) -- routes across
the app depend on those instead of re-decoding tokens."""
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.schemas.user import AdminBootstrap, LoginRequest, Token, UserCreate, UserOut

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
        "department": payload.department,
    }
    result = await db.users.insert_one(user)
    token = create_access_token({"sub": str(result.inserted_id), "role": payload.role})
    return Token(access_token=token)


@router.post("/bootstrap-admin", response_model=Token)
async def bootstrap_admin(payload: AdminBootstrap):
    """Create the one admin account. Ported from ResolveAI's `create_admin`:
    once any admin exists, this endpoint permanently 403s -- there is no
    public route that mints additional admins."""
    db = get_db()
    if await db.users.find_one({"role": "admin"}):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "An admin account already exists")
    if await db.users.find_one({"email": payload.email}):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")
    user = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "role": "admin",
        "department": None,
    }
    result = await db.users.insert_one(user)
    token = create_access_token({"sub": str(result.inserted_id), "role": "admin"})
    return Token(access_token=token)


@router.post("/login", response_model=Token)
async def login(payload: LoginRequest):
    """Credentials go in the JSON body, never query params -- the original
    scaffold's `def login(email: str, password: str)` put them in the URL,
    which lands in server access logs and browser history."""
    db = get_db()
    user = await db.users.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    token = create_access_token({"sub": str(user["_id"]), "role": user["role"]})
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
async def me(current_user: dict = Depends(get_current_user)):
    """Whoami -- lets the frontend know the logged-in user's role/department
    without re-decoding the JWT client-side."""
    return UserOut(**current_user)
