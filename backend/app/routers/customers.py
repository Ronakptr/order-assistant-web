from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy import inspect, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.customer import Customer
from app.models.user import User

try:
    from app.services.company_scope import get_company_scope_id
except Exception:
    def get_company_scope_id(current_user: Any) -> int:
        return int(getattr(current_user, "company_id", None) or getattr(current_user, "id", 1) or 1)

try:
    from app.services.scoped_code_service import get_next_customer_code
except Exception:
    get_next_customer_code = None


router = APIRouter(prefix="/customers", tags=["Customers"])


def model_columns(model: Any) -> set[str]:
    return {column.key for column in inspect(model).mapper.column_attrs}


def get_value(data: dict, *keys: str, default: Any = None) -> Any:
    for key in keys:
        if key in data and data.get(key) is not None:
            return data.get(key)

    return default


def clean_text(value: Any, default: str = "") -> str:
    if value is None:
        return default

    text_value = str(value).strip()
    return text_value if text_value else default


def normalize_active_value(value: Any, default: bool = True) -> bool:
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    if isinstance(value, int):
        return value == 1

    text_value = str(value).strip().lower()
    text_value = text_value.replace("‌", " ")
    text_value = " ".join(text_value.split())

    active_values = {
        "true",
        "1",
        "yes",
        "active",
        "enabled",
        "enable",
        "فعال",
    }

    inactive_values = {
        "false",
        "0",
        "no",
        "inactive",
        "disabled",
        "disable",
        "غیرفعال",
        "غيرفعال",
        "غیر فعال",
        "غير فعال",
    }

    if text_value in active_values:
        return True

    if text_value in inactive_values:
        return False

    return default


def get_requested_active_value(data: dict, default: bool = True) -> bool:
    value = get_value(
        data,
        "is_active",
        "isActive",
        "active",
        "enabled",
        "status",
        default=None,
    )

    return normalize_active_value(value, default=default)


def apply_company_scope(query, current_user: User):
    columns = model_columns(Customer)
    scope_id = get_company_scope_id(current_user)

    if "owner_id" in columns:
        return query.filter(Customer.owner_id == scope_id)

    if "company_id" in columns:
        return query.filter(Customer.company_id == scope_id)

    return query


def generate_customer_code(db: Session, current_user: User) -> str:
    if get_next_customer_code is not None:
        return get_next_customer_code(db, current_user, Customer)

    scope_id = get_company_scope_id(current_user)
    columns = model_columns(Customer)

    if "customer_code" not in columns:
        return f"CUS-{scope_id}-0001"

    rows = (
        db.query(Customer.customer_code)
        .filter(Customer.customer_code.like(f"CUS-{scope_id}-%"))
        .all()
    )

    max_number = 0

    for row in rows:
        code = row[0] if isinstance(row, tuple) else row.customer_code
        parts = str(code or "").split("-")

        try:
            number = int(parts[-1])
        except Exception:
            number = 0

        if number > max_number:
            max_number = number

    return f"CUS-{scope_id}-{max_number + 1:04d}"


def customer_to_dict(customer: Customer) -> dict:
    is_active = bool(getattr(customer, "is_active", True))

    return {
        "id": getattr(customer, "id", None),
        "uid": getattr(customer, "id", None),

        "owner_id": getattr(customer, "owner_id", None),
        "company_id": getattr(customer, "company_id", None),

        "customer_code": getattr(customer, "customer_code", "") or "",
        "customerCode": getattr(customer, "customer_code", "") or "",
        "code": getattr(customer, "customer_code", "") or "",

        "oa_internal_code": getattr(customer, "oa_internal_code", "") or "",
        "oaInternalCode": getattr(customer, "oa_internal_code", "") or "",

        "name": getattr(customer, "name", "") or "",
        "phone": getattr(customer, "phone", "") or "",
        "mobile": getattr(customer, "phone", "") or "",

        "quality": getattr(customer, "quality", "") or "عادی",

        "source_type": getattr(customer, "source_type", "") or "manual",
        "sourceType": getattr(customer, "source_type", "") or "manual",

        "description": getattr(customer, "description", "") or "",

        "accounting_software": getattr(customer, "accounting_software", "") or "",
        "accountingSoftware": getattr(customer, "accounting_software", "") or "",

        "accounting_id": getattr(customer, "accounting_id", "") or "",
        "accountingId": getattr(customer, "accounting_id", "") or "",

        "is_active": is_active,
        "isActive": is_active,
        "active": is_active,
        "status": "فعال" if is_active else "غیرفعال",

        "created_at": getattr(customer, "created_at", None),
        "createdAt": getattr(customer, "created_at", None),
        "updated_at": getattr(customer, "updated_at", None),
        "updatedAt": getattr(customer, "updated_at", None),
    }


