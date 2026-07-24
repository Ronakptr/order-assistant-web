from datetime import datetime, timedelta
import hashlib
import hmac
import random

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.database import get_db
from app.models.otp_challenge import OtpChallenge
from app.models.user import User
from app.schemas.user import (
    LoginOtpStartOut,
    LoginOtpVerifyIn,
    TokenOut,
    UserCreate,
    UserLogin,
    UserOut,
)
from app.services.auth_service import (
    authenticate_user,
    create_user,
    get_user_by_email,
    get_user_by_username,
)


router = APIRouter(prefix="/auth", tags=["Authentication"])

OTP_EXPIRE_SECONDS = 180
OTP_MAX_ATTEMPTS = 5


def _hash_otp_code(code: str) -> str:
    key = settings.SECRET_KEY.encode("utf-8")
    message = str(code).strip().encode("utf-8")
    return hmac.new(key, message, hashlib.sha256).hexdigest()


def _verify_otp_code(code: str, code_hash: str) -> bool:
    return hmac.compare_digest(_hash_otp_code(code), code_hash)


def _build_token_response(user: User) -> dict:
    company_id = user.company_id or user.id

    token = create_access_token(
        {
            "sub": user.username,
            "user_id": user.id,
            "company_id": company_id,
            "role": user.role,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }


def _create_otp_challenge(db: Session, user: User) -> tuple[OtpChallenge, str]:
    now = datetime.utcnow()
    code = f"{random.SystemRandom().randint(0, 999999):06d}"

    db.query(OtpChallenge).filter(
        OtpChallenge.user_id == user.id,
        OtpChallenge.purpose == "login",
        OtpChallenge.is_used == False,  # noqa: E712
    ).update(
        {
            "is_used": True,
            "used_at": now,
        },
        synchronize_session=False,
    )

    challenge = OtpChallenge(
        user_id=user.id,
        purpose="login",
        code_hash=_hash_otp_code(code),
        attempts=0,
        is_used=False,
        created_at=now,
        expires_at=now + timedelta(seconds=OTP_EXPIRE_SECONDS),
    )

    db.add(challenge)
    db.commit()
    db.refresh(challenge)

    return challenge, code


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = get_user_by_username(db, user_data.username)

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="این نام کاربری قبلاً ثبت شده است",
        )

    if user_data.email and get_user_by_email(db, user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="این ایمیل قبلاً ثبت شده است",
        )

    return create_user(db, user_data)


@router.post("/login", response_model=TokenOut)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(
        db=db,
        username=login_data.username,
        password=login_data.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="نام کاربری یا رمز عبور اشتباه است",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="کاربر مورد نظر غیرفعال است. با پشتیبانی تماس بگیرید",
        )

    return _build_token_response(user)


@router.post("/login/start", response_model=LoginOtpStartOut)
def start_login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(
        db=db,
        username=login_data.username,
        password=login_data.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="نام کاربری یا رمز عبور اشتباه است",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="کاربر مورد نظر غیرفعال است. با پشتیبانی تماس بگیرید",
        )

    challenge, code = _create_otp_challenge(db, user)

    return {
        "challenge_id": challenge.id,
        "expires_in_seconds": OTP_EXPIRE_SECONDS,
        # تا زمان اتصال سرویس پیامک/ایمیل، کد برای تست در فرانت نمایش داده می‌شود.
        "debug_otp": code,
    }


@router.post("/login/verify-otp", response_model=TokenOut)
def verify_login_otp(payload: LoginOtpVerifyIn, db: Session = Depends(get_db)):
    now = datetime.utcnow()

    challenge = (
        db.query(OtpChallenge)
        .filter(
            OtpChallenge.id == payload.challenge_id,
            OtpChallenge.purpose == "login",
        )
        .first()
    )

    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="کد تایید معتبر نیست",
        )

    if challenge.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="این کد قبلاً استفاده شده است",
        )

    if challenge.expires_at < now:
        challenge.is_used = True
        challenge.used_at = now
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="کد تایید منقضی شده است",
        )

    if challenge.attempts >= OTP_MAX_ATTEMPTS:
        challenge.is_used = True
        challenge.used_at = now
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="تعداد تلاش‌ها بیش از حد مجاز است",
        )

    user = db.query(User).filter(User.id == challenge.user_id).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="کاربر مورد نظر فعال نیست",
        )

    if not _verify_otp_code(payload.otp_code, challenge.code_hash):
        challenge.attempts += 1
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="کد تایید اشتباه است",
        )

    challenge.is_used = True
    challenge.used_at = now
    db.commit()

    return _build_token_response(user)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
