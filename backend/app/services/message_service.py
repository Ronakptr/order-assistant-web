from datetime import datetime
import json

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.message import Message
from app.schemas.message import MessageCreate, MessageUpdate


def _safe_items(items_json: str | None) -> list[dict]:
    if not items_json:
        return []

    try:
        value = json.loads(items_json)
        return value if isinstance(value, list) else []
    except Exception:
        return []


def _format_date(value) -> str:
    if not value:
        return ""

    try:
        return value.strftime("%Y/%m/%d")
    except Exception:
        return str(value)


def _make_message_code(db: Session, owner_id: int) -> str:
    count = db.query(Message).filter(Message.owner_id == owner_id).count() + 1

    while True:
        code = f"MSG-{count:04d}"
        existing = (
            db.query(Message)
            .filter(Message.message_code == code, Message.owner_id == owner_id)
            .first()
        )

        if not existing:
            return code

        count += 1


def message_to_ui(message: Message) -> dict:
    return {
        "uid": message.id,
        "id": message.message_code,
        "orderCode": message.order_code or "",
        "invoiceCode": message.invoice_code or message.order_code or "",
        "customer": message.customer or "",
        "phone": message.phone or "",
        "email": message.email or "",
        "items": _safe_items(message.items_json),
        "status": message.status or "پیش نویس",
        "template": message.template or "صورتحساب",
        "channel": message.channel or "پیامک",
        "date": _format_date(message.updated_at or message.created_at),
        "preview": message.preview or "",
    }


def list_messages(db: Session, owner_id: int, search: str | None = None) -> list[Message]:
    query = (
        db.query(Message)
        .filter(Message.owner_id == owner_id)
        .order_by(Message.id.desc())
    )

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Message.message_code.ilike(pattern),
                Message.order_code.ilike(pattern),
                Message.customer.ilike(pattern),
                Message.status.ilike(pattern),
                Message.template.ilike(pattern),
                Message.channel.ilike(pattern),
            )
        )

    return query.all()


def get_message(db: Session, message_id: int, owner_id: int) -> Message | None:
    return (
        db.query(Message)
        .filter(Message.id == message_id, Message.owner_id == owner_id)
        .first()
    )


def create_message(db: Session, message_data: MessageCreate, owner_id: int) -> Message:
    now = datetime.utcnow()

    message = Message(
        owner_id=owner_id,
        message_code=message_data.message_code or _make_message_code(db, owner_id),
        order_code=message_data.order_code,
        invoice_code=message_data.invoice_code or message_data.order_code,
        customer=message_data.customer,
        phone=message_data.phone,
        email=message_data.email,
        items_json=json.dumps(message_data.items or [], ensure_ascii=False),
        status=message_data.status or "پیش نویس",
        template=message_data.template,
        channel=message_data.channel,
        preview=message_data.preview,
        created_at=now,
        updated_at=now,
    )

    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def update_message(db: Session, message: Message, message_data: MessageUpdate) -> Message:
    update_data = message_data.model_dump(exclude_unset=True)

    if "message_code" in update_data:
        message.message_code = update_data["message_code"] or message.message_code
    if "order_code" in update_data:
        message.order_code = update_data["order_code"]
    if "invoice_code" in update_data:
        message.invoice_code = update_data["invoice_code"]
    if "customer" in update_data:
        message.customer = update_data["customer"]
    if "phone" in update_data:
        message.phone = update_data["phone"]
    if "email" in update_data:
        message.email = update_data["email"]
    if "items" in update_data:
        message.items_json = json.dumps(update_data["items"] or [], ensure_ascii=False)
    if "status" in update_data:
        message.status = update_data["status"] or message.status
    if "template" in update_data:
        message.template = update_data["template"]
    if "channel" in update_data:
        message.channel = update_data["channel"]
    if "preview" in update_data:
        message.preview = update_data["preview"]

    message.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(message)
    return message


def delete_message(db: Session, message: Message) -> None:
    db.delete(message)
    db.commit()