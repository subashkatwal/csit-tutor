import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from models import RoleEnum


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=8)
    roll_no: Optional[str] = None
    role: Optional[RoleEnum] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr
    roll_no: Optional[str] = None
    role: Optional[RoleEnum] = None

    class Config:
        from_attributes = True  # allows Pydantic to read directly from the SQLAlchemy object


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"