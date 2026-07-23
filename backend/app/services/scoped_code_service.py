from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session


def get_company_scope_id(current_user: Any) -> int:
    company_id = getattr(current_user, "company_id", None)
    user_id = getattr(current_user, "id", None)

    if company_id:
        return int(company_id)

    return int(user_id or 1)


def normalize_code_prefix(prefix: str) -> str:
    value = str(prefix or "").strip().upper()
    value = re.sub(r"[^A-Z0-9_-]", "", value)
    return value or "OA"


def make_scoped_code(prefix: str, scope_id: int, number: int) -> str:
    clean_prefix = normalize_code_prefix(prefix)
    return f"{clean_prefix}-{int(scope_id)}-{int(number):04d}"


def make_collision_safe_code(prefix: str, scope_id: int, attempt: int = 1) -> str:
    clean_prefix = normalize_code_prefix(prefix)
    stamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    return f"{clean_prefix}-{int(scope_id)}-{stamp}-{int(attempt)}"


def extract_scoped_number(code: Any, prefix: str, scope_id: int) -> int | None:
    if not code:
        return None

    clean_prefix = normalize_code_prefix(prefix)
    text = str(code).strip().upper()

    pattern = rf"^{re.escape(clean_prefix)}-{int(scope_id)}-(\d+)$"
    match = re.match(pattern, text)

    if not match:
        return None

    try:
        return int(match.group(1))
    except ValueError:
        return None


def get_next_customer_code(db: Session, current_user: Any, CustomerModel: Any) -> str:
    scope_id = get_company_scope_id(current_user)

    rows = (
        db.query(CustomerModel.customer_code)
        .filter(CustomerModel.customer_code.like(f"CUS-{scope_id}-%"))
        .all()
    )

    max_number = 0

    for row in rows:
        code = row[0] if isinstance(row, tuple) else row.customer_code
        number = extract_scoped_number(code, "CUS", scope_id)

        if number and number > max_number:
            max_number = number

    return make_scoped_code("CUS", scope_id, max_number + 1)


def get_next_order_code(db: Session, current_user: Any, OrderModel: Any) -> str:
    scope_id = get_company_scope_id(current_user)

    rows = (
        db.query(OrderModel.code)
        .filter(OrderModel.code.like(f"ORD-{scope_id}-%"))
        .all()
    )

    max_number = 0

    for row in rows:
        code = row[0] if isinstance(row, tuple) else row.code
        number = extract_scoped_number(code, "ORD", scope_id)

        if number and number > max_number:
            max_number = number

    return make_scoped_code("ORD", scope_id, max_number + 1)