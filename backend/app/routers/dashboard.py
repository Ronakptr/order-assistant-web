from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.services.dashboard_service import get_dashboard_summary


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def dashboard_summary(
    period: str = Query("weekly", pattern="^(weekly|monthly|yearly)$"),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    return get_dashboard_summary(db=db, current_user=current_user, period=period)