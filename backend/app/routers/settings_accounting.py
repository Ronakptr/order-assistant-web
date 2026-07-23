from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.database import get_db
from app.services.company_settings_service import (
    ACCOUNTING_SETTING_KEY,
    get_company_setting,
    normalize_accounting_settings,
    save_company_setting,
)

router = APIRouter(prefix="/settings/accounting", tags=["Settings - Accounting"])


@router.get("")
def get_accounting_settings(
    db: Session = Depends(get_db),
    current_user: Any = Depends(require_admin),
):
    return normalize_accounting_settings(
        get_company_setting(db, current_user, ACCOUNTING_SETTING_KEY)
    )


@router.put("")
def update_accounting_settings(
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    current_user: Any = Depends(require_admin),
):
    normalized = normalize_accounting_settings(payload or {})
    return save_company_setting(db, current_user, ACCOUNTING_SETTING_KEY, normalized)
