from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, model_validator

Role = Literal["citizen", "officer", "admin"]
# Public /auth/register may only create these two -- "admin" is deliberately
# excluded here (the original scaffold let anyone self-register as admin).
# Ported from ResolveAI's `create_admin`, which only ever allows exactly one
# admin account to exist and blocks the endpoint once it does; see
# /auth/bootstrap-admin in routers/auth.py.
RegisterRole = Literal["citizen", "officer"]


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: RegisterRole = "citizen"
    # Required when role == "officer" -- ported from ResolveAI's department
    # officer accounts, simplified into this project's single-role user
    # model instead of a separate officer collection/login flow.
    department: Optional[str] = None

    @model_validator(mode="after")
    def _officer_requires_department(self):
        if self.role == "officer" and not self.department:
            raise ValueError("department is required when role is 'officer'")
        if self.role != "officer" and self.department:
            raise ValueError("department may only be set for role 'officer'")
        return self


class AdminBootstrap(BaseModel):
    """Creates the one and only admin account. Only works while no admin
    exists yet -- ported from ResolveAI's `create_admin` single-admin
    invariant."""

    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: Role
    department: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
