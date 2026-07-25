from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from uuid import UUID
from database import get_db
from models import RevokedToken, RoleEnum, User
from security import ALGORITHM, SECRET_KEY

oauth2_schema = OAuth2PasswordBearer(tokenUrl="/auth/login")
def get_current_user(token: str = Depends(oauth2_schema), db: Session = Depends(get_db)) -> User:
    error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access" or not payload.get("sub") or db.get(RevokedToken, payload.get("jti")):
            raise error
        user = db.get(User, UUID(payload["sub"]))
    except (JWTError, ValueError): raise error
    if not user or not user.is_active: raise error
    return user
def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != RoleEnum.admin: raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
