from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.database import get_db
from app.models.user import User
from app.schemas.user import TokenOut, UserCreate, UserLogin, UserOut
from app.services.auth_service import (
    authenticate_user,
    create_user,
    get_user_by_email,
    get_user_by_username,
)


router = APIRouter(prefix="/auth", tags=["Authentication"])


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


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user