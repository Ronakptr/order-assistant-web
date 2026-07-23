from datetime import datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.schemas.user_management import (
    ManagedUserCreate,
    ManagedUserPasswordUpdate,
    ManagedUserUpdate,
)


ROLE_LABELS = {
    "admin": "مدیر",
    "sales_manager": "سرپرست فروش",
    "sales": "فروش",
    "seller": "فروشنده",
    "accountant": "حسابدار",
    "user": "کاربر",
}


ROLE_ALIASES = {
    "مدیر": "admin",
    "ادمین": "admin",
    "admin": "admin",

    "سرپرست فروش": "sales_manager",
    "sales_manager": "sales_manager",

    "فروش": "sales",
    "فروشنده": "sales",
    "sales": "sales",
    "seller": "sales",

    "حسابدار": "accountant",
    "accountant": "accountant",

    "کاربر": "user",
    "user": "user",
}


def normalize_username(username: str) -> str:
    return (username or "").strip().lower()


def normalize_email(email: str | None) -> str | None:
    normalized_email = (email or "").strip().lower()
    return normalized_email or None


def normalize_role(role: str | None) -> str:
    value = (role or "sales").strip()
    return ROLE_ALIASES.get(value, value or "sales")


def normalize_active_value(value) -> bool | None:
    if value is None:
        return None

    if isinstance(value, bool):
        return value

    text = str(value).strip().lower()

    if text in {"active", "true", "1", "yes", "on", "فعال"}:
        return True

    if text in {"inactive", "false", "0", "no", "off", "غیرفعال", "غيرفعال"}:
        return False

    return None


def get_payload_active_value(data) -> bool | None:
    for field_name in ["is_active", "active", "isActive", "status"]:
        if hasattr(data, field_name):
            value = getattr(data, field_name)
            parsed = normalize_active_value(value)
            if parsed is not None:
                return parsed

    return None


def get_company_id(current_user: User) -> int:
    return int(current_user.company_id or current_user.id)


def list_users(db: Session, company_id: int) -> list[User]:
    return (
        db.query(User)
        .filter(
            or_(
                User.company_id == company_id,
                User.id == company_id,
            )
        )
        .order_by(User.id.asc())
        .all()
    )


def get_user(db: Session, user_id: int, company_id: int) -> User | None:
    return (
        db.query(User)
        .filter(
            User.id == user_id,
            or_(
                User.company_id == company_id,
                User.id == company_id,
            ),
        )
        .first()
    )


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


def _get_attr(obj, name: str, default=None):
    return getattr(obj, name, default)


def create_managed_user(
    db: Session,
    user_data: ManagedUserCreate,
    company_id: int,
) -> User:
    full_name = _get_attr(user_data, "full_name", None) or _get_attr(user_data, "name", None)
    email = normalize_email(_get_attr(user_data, "email", None))
    role = normalize_role(_get_attr(user_data, "role", None))

    active_value = get_payload_active_value(user_data)
    if active_value is None:
        active_value = True

    user = User(
        company_id=company_id,
        username=normalize_username(user_data.username),
        full_name=full_name,
        email=email,
        role=role,
        hashed_password=hash_password(user_data.password),
        is_active=active_value,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def update_managed_user(
    db: Session,
    user: User,
    user_data: ManagedUserUpdate,
) -> User:
    update_data = user_data.model_dump(exclude_unset=True)

    if update_data.get("username"):
        user.username = normalize_username(update_data["username"])

    if "full_name" in update_data:
        user.full_name = update_data["full_name"]

    if update_data.get("name"):
        user.full_name = update_data["name"]

    if "email" in update_data:
        user.email = normalize_email(update_data["email"])

    if update_data.get("role"):
        user.role = normalize_role(update_data["role"])

    active_value = get_payload_active_value(user_data)
    if active_value is not None:
        user.is_active = active_value

    user.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(user)

    return user


def update_user_password(
    db: Session,
    user: User,
    password_data: ManagedUserPasswordUpdate | str,
) -> User:
    password = password_data if isinstance(password_data, str) else password_data.password

    user.hashed_password = hash_password(password)
    user.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(user)

    return user


def delete_managed_user(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()


def user_to_ui(user: User, current_user_id: int | None = None) -> dict:
    role = normalize_role(user.role)
    is_active = bool(user.is_active)

    return {
        "id": user.id,
        "uid": user.id,
        "company_id": user.company_id,
        "username": user.username,
        "full_name": user.full_name or "",
        "name": user.full_name or user.username,
        "email": user.email or "",
        "role": role,
        "role_label": ROLE_LABELS.get(role, role),

        "is_active": is_active,
        "active": is_active,
        "isActive": is_active,

        "status": "active" if is_active else "inactive",

        "status_label": "فعال" if is_active else "غیرفعال",

        "isCurrentUser": current_user_id == user.id,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }