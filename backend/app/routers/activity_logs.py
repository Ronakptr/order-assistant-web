from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.activity_log_service import (
    create_activity_log,
    list_company_activity_logs,
    list_company_activity_logs_by_user,
)
from app.services.company_scope import get_company_scope_id, is_admin_user


router = APIRouter(prefix="/activity-logs", tags=["Activity Logs"])


def require_company_admin(current_user: User = Depends(get_current_user)) -> User:
    if not is_admin_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="فقط مدیر شرکت به گزارش فعالیت کاربران دسترسی دارد",
        )

    return current_user


@router.get("/")
def get_activity_logs(
    limit: int = Query(300, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company_admin),
):
    company_id = get_company_scope_id(current_user)

    return list_company_activity_logs(
        db,
        company_id=company_id,
        limit=limit,
    )


@router.get("/user/{user_id}")
def get_activity_logs_by_user(
    user_id: int,
    limit: int = Query(300, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company_admin),
):
    company_id = get_company_scope_id(current_user)

    return list_company_activity_logs_by_user(
        db,
        company_id=company_id,
        user_id=user_id,
        limit=limit,
    )


@router.post("/logout")
def logout_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    create_activity_log(
        db,
        current_user=current_user,
        method="POST",
        path="/activity-logs/logout",
        status_code=200,
        body={},
        action_type="logout",
        entity_type="auth",
        title="خروج کاربر",
        description="کاربر از حساب خارج شد",
    )

    db.commit()

    return {"ok": True}