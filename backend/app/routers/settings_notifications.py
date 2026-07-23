from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin
from app.database import get_db
from app.services.company_settings_service import (
    NOTIFICATION_SETTING_KEY,
    get_company_setting,
    normalize_notification_settings,
    save_company_setting,
)

router = APIRouter(prefix="/settings/notifications", tags=["Settings - Notifications"])


@router.get("")
def get_notification_settings(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    return normalize_notification_settings(
        get_company_setting(db, current_user, NOTIFICATION_SETTING_KEY)
    )


@router.put("")
def update_notification_settings(
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    current_user: Any = Depends(require_admin),
):
    normalized = normalize_notification_settings(payload or {})
    return save_company_setting(db, current_user, NOTIFICATION_SETTING_KEY, normalized)
