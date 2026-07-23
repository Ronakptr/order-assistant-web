from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models.user import User
from app.services.auth_service import get_user_by_id, get_user_by_username


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


ADMIN_ROLES = {
    "admin",
    "administrator",
    "owner",
    "manager",
    "مدیر",
    "مدير",
    "ادمین",
    "ادمين",
}


def normalize_role(role: str | None) -> str:
    return str(role or "").strip().lower()


def get_jwt_algorithm() -> str:
    return (
        getattr(settings, "ALGORITHM", None)
        or getattr(settings, "JWT_ALGORITHM", None)
        or getattr(settings, "TOKEN_ALGORITHM", None)
        or "HS256"
    )


def get_secret_key() -> str:
    secret_key = (
        getattr(settings, "SECRET_KEY", None)
        or getattr(settings, "JWT_SECRET_KEY", None)
        or getattr(settings, "APP_SECRET_KEY", None)
    )

    if not secret_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SECRET_KEY is not configured",
        )

    return secret_key


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="امکان اعتبارسنجی کاربر وجود ندارد",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            get_secret_key(),
            algorithms=[get_jwt_algorithm()],
        )

        user_id = payload.get("user_id")
        username = payload.get("sub")

        if user_id is None and username is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = None

    if user_id is not None:
        try:
            user = get_user_by_id(db, int(user_id))
        except Exception:
            user = None

    if user is None and username:
        user = get_user_by_username(db, username)

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="کاربر غیرفعال است",
        )

    if getattr(user, "company_id", None) is None:
        user.company_id = user.id
        db.commit()
        db.refresh(user)

    return user


def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    role = normalize_role(current_user.role)

    if role not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Admin access required. current role: {current_user.role}",
        )

    return current_user