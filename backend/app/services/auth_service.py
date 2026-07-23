from datetime import datetime

from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserCreate


def normalize_username(username: str) -> str:
    return (username or "").strip().lower()


def normalize_email(email: str | None) -> str | None:
    normalized_email = (email or "").strip().lower()
    return normalized_email or None


def get_user_by_username(db: Session, username: str) -> User | None:
    normalized_username = normalize_username(username)

    if not normalized_username:
        return None

    return db.query(User).filter(User.username == normalized_username).first()


def get_user_by_email(db: Session, email: str | None) -> User | None:
    normalized_email = normalize_email(email)

    if not normalized_email:
        return None

    return db.query(User).filter(User.email == normalized_email).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_user_company_id(user: User) -> int:
    return user.company_id or user.id


def create_user(db: Session, user_data: UserCreate) -> User:
    # ثبت‌نام عمومی یعنی ساخت مدیر یک شرکت جدید
    user = User(
        username=normalize_username(user_data.username),
        full_name=user_data.full_name,
        email=normalize_email(user_data.email),
        role="admin",
        hashed_password=hash_password(user_data.password),
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # شرکت جدید با شناسه خود مدیر ساخته می‌شود
    user.company_id = user.id
    user.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(user)

    return user


def is_password_valid(password: str, hashed_password: str) -> bool:
    if not password or not hashed_password:
        return False

    try:
        return verify_password(password, hashed_password)
    except Exception:
        return False


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = get_user_by_username(db, username)

    if not user:
        return None

    if not is_password_valid(password=password, hashed_password=user.hashed_password):
        return None

    return user