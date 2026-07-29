import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel, EmailStr, Field
from models import RoleEnum


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=8)
    roll_no: str | None = None
    role: RoleEnum | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr
    roll_no: str | None = None
    role: RoleEnum | None = None

    class Config:
        from_attributes = True  # allows Pydantic to read directly from the SQLAlchemy object


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class SemesterOut(BaseModel):
    id: uuid.UUID
    number: int
    name: str

    class Config:
        from_attributes = True


class SemesterSelect(BaseModel):
    semester_id: uuid.UUID


class MessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    meta: Any | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    content: str


class ConversationCreate(BaseModel):
    title: str | None = "New Conversation"
    semester_id: uuid.UUID | None = None


class ConversationUpdate(BaseModel):
    title: str


class ConversationOut(BaseModel):
    id: uuid.UUID
    title: str
    semester_id: uuid.UUID | None = None
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationDetail(ConversationOut):
    messages: list[MessageOut] = []