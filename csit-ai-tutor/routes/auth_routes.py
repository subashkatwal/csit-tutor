import os
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user
from models import PasswordResetOTP, RevokedToken, RoleEnum, User
from schemas import ForgotPasswordRequest, ResetPasswordRequest, Token, UserCreate, UserLogin, UserOut, VerifyOTPRequest
from security import ALGORITHM, SECRET_KEY, create_access_token, create_reset_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])

def send_reset_email(recipient: str, otp: str) -> None:
    host = os.getenv("SMTP_HOST")
    if not host:
        # Intentionally does not expose the OTP in HTTP responses. Configure SMTP in production.
        print(f"[development] Password-reset OTP for {recipient}: {otp}")
        return
    message = EmailMessage()
    message["Subject"] = "CSIT Tutor password reset code"
    message["From"] = os.getenv("SMTP_FROM", "no-reply@csittutor.local")
    message["To"] = recipient
    message.set_content(f"Your CSIT Tutor password reset code is {otp}. It expires in 10 minutes.")
    with smtplib.SMTP(host, int(os.getenv("SMTP_PORT", "587"))) as server:
        if os.getenv("SMTP_TLS", "true").lower() == "true": server.starttls()
        if os.getenv("SMTP_USERNAME"): server.login(os.environ["SMTP_USERNAME"], os.environ.get("SMTP_PASSWORD", ""))
        server.send_message(message)

@router.post("/signup", response_model=UserOut, status_code=201)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_in.email.lower()).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(full_name=user_in.full_name, email=user_in.email.lower(), hashed_password=hash_password(user_in.password), roll_no=user_in.roll_no, role=RoleEnum.student)
    db.add(user); db.commit(); db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email.lower()).first()
    if not user or not verify_password(credentials.password, user.hashed_password): raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active: raise HTTPException(status_code=403, detail="This account is suspended")
    return Token(access_token=create_access_token({"sub": str(user.id), "role": user.role.value}))

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)): return current_user

@router.post("/logout", status_code=204)
def logout(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    token = request.headers.get("Authorization", "").removeprefix("Bearer ")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        db.merge(RevokedToken(jti=payload["jti"], expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc).replace(tzinfo=None)))
        db.commit()
    except (JWTError, KeyError): raise HTTPException(status_code=401, detail="Could not validate credentials")

@router.post("/forgot-password", status_code=202)
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if user:
        otp = f"{secrets.randbelow(1_000_000):06d}"
        db.add(PasswordResetOTP(user_id=user.id, otp_hash=hash_password(otp), expires_at=datetime.utcnow() + timedelta(minutes=10)))
        db.commit()
        try: send_reset_email(user.email, otp)
        except Exception: raise HTTPException(status_code=503, detail="Could not send reset email")
    return {"message": "If that email is registered, a reset code has been sent."}

@router.post("/verify-otp")
def verify_otp(data: VerifyOTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user: raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    record = db.query(PasswordResetOTP).filter(PasswordResetOTP.user_id == user.id, PasswordResetOTP.used_at.is_(None), PasswordResetOTP.expires_at > datetime.utcnow()).order_by(PasswordResetOTP.expires_at.desc()).first()
    if not record or record.attempts >= 5 or not verify_password(data.otp, record.otp_hash):
        if record: record.attempts += 1; db.commit()
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    record.used_at = datetime.utcnow(); db.commit()
    return {"reset_token": create_reset_token(str(user.id)), "token_type": "bearer"}

@router.post("/reset-password", status_code=204)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(data.reset_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "password_reset" or db.get(RevokedToken, payload.get("jti")): raise JWTError()
        user = db.get(User, UUID(payload["sub"]))
    except (JWTError, ValueError, KeyError): raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if not user: raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    user.hashed_password = hash_password(data.password)
    db.add(RevokedToken(jti=payload["jti"], expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc).replace(tzinfo=None)))
    db.commit()
