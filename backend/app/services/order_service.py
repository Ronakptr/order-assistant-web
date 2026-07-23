from datetime import datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.models.order import Order, OrderItem
from app.schemas.order import OrderCreate, OrderUpdate


def _to_float(value) -> float:
    try:
        if value in (None, ""):
            return 0.0
        return float(str(value).replace(",", ""))
    except Exception:
        return 0.0


def _status(data) -> str:
    return data.status or data.orderStatus or data.statusLabel or "ثبت شده"


def _generate_order_code(db: Session, owner_id: int) -> str:
    last = (
        db.query(Order)
        .filter(Order.owner_id == owner_id)
        .order_by(Order.id.desc())
        .first()
    )
    next_number = (last.id if last else 0) + 1

    while True:
        code = f"ORD-{next_number:04d}"
        exists = (
            db.query(Order)
            .filter(Order.code == code, Order.owner_id == owner_id)
            .first()
        )
        if not exists:
            return code
        next_number += 1


def _ensure_unique_code(
    db: Session,
    requested_code: str | None,
    owner_id: int,
    current_order_id: int | None = None,
) -> str:
    if requested_code:
        existing = (
            db.query(Order)
            .filter(Order.code == requested_code, Order.owner_id == owner_id)
            .first()
        )
        if not existing or existing.id == current_order_id:
            return requested_code

    return _generate_order_code(db, owner_id)


def _order_item_from_schema(item, index: int) -> OrderItem:
    return OrderItem(
        sort_order=index,
        line_uid=str(item.id) if item.id is not None else None,
        product_name=item.name or "بدون نام",
        quantity_method=item.quantityMethod,
        quantity_value_raw=item.quantityValueRaw,
        add_quantity_method=item.addQuantityMethod,
        add_quantity_raw=item.addQuantityRaw,
        final_quantity_raw=item.finalQuantityRaw,
        quantity_number=_to_float(item.quantityNumber),
        quantity_text=item.quantity,
        count_display=item.countDisplay,
        weight=item.weight,
        length=item.length,
        unit_price_raw=item.unitPriceRaw,
        unit_price_text=item.unitPrice,
        total_text=item.total,
        total_raw=_to_float(item.totalRaw),
        specs=item.specs,
        notes=item.notes,
    )


def _apply_order_data(
    db: Session,
    order: Order,
    data: OrderCreate | OrderUpdate,
    owner_id: int,
    is_new: bool = False,
) -> Order:
    order.owner_id = owner_id
    order.code = _ensure_unique_code(db, data.code, owner_id, None if is_new else order.id)
    order.customer_name = data.customer or "بدون نام"
    order.customer_phone = data.phone
    order.customer_quality = data.customerQuality
    order.status = _status(data)
    order.order_date_text = data.date
    order.order_date_input = data.dateInputValue
    order.invoice_description = data.invoiceDescription
    order.total_text = data.total
    order.total_raw = _to_float(data.totalRaw)
    order.prepayment_text = data.prepayment
    order.prepayment_raw = _to_float(data.prepaymentRaw)
    order.remaining_text = data.remaining
    order.remaining_raw = _to_float(data.remainingRaw)
    order.updated_at = datetime.utcnow()

    order.items.clear()
    for index, item in enumerate(data.items or []):
        order.items.append(_order_item_from_schema(item, index))

    return order


def order_to_out(order: Order) -> dict:
    items = []

    for item in order.items or []:
        items.append(
            {
                "id": item.line_uid or item.id,
                "name": item.product_name,
                "customer": order.customer_name,
                "date": order.order_date_text or "",
                "quantityMethod": item.quantity_method,
                "quantityValueRaw": item.quantity_value_raw,
                "addQuantityMethod": item.add_quantity_method,
                "addQuantityRaw": item.add_quantity_raw,
                "finalQuantityRaw": item.final_quantity_raw,
                "quantityNumber": item.quantity_number,
                "quantity": item.quantity_text,
                "countDisplay": item.count_display,
                "weight": item.weight,
                "length": item.length,
                "unitPriceRaw": item.unit_price_raw,
                "unitPrice": item.unit_price_text,
                "total": item.total_text,
                "totalRaw": item.total_raw,
                "specs": item.specs,
                "notes": item.notes,
            }
        )

    return {
        "uid": order.id,
        "code": order.code,
        "customer": order.customer_name,
        "phone": order.customer_phone,
        "customerQuality": order.customer_quality,
        "items": items,
        "status": order.status,
        "orderStatus": order.status,
        "statusLabel": order.status,
        "date": order.order_date_text,
        "dateInputValue": order.order_date_input,
        "invoiceDescription": order.invoice_description,
        "total": order.total_text,
        "totalRaw": order.total_raw,
        "prepayment": order.prepayment_text,
        "prepaymentRaw": order.prepayment_raw,
        "remaining": order.remaining_text,
        "remainingRaw": order.remaining_raw,
        "accounting_software": getattr(order, "accounting_software", None),
        "accountingSoftware": getattr(order, "accounting_software", None),
        "accounting_id": getattr(order, "accounting_id", None),
        "accountingId": getattr(order, "accounting_id", None),
        "accounting_exported_at": getattr(order, "accounting_exported_at", None),
        "accountingExportedAt": getattr(order, "accounting_exported_at", None),
        "accounting_export_batch": getattr(order, "accounting_export_batch", None),
        "accountingExportBatch": getattr(order, "accounting_export_batch", None),
    }


def list_orders(db: Session, owner_id: int, search: str | None = None) -> list[dict]:
    query = (
        db.query(Order)
        .options(selectinload(Order.items))
        .filter(Order.owner_id == owner_id)
        .order_by(Order.id.desc())
    )

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Order.code.ilike(pattern),
                Order.customer_name.ilike(pattern),
                Order.status.ilike(pattern),
                Order.order_date_text.ilike(pattern),
            )
        )

    return [order_to_out(order) for order in query.all()]


def get_order(db: Session, order_id: str, owner_id: int) -> Order | None:
    query = (
        db.query(Order)
        .options(selectinload(Order.items))
        .filter(Order.owner_id == owner_id)
    )

    if str(order_id).isdigit():
        by_id = query.filter(Order.id == int(order_id)).first()
        if by_id:
            return by_id

    return query.filter(Order.code == str(order_id)).first()


def create_order(db: Session, data: OrderCreate, owner_id: int) -> dict:
    now = datetime.utcnow()

    order = Order(
        owner_id=owner_id,
        code=_generate_order_code(db, owner_id),
        customer_name=data.customer or "بدون نام",
        created_at=now,
        updated_at=now,
    )

    _apply_order_data(db, order, data, owner_id=owner_id, is_new=True)

    db.add(order)
    db.commit()
    db.refresh(order)

    order = get_order(db, str(order.id), owner_id=owner_id)
    return order_to_out(order)


def update_order(db: Session, order: Order, data: OrderUpdate, owner_id: int) -> dict:
    _apply_order_data(db, order, data, owner_id=owner_id, is_new=False)

    db.commit()
    db.refresh(order)

    order = get_order(db, str(order.id), owner_id=owner_id)
    return order_to_out(order)


def delete_order(db: Session, order: Order) -> None:
    db.delete(order)
    db.commit()