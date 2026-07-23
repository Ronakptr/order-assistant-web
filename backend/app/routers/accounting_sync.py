from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.database import get_db
from app.models.customer import Customer
from app.models.order import Order
from app.models.product import Product
from app.services.company_scope import get_company_scope_id
from app.services.company_settings_service import (
    ACCOUNTING_SETTING_KEY,
    ASAN_PROVIDER_KEY,
    SOREN_PROVIDER_KEY,
    get_company_setting,
    normalize_accounting_settings,
)

router = APIRouter(prefix="/accounting", tags=["Accounting Sync"])


class AllocateIdsRequest(BaseModel):
    entity: Literal["all", "customers", "products", "orders"] = "all"
    provider: str | None = None


class MarkExportedRequest(BaseModel):
    provider: str | None = None
    order_ids: list[int | str] | None = None
    exported: bool = True


def _clean_id(value: Any) -> str:
    if value is None:
        return ""

    text = str(value).strip()
    text = text.replace("\u200c", "").replace("٬", "").replace(",", "")
    text = text.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))

    if re.fullmatch(r"\d+\.0+", text):
        return text.split(".", 1)[0]

    return text


def _max_numeric_suffix(values: list[Any], start: int = 1) -> int:
    max_id = int(start) - 1

    for value in values:
        text = _clean_id(value)
        match = re.search(r"(\d+)$", text)
        if match:
            max_id = max(max_id, int(match.group(1)))

    return max_id


def _provider_label(provider: str) -> str:
    return "سورن" if provider == SOREN_PROVIDER_KEY else "آسان"


def _resolve_provider(settings: dict[str, Any], requested_provider: str | None = None) -> str:
    provider = str(requested_provider or settings.get("provider") or ASAN_PROVIDER_KEY).strip().lower()

    if provider not in {ASAN_PROVIDER_KEY, SOREN_PROVIDER_KEY}:
        provider = ASAN_PROVIDER_KEY

    return provider


def _format_number_id(number: int, width: int | None = None, prefix: str = "") -> str:
    body = str(int(number)).zfill(int(width)) if width else str(int(number))
    return f"{prefix or ''}{body}"


def _next_ids(rows, field: str, start: int, count: int, width: int | None = None, prefix: str = "") -> list[str]:
    existing_values = [_clean_id(getattr(row, field, "")) for row in rows]
    next_number = _max_numeric_suffix(existing_values, start=start) + 1
    return [_format_number_id(next_number + offset, width=width, prefix=prefix) for offset in range(count)]


def _allocate_for_customers(db: Session, company_id: int, provider: str, settings: dict[str, Any]) -> int:
    rows = (
        db.query(Customer)
        .filter(Customer.owner_id == company_id)
        .order_by(Customer.id.asc())
        .all()
    )
    missing = [row for row in rows if not _clean_id(getattr(row, "accounting_id", ""))]

    provider_settings = settings.get(provider, {}) or {}
    start = int(provider_settings.get("customer_id_start") or (1001 if provider == ASAN_PROVIDER_KEY else 1))
    width = int(provider_settings.get("customer_id_width") or 0) if provider == SOREN_PROVIDER_KEY else None
    prefix = ""

    ids = _next_ids(rows, "accounting_id", start=start, count=len(missing), width=width, prefix=prefix)

    for row, accounting_id in zip(missing, ids):
        row.accounting_id = accounting_id
        row.accounting_software = _provider_label(provider)

    return len(missing)


def _allocate_for_products(db: Session, company_id: int, provider: str, settings: dict[str, Any]) -> int:
    rows = (
        db.query(Product)
        .filter(Product.owner_id == company_id)
        .order_by(Product.id.asc())
        .all()
    )
    missing = [row for row in rows if not _clean_id(getattr(row, "accounting_id", ""))]

    provider_settings = settings.get(provider, {}) or {}
    start = int(provider_settings.get("product_id_start") or (1001 if provider == ASAN_PROVIDER_KEY else 1))
    width = int(provider_settings.get("product_id_width") or 0) if provider == SOREN_PROVIDER_KEY else None

    ids = _next_ids(rows, "accounting_id", start=start, count=len(missing), width=width)

    for row, accounting_id in zip(missing, ids):
        row.accounting_id = accounting_id
        row.accounting_software = _provider_label(provider)

    return len(missing)


def _allocate_for_orders(db: Session, company_id: int, provider: str, settings: dict[str, Any]) -> int:
    rows = (
        db.query(Order)
        .filter(Order.owner_id == company_id)
        .order_by(Order.id.asc())
        .all()
    )
    missing = [row for row in rows if not _clean_id(getattr(row, "accounting_id", ""))]

    provider_settings = settings.get(provider, {}) or {}
    start = int(provider_settings.get("order_id_start") or 1)
    prefix = str(provider_settings.get("order_prefix") or ("S" if provider == ASAN_PROVIDER_KEY else ""))

    ids = _next_ids(rows, "accounting_id", start=start, count=len(missing), width=None, prefix=prefix)

    for row, accounting_id in zip(missing, ids):
        row.accounting_id = accounting_id
        row.accounting_software = _provider_label(provider)

    return len(missing)


@router.post("/allocate-ids")
def allocate_accounting_ids(
    payload: AllocateIdsRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(require_admin),
):
    company_id = get_company_scope_id(current_user)
    settings = normalize_accounting_settings(
        get_company_setting(db, current_user, ACCOUNTING_SETTING_KEY)
    )
    provider = _resolve_provider(settings, payload.provider)

    counts = {"customers": 0, "products": 0, "orders": 0}

    if payload.entity in {"all", "customers"}:
        counts["customers"] = _allocate_for_customers(db, company_id, provider, settings)

    if payload.entity in {"all", "products"}:
        counts["products"] = _allocate_for_products(db, company_id, provider, settings)

    if payload.entity in {"all", "orders"}:
        counts["orders"] = _allocate_for_orders(db, company_id, provider, settings)

    db.commit()

    return {
        "provider": provider,
        "provider_label": _provider_label(provider),
        "counts": counts,
        "total": sum(counts.values()),
    }


@router.post("/mark-exported")
def mark_orders_exported(
    payload: MarkExportedRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(require_admin),
):
    company_id = get_company_scope_id(current_user)
    settings = normalize_accounting_settings(
        get_company_setting(db, current_user, ACCOUNTING_SETTING_KEY)
    )
    provider = _resolve_provider(settings, payload.provider)
    query = db.query(Order).filter(Order.owner_id == company_id)

    if payload.order_ids:
        normalized_ids = [str(item) for item in payload.order_ids]
        numeric_ids = [int(item) for item in normalized_ids if str(item).isdigit()]
        text_codes = [item for item in normalized_ids if item not in {str(number) for number in numeric_ids}]

        if numeric_ids and text_codes:
            query = query.filter((Order.id.in_(numeric_ids)) | (Order.code.in_(text_codes)))
        elif numeric_ids:
            query = query.filter(Order.id.in_(numeric_ids))
        elif text_codes:
            query = query.filter(Order.code.in_(text_codes))

    rows = query.all()
    batch = f"{provider}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    for row in rows:
        row.accounting_software = _provider_label(provider)
        row.accounting_export_batch = batch if payload.exported else None
        row.accounting_exported_at = datetime.utcnow() if payload.exported else None

    db.commit()

    return {"updated": len(rows), "provider": provider, "batch": batch if payload.exported else None}
