from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin
from app.database import get_db
from app.models.user import User
from app.schemas.user_management import (
    ManagedUserCreate,
    ManagedUserPasswordUpdate,
    ManagedUserUpdate,
)
from app.services.user_management_service import (
    create_managed_user,
    delete_managed_user,
    get_company_id,
    get_user,
    get_user_by_email,
    get_user_by_username,
    list_users,
    update_managed_user,
    update_user_password,
    user_to_ui,
)


router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me")
def get_my_user(
    current_user: User = Depends(get_current_user),
):
    return user_to_ui(current_user, current_user_id=current_user.id)


@router.get("/")
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    company_id = get_company_id(current_user)

    users = list_users(db, company_id=company_id)
    users.sort(key=lambda user: 0 if user.id == current_user.id else 1)

    return [user_to_ui(user, current_user_id=current_user.id) for user in users]


@router.post("/", status_code=status.HTTP_201_CREATED)
def add_user(
    user_data: ManagedUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    company_id = get_company_id(current_user)

    username = user_data.username.strip().lower()
    email = user_data.email.strip().lower() if getattr(user_data, "email", None) else ""

    if get_user_by_username(db, username):
        raise HTTPException(status_code=400, detail="این نام کاربری قبلاً ثبت شده است")

    if email and get_user_by_email(db, email):
        raise HTTPException(status_code=400, detail="این ایمیل قبلاً ثبت شده است")

    user = create_managed_user(db, user_data, company_id=company_id)

    return user_to_ui(user, current_user_id=current_user.id)


@router.put("/{user_id}")
def edit_user(
    user_id: int,
    user_data: ManagedUserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    company_id = get_company_id(current_user)

    user = get_user(db, user_id, company_id=company_id)

    if not user:
        raise HTTPException(status_code=404, detail="کاربر پیدا نشد")

    if user_data.username and user_data.username.strip().lower() != user.username:
        existing_user = get_user_by_username(db, user_data.username.strip().lower())

        if existing_user:
            raise HTTPException(status_code=400, detail="این نام کاربری قبلاً ثبت شده است")

    if user_data.email and user_data.email.strip().lower() != (user.email or ""):
        existing_user = get_user_by_email(db, user_data.email.strip().lower())

        if existing_user:
            raise HTTPException(status_code=400, detail="این ایمیل قبلاً ثبت شده است")

    user = update_managed_user(db, user, user_data)

    return user_to_ui(user, current_user_id=current_user.id)


@router.put("/{user_id}/password")
def change_user_password(
    user_id: int,
    password_data: ManagedUserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    company_id = get_company_id(current_user)

    user = get_user(db, user_id, company_id=company_id)

    if not user:
        raise HTTPException(status_code=404, detail="کاربر پیدا نشد")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="امکان تغییر رمز از این مسیر وجود ندارد")

    if user.id == company_id:
        raise HTTPException(status_code=400, detail="امکان تغییر رمز مدیر اصلی شرکت وجود ندارد")

    user = update_user_password(db, user, password_data)

    return user_to_ui(user, current_user_id=current_user.id)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    company_id = get_company_id(current_user)

    user = get_user(db, user_id, company_id=company_id)

    if not user:
        raise HTTPException(status_code=404, detail="کاربر پیدا نشد")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="امکان حذف کاربر فعلی وجود ندارد")

    if user.id == company_id:
        raise HTTPException(status_code=400, detail="امکان حذف مدیر اصلی شرکت وجود ندارد")

    delete_managed_user(db, user)

    return None