import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from models import RoleEnum

class UserCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    roll_no: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr
    roll_no: Optional[str] = None
    role: RoleEnum
    selected_semester_id: Optional[int] = None
    is_active: bool
    class Config: from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ForgotPasswordRequest(BaseModel): email: EmailStr
class VerifyOTPRequest(BaseModel): email: EmailStr; otp: str = Field(min_length=6, max_length=6)
class ResetPasswordRequest(BaseModel): reset_token: str; password: str = Field(min_length=8, max_length=128)
class SelectSemesterRequest(BaseModel): semester_id: int = Field(ge=1, le=8)
class ConversationCreate(BaseModel): title: Optional[str] = Field(default=None, max_length=250)
class ConversationUpdate(BaseModel): title: str = Field(min_length=1, max_length=250)
class MessageCreate(BaseModel): content: str = Field(min_length=1, max_length=10000)
class SubjectCreate(BaseModel): semester_id: int = Field(ge=1, le=8); name: str = Field(min_length=1, max_length=160); code: Optional[str] = None; description: Optional[str] = None
class SubjectUpdate(BaseModel): name: Optional[str] = Field(default=None, min_length=1, max_length=160); code: Optional[str] = None; description: Optional[str] = None
class UserUpdate(BaseModel): full_name: Optional[str] = None; roll_no: Optional[str] = None; role: Optional[RoleEnum] = None; is_active: Optional[bool] = None
class PracticeRequest(BaseModel): topic: str = Field(min_length=1, max_length=200); subject_id: Optional[int] = None; count: int = Field(default=5, ge=1, le=20)
class ExamPatternRequest(BaseModel): topic: str = Field(min_length=1, max_length=200); subject_id: Optional[int] = None
