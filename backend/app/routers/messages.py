from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.message import MessageCreate, MessageOut, MessageUpdate
from app.services.message_service import (
    create_message,
    delete_message,
    get_message,
    list_messages,
    message_to_ui,
    update_message,
)


router = APIRouter(prefix="/messages", tags=["Messages"])


def get_current_company_id(current_user: User) -> int:
    return int(current_user.company_id or current_user.id)


@router.get("/", response_model=list[MessageOut])
def get_messages(
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_id = get_current_company_id(current_user)

    return [
        message_to_ui(message)
        for message in list_messages(db, owner_id=company_id, search=search)
    ]


@router.post("/", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def add_message(
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_id = get_current_company_id(current_user)
    message = create_message(db, message_data, owner_id=company_id)

    return message_to_ui(message)


@router.put("/{message_id}", response_model=MessageOut)
def edit_message(
    message_id: int,
    message_data: MessageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_id = get_current_company_id(current_user)

    message = get_message(db, message_id, owner_id=company_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    message = update_message(db, message, message_data)

    return message_to_ui(message)


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_id = get_current_company_id(current_user)

    message = get_message(db, message_id, owner_id=company_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    delete_message(db, message)
    return None