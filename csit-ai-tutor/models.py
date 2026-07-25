import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.types import Uuid

from database import Base


class RoleEnum(str, enum.Enum):
    student = "student"
    teacher = "teacher"
    admin = "admin"


class User(Base):
    __tablename__ = "users"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    roll_no = Column(String(80), nullable=True)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.student)
    selected_semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class Semester(Base):
    __tablename__ = "semesters"
    id = Column(Integer, primary_key=True)
    name = Column(String(80), nullable=False)
    display_name = Column(String(80), nullable=False)


class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, autoincrement=True)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False, index=True)
    name = Column(String(160), nullable=False)
    code = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    semester = relationship("Semester")


class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(250), nullable=False, default="New conversation")
    is_archived = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = relationship("User")
    messages = relationship("Message", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base):
    __tablename__ = "messages"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(Uuid(as_uuid=True), ForeignKey("conversations.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user or assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)


class PasswordResetOTP(Base):
    __tablename__ = "password_reset_otps"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    otp_hash = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    attempts = Column(Integer, nullable=False, default=0)


class RevokedToken(Base):
    __tablename__ = "revoked_tokens"
    jti = Column(String(64), primary_key=True)
    expires_at = Column(DateTime, nullable=False)


class IngestionJob(Base):
    __tablename__ = "ingestion_jobs"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)
    status = Column(String(20), nullable=False, default="queued")
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