def build_customer_payload(
    data: dict,
    *,
    db: Session,
    current_user: User,
    for_create: bool,
    current_customer: Customer | None = None,
) -> dict:
    columns = model_columns(Customer)
    scope_id = get_company_scope_id(current_user)

    payload: dict[str, Any] = {}

    if "owner_id" in columns:
        payload["owner_id"] = scope_id

    if "company_id" in columns:
        payload["company_id"] = scope_id

    if for_create:
        customer_code = clean_text(
            get_value(data, "customer_code", "customerCode", "code", default="")
        )

        if not customer_code:
            customer_code = generate_customer_code(db, current_user)

        if "customer_code" in columns:
            payload["customer_code"] = customer_code

        if "oa_internal_code" in columns:
            payload["oa_internal_code"] = clean_text(
                get_value(
                    data,
                    "oa_internal_code",
                    "oaInternalCode",
                    default=customer_code,
                ),
                customer_code,
            )

    else:
        if "customer_code" in columns and any(
            key in data for key in ["customer_code", "customerCode", "code"]
        ):
            payload["customer_code"] = clean_text(
                get_value(data, "customer_code", "customerCode", "code", default="")
            )

        if "oa_internal_code" in columns and any(
            key in data for key in ["oa_internal_code", "oaInternalCode"]
        ):
            payload["oa_internal_code"] = clean_text(
                get_value(data, "oa_internal_code", "oaInternalCode", default="")
            )

    if "name" in columns and any(key in data for key in ["name", "full_name", "fullName"]):
        payload["name"] = clean_text(
            get_value(data, "name", "full_name", "fullName", default="")
        )

    if "phone" in columns and any(key in data for key in ["phone", "mobile", "tel"]):
        payload["phone"] = clean_text(
            get_value(data, "phone", "mobile", "tel", default="")
        )

    if "quality" in columns and any(
        key in data for key in ["quality", "customer_quality", "customerQuality"]
    ):
        payload["quality"] = clean_text(
            get_value(
                data,
                "quality",
                "customer_quality",
                "customerQuality",
                default="عادی",
            ),
            "عادی",
        )

    if "source_type" in columns and any(key in data for key in ["source_type", "sourceType"]):
        payload["source_type"] = clean_text(
            get_value(data, "source_type", "sourceType", default="manual"),
            "manual",
        )

    if "description" in columns and "description" in data:
        payload["description"] = clean_text(data.get("description"))

    if "accounting_software" in columns and any(
        key in data for key in ["accounting_software", "accountingSoftware"]
    ):
        payload["accounting_software"] = clean_text(
            get_value(data, "accounting_software", "accountingSoftware", default="")
        )

    if "accounting_id" in columns and any(
        key in data for key in ["accounting_id", "accountingId"]
    ):
        payload["accounting_id"] = clean_text(
            get_value(data, "accounting_id", "accountingId", default="")
        )

    if "is_active" in columns:
        default_active = True

        if current_customer is not None:
            default_active = bool(getattr(current_customer, "is_active", True))

        payload["is_active"] = get_requested_active_value(
            data,
            default=default_active,
        )

    now = datetime.utcnow()

    if for_create and "created_at" in columns:
        payload["created_at"] = now

    if "updated_at" in columns:
        payload["updated_at"] = now

    return payload


