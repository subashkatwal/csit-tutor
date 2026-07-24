from fastapi import APIRouter , Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User 
from schemas import UserCreate, UserLogin, UserOut, Token  
from security import hash_password, verify_password,create_access_token
from deps import get_current_user
router = APIRouter(prefix="/auth", tags=['Auth'])

@router.post("/signup", response_model= UserOut)
def signup(user_in: UserCreate, db:Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException (status_code = 400, detail = "Email already registered")
    
    user = User (
        full_name = user_in.full_name,
        email  = user_in.email,
        hashed_password = hash_password(user_in.password),
        roll_no = user_in.roll_no,
        role = user_in.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model= Token)
def login(credentials:UserLogin, db:Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({
        "sub":str(user.id),
        "role": user.role.value if user.role else None,
    })
    return Token(access_token=token)

 
@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
 