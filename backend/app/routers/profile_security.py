from __future__ import annotations

import inspect
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

try:
    from app.core.deps import get_current_user
except Exception:  # pragma: no cover - compatibility with older project layout
    from app.permissions.deps import get_current_user

try:
    from app.database import get_db
except Exception:  # pragma: no cover - compatibility with older project layout
    from app.database.session import get_db

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User


router = APIRouter(prefix="/security", tags=["Security"])


class UsernameUpdateIn(BaseModel):
    username: str = Field(min_length=3, max_length=80)


class PasswordUpdateIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)


def _normalize_username(username: str) -> str:
    return StringCleaner.clean(username).lower()


class StringCleaner:
    @staticmethod
    def clean(value: Any) -> str:
        return str(value or "").strip()


def _get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()


def _user_payload(user: User) -> dict[str, Any]:
    payload = {
        "id": getattr(user, "id", None),
        "user_id": getattr(user, "id", None),
        "username": getattr(user, "username", "") or "",
        "full_name": getattr(user, "full_name", None),
        "name": getattr(user, "full_name", None) or getattr(user, "username", "") or "",
        "role": getattr(user, "role", "user") or "user",
        "is_active": bool(getattr(user, "is_active", True)),
        "active": bool(getattr(user, "is_active", True)),
    }

    optional_fields = [
        "email",
        "phone",
        "company_id",
        "companyId",
        "company_name",
        "companyName",
    ]

    for field in optional_fields:
        if hasattr(user, field):
            payload[field] = getattr(user, field)

    return payload


def _make_access_token(user: User) -> str:
    payload = {
        "sub": user.username,
        "user_id": user.id,
        "role": user.role,
    }

    try:
        parameters = inspect.signature(create_access_token).parameters
        if len(parameters) <= 1:
            return create_access_token(payload)
    except Exception:
        pass

    return create_access_token(user.username, {"user_id": user.id, "role": user.role})


@router.get("/profile")
def get_security_profile(current_user: User = Depends(get_current_user)):
    return {"user": _user_payload(current_user)}


@router.patch("/profile/username")
def update_current_username(
    data: UsernameUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_username = _normalize_username(data.username)

    if len(new_username) < 3:
        raise HTTPException(status_code=400, detail="نام کاربری باید حداقل ۳ کاراکتر باشد")

    if new_username == current_user.username:
        token = _make_access_token(current_user)
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": _user_payload(current_user),
        }

    existing_user = _get_user_by_username(db, new_username)
    if existing_user and existing_user.id != current_user.id:
        raise HTTPException(status_code=400, detail="این نام کاربری قبلاً ثبت شده است")

    current_user.username = new_username

    if hasattr(current_user, "updated_at"):
        from datetime import datetime

        current_user.updated_at = datetime.utcnow()

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    token = _make_access_token(current_user)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _user_payload(current_user),
    }


@router.patch("/profile/password")
def update_current_password(
    data: PasswordUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="رمز عبور فعلی صحیح نیست",
        )

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="رمز عبور جدید باید حداقل ۶ کاراکتر باشد")

    current_user.hashed_password = hash_password(data.new_password)

    if hasattr(current_user, "updated_at"):
        from datetime import datetime

        current_user.updated_at = datetime.utcnow()

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return {"user": _user_payload(current_user), "message": "رمز عبور با موفقیت تغییر کرد"}
