"""Auth dependencies. Ported from ResolveAI's `auth_dependencies.py`
(bearer-token extraction) and the role checks scattered through its
`services/*_services.py` (`require_admin`, `authenticate_access_token`) --
consolidated here into standard FastAPI `Depends()` injectables so every
route declares its own auth requirement instead of hand-decoding a token.

This is the "auth track" / "rbac-hardening" work called out in TASKS.md
Wave 1 and Wave 2.
"""
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import get_db
from app.core.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    """Decode the bearer token and load the corresponding user document.
    Raises 401 if there's no token, the token is invalid/expired, or the
    user it names no longer exists."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    user_id = payload["sub"]
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token subject")

    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")

    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "department": user.get("department"),
    }


def require_role(*allowed_roles: str):
    """Dependency factory: `Depends(require_role("admin"))`,
    `Depends(require_role("admin", "officer"))`, etc. Ported from
    ResolveAI's per-service `require_admin` / role checks, generalized."""

    async def _checker(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"This action requires one of these roles: {', '.join(allowed_roles)}",
            )
        return user

    return _checker
