import enum 
import uuid
from sqlalchemy import Column,Integer, String , Enum
from database import Base 
from sqlalchemy.dialects.postgresql import UUID
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