@router.get("")
@router.get("/")
def list_customers(
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = apply_company_scope(db.query(Customer), current_user)
    columns = model_columns(Customer)

    if search:
        pattern = f"%{search.strip()}%"
        filters = []

        if "name" in columns:
            filters.append(Customer.name.ilike(pattern))

        if "phone" in columns:
            filters.append(Customer.phone.ilike(pattern))

        if "customer_code" in columns:
            filters.append(Customer.customer_code.ilike(pattern))

        if "oa_internal_code" in columns:
            filters.append(Customer.oa_internal_code.ilike(pattern))

        if filters:
            query = query.filter(or_(*filters))

    if "id" in columns:
        query = query.order_by(Customer.id.desc())

    customers = query.all()

    return [customer_to_dict(customer) for customer in customers]


@router.get("/{customer_id}")
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = apply_company_scope(
        db.query(Customer).filter(Customer.id == customer_id),
        current_user,
    ).first()

    if not customer:
        raise HTTPException(status_code=404, detail="مشتری پیدا نشد")

    return customer_to_dict(customer)


@router.post("")
@router.post("/")
def create_customer(
    customer_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not isinstance(customer_data, dict):
        raise HTTPException(status_code=400, detail="اطلاعات مشتری نامعتبر است")

    name = clean_text(
        get_value(customer_data, "name", "full_name", "fullName", default="")
    )

    if not name:
        raise HTTPException(status_code=400, detail="نام مشتری الزامی است")

    last_error: Exception | None = None

    for attempt in range(1, 20):
        try:
            payload = build_customer_payload(
                customer_data,
                db=db,
                current_user=current_user,
                for_create=True,
            )

            if attempt > 1:
                scope_id = get_company_scope_id(current_user)
                fallback_code = (
                    f"CUS-{scope_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}-{attempt}"
                )

                if "customer_code" in model_columns(Customer):
                    payload["customer_code"] = fallback_code

                if "oa_internal_code" in model_columns(Customer):
                    payload["oa_internal_code"] = fallback_code

            customer = Customer(**payload)
            db.add(customer)
            db.commit()
            db.refresh(customer)

            return customer_to_dict(customer)

        except IntegrityError as exc:
            db.rollback()
            last_error = exc

    raise HTTPException(
        status_code=400,
        detail=f"خطا در ثبت مشتری. احتمالاً کد مشتری تکراری است. {last_error}",
    )


@router.put("/{customer_id}")
@router.patch("/{customer_id}")
def update_customer(
    customer_id: int,
    customer_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not isinstance(customer_data, dict):
        raise HTTPException(status_code=400, detail="اطلاعات مشتری نامعتبر است")

    customer = apply_company_scope(
        db.query(Customer).filter(Customer.id == customer_id),
        current_user,
    ).first()

    if not customer:
        raise HTTPException(status_code=404, detail="مشتری پیدا نشد")

    payload = build_customer_payload(
        customer_data,
        db=db,
        current_user=current_user,
        for_create=False,
        current_customer=customer,
    )

    protected_fields = {
        "id",
        "owner_id",
        "company_id",
        "created_at",
    }

    for key, value in payload.items():
        if key not in protected_fields and hasattr(customer, key):
            setattr(customer, key, value)

    if hasattr(customer, "updated_at"):
        customer.updated_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(customer)
        return customer_to_dict(customer)

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"خطا در ویرایش مشتری. {exc}",
        )


@router.patch("/{customer_id}/status")
@router.patch("/{customer_id}/active")
def update_customer_status(
    customer_id: int,
    customer_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not isinstance(customer_data, dict):
        raise HTTPException(status_code=400, detail="اطلاعات وضعیت مشتری نامعتبر است")

    customer = apply_company_scope(
        db.query(Customer).filter(Customer.id == customer_id),
        current_user,
    ).first()

    if not customer:
        raise HTTPException(status_code=404, detail="مشتری پیدا نشد")

    if not hasattr(customer, "is_active"):
        raise HTTPException(
            status_code=400,
            detail="ستون is_active برای مشتری در دیتابیس وجود ندارد",
        )

    customer.is_active = get_requested_active_value(
        customer_data,
        default=bool(getattr(customer, "is_active", True)),
    )

    if hasattr(customer, "updated_at"):
        customer.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(customer)

    return customer_to_dict(customer)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = apply_company_scope(
        db.query(Customer).filter(Customer.id == customer_id),
        current_user,
    ).first()

    if not customer:
        raise HTTPException(status_code=404, detail="مشتری پیدا نشد")

    db.delete(customer)
    db.commit()

    return None