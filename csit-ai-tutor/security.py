import os
import uuid
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt
from dotenv import load_dotenv

load_dotenv()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-only-fallback-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

def hash_password(password: str) -> str: return pwd_context.hash(password)
def verify_password(plain_password: str, hashed_password: str) -> bool: return pwd_context.verify(plain_password, hashed_password)
def create_access_token(data: dict, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    payload = data.copy()
    payload.update({"exp": datetime.now(timezone.utc) + timedelta(minutes=expires_minutes), "jti": str(uuid.uuid4()), "type": "access"})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
def create_reset_token(user_id: str) -> str:
    return jwt.encode({"sub": user_id, "type": "password_reset", "jti": str(uuid.uuid4()), "exp": datetime.now(timezone.utc) + timedelta(minutes=15)}, SECRET_KEY, algorithm=ALGORITHM)
