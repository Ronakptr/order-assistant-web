from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin
from app.database import get_db
from app.services.message_settings_service import (
    get_message_settings,
    save_message_settings,
    test_message_channel,
)

router = APIRouter(prefix="/settings/messages", tags=["Settings - Messages"])


@router.get("")
def read_message_settings(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    return get_message_settings(db, current_user)


@router.put("")
def update_message_settings(
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    current_user: Any = Depends(require_admin),
):
    return save_message_settings(db, current_user, payload or {})


@router.post("/test-connection")
def test_connection(
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    current_user: Any = Depends(require_admin),
):
    channel = str((payload or {}).get("channel") or "").strip().lower()
    settings = (payload or {}).get("settings") or {}

    return test_message_channel(db, current_user, channel, settings)
