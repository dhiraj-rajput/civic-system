from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field

Role = Literal["citizen", "officer", "admin"]
# Public /auth/register may only create citizens. Officers are provisioned
# by administrators via /auth/create-officer.
RegisterRole = Literal["citizen"]


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    role: RegisterRole = "citizen"
    department: Optional[str] = None


class OfficerCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    department: str = Field(..., min_length=2, max_length=100)


class AdminBootstrap(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=72)


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: Role
    department: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
