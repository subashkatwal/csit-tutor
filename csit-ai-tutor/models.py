import enum 
import uuid
from sqlalchemy import Column, Integer, String, Enum, Boolean, Text, ForeignKey, DateTime, func
from database import Base 
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
class RoleEnum(str, enum.Enum):
    student = "student"
    teacher = "teacher"
    admin = "admin"
    
class User(Base):
    __tablename__ = "users"
    
    id = Column(
        UUID(as_uuid=True),
        primary_key= True,
        default=uuid.uuid4,
        index = True,
        )
    full_name = Column(String, nullable=False)
    email = Column(String,nullable= False)
    hashed_password = (Column(String,nullable=False))
    roll_no = (Column(String,nullable= True))
    role = Column(Enum(RoleEnum),nullable=True)
    current_semester_id = Column(
        UUID(as_uuid=True),
        ForeignKey("semesters.id"),
        nullable=True,
    )

    current_semester = relationship("Semester")
    
class Semester(Base):
    __tablename__ = "semesters"
    id = Column(
        UUID(as_uuid= True),
        primary_key=True,
        default=uuid.uuid4,  
        index =True
    )
    number = Column(Integer, unique = True, nullable = False)
    name = Column(String,nullable= False)



class ConversationRoleEnum(str, enum.Enum):
    user = "user"
    assistant = "assistant"
 
 
class Conversation(Base):
    __tablename__ = "conversations"
 
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    semester_id = Column(UUID(as_uuid=True), ForeignKey("semesters.id"), nullable=True)
 
    title = Column(String, nullable=False, default="New Conversation")
    is_archived = Column(Boolean, nullable=False, default=False)
 
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
 
    user = relationship("User")
    semester = relationship("Semester")
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )
 
 
class Message(Base):
    __tablename__ = "messages"
 
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False, index=True)
 
    role = Column(Enum(ConversationRoleEnum), nullable=False)
    content = Column(Text, nullable=False)
 
    # stores detection / exam / practice payloads from the solver pipeline, or None for plain chat
    meta = Column(Text, nullable=True)  # store as JSON string (see note below); switch to JSONB on Postgres if you prefer
 
    created_at = Column(DateTime(timezone=True), server_default=func.now())
 
    conversation = relationship("Conversation", back_populates="messages")