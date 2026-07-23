from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

PERSIAN_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")

DASHBOARD_STATUS_ORDER = [
    "پرداخت شده",
    "در انتظار پرداخت",
    "لغو شده",
]


# -----------------------------------------------------------------------------
# Generic DB helpers
# -----------------------------------------------------------------------------
def _table_exists(db: Session, table_name: str) -> bool:
    try:
        return table_name in inspect(db.bind).get_table_names()
    except Exception:
        return False


def _fetch_all(db: Session, table_name: str) -> list[dict[str, Any]]:
    if not _table_exists(db, table_name):
        return []

    rows = db.execute(text(f'SELECT * FROM "{table_name}"')).fetchall()
    return [dict(row._mapping) for row in rows]


def _safe_text(value: Any, default: str = "") -> str:
    if value is None:
        return default

    result = str(value).strip()
    return result if result else default


def _safe_number(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default

    try:
        if isinstance(value, str):
            cleaned = value.translate(PERSIAN_DIGITS)
            cleaned = cleaned.replace(",", "").replace("،", "").strip()
            cleaned = re.sub(r"[^0-9.\-]", "", cleaned)

            if cleaned in {"", "-", ".", "-."}:
                return default

            return float(cleaned)

        return float(value)
    except Exception:
        return default


def _get_first(row: dict[str, Any], candidates: list[str], default: Any = None) -> Any:
    for key in candidates:
        if key in row and row.get(key) not in (None, ""):
            return row.get(key)

    return default


def _max_numeric_by_keywords(row: dict[str, Any], keywords: list[str]) -> float:
    values: list[float] = []

    for key, value in row.items():
        key_normalized = str(key).lower()

        if any(keyword in key_normalized for keyword in keywords):
            number_value = _safe_number(value, 0)

            if number_value > 0:
                values.append(number_value)

    return max(values) if values else 0.0


# -----------------------------------------------------------------------------
# Multi-company / ownership scoping
# -----------------------------------------------------------------------------
def _user_scope_values(current_user: Any = None) -> tuple[str | None, str | None]:
    if current_user is None:
        return None, None

    user_id = getattr(current_user, "id", None)
    company_id = getattr(current_user, "company_id", None)

    scope_id = company_id or user_id

    return (
        str(scope_id) if scope_id is not None else None,
        str(user_id) if user_id is not None else None,
    )


def _matches_scope(row: dict[str, Any], current_user: Any = None) -> bool:
    scope_id, user_id = _user_scope_values(current_user)

    if not scope_id and not user_id:
        return True

    # Newer rows should have company_id. When it exists, it is the strongest
    # scoping signal.
    row_company_id = row.get("company_id")
    if row_company_id not in (None, ""):
        return str(row_company_id) == str(scope_id)

    # Older legacy rows may have owner_id instead of company_id.
    row_owner_id = row.get("owner_id")
    if row_owner_id not in (None, ""):
        return str(row_owner_id) in {str(scope_id), str(user_id)}

    # Some rows may only have created_by / user_id.
    for key in ("created_by", "created_by_id", "user_id"):
        value = row.get(key)
        if value not in (None, ""):
            return str(value) in {str(scope_id), str(user_id)}

    # Legacy rows with no scope columns are kept visible to avoid hiding
    # existing data from older versions of the app.
    return True


def _scope_rows(rows: list[dict[str, Any]], current_user: Any = None) -> list[dict[str, Any]]:
    return [row for row in rows if _matches_scope(row, current_user)]


# -----------------------------------------------------------------------------
# Date helpers
# -----------------------------------------------------------------------------
def _jalali_to_gregorian(jy: int, jm: int, jd: int) -> date | None:
    try:
        jy += 1595
        days = -355668 + (365 * jy) + ((jy // 33) * 8) + (((jy % 33) + 3) // 4) + jd
        days += (0 if jm < 7 else -6) + ((jm - 1) * 31 if jm < 7 else ((jm - 7) * 30) + 186)
        gy = 400 * (days // 146097)
        days %= 146097

        if days > 36524:
            gy += 100 * ((days - 1) // 36524)
            days = (days - 1) % 36524

            if days >= 365:
                days += 1

        gy += 4 * (days // 1461)
        days %= 1461

        if days > 365:
            gy += (days - 1) // 365
            days = (days - 1) % 365

        gd = days + 1
        month_days = [
            0,
            31,
            29 if (gy % 4 == 0 and gy % 100 != 0) or (gy % 400 == 0) else 28,
            31,
            30,
            31,
            30,
            31,
            31,
            30,
            31,
            30,
            31,
        ]
        gm = 1

        while gm <= 12 and gd > month_days[gm]:
            gd -= month_days[gm]
            gm += 1

        return date(gy, gm, gd)
    except Exception:
        return None


def _parse_date(value: Any) -> date | None:
    if value is None:
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    text_value = str(value).translate(PERSIAN_DIGITS).strip()

    if not text_value:
        return None

    # Supports values like 1405/05/01 - 00:43 and 2026-07-23T12:00:00.
    match = re.search(r"(\d{4})[-/](\d{1,2})[-/](\d{1,2})", text_value)

    if match:
        year = int(match.group(1))
        month = int(match.group(2))
        day = int(match.group(3))

        if 1200 <= year <= 1600:
            return _jalali_to_gregorian(year, month, day)

        try:
            return date(year, month, day)
        except Exception:
            pass

    normalized = text_value.replace("Z", "").split("+")[0].strip()

    for fmt in (
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%Y-%m-%d %H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
    ):
        try:
            return datetime.strptime(normalized[:26], fmt).date()
        except Exception:
            continue

    return None


def _dashboard_anchor_date(orders: list[dict[str, Any]]) -> date:
    dates = [_order_date(order) for order in orders]
    usable_dates = [item for item in dates if item is not None]

    return max(usable_dates) if usable_dates else date.today()


def _month_bounds(anchor: date, offset: int = 0) -> tuple[date, date]:
    month_index = (anchor.year * 12 + anchor.month - 1) + offset
    year = month_index // 12
    month = month_index % 12 + 1
    start = date(year, month, 1)

    if month == 12:
        end = date(year, 12, 31)
    else:
        end = date(year, month + 1, 1) - timedelta(days=1)

    return start, end


def _period_bounds(period: str, anchor: date, offset: int = 0) -> tuple[date, date]:
    if period == "yearly":
        year = anchor.year + offset
        return date(year, 1, 1), date(year, 12, 31)

    if period == "monthly":
        return _month_bounds(anchor, offset)

    # Weekly: use a rolling 7-day window ending on the anchor date.
    end = anchor + timedelta(days=offset * 7)
    start = end - timedelta(days=6)

    return start, end


def _in_range(item_date: date | None, start: date, end: date) -> bool:
    return bool(item_date and start <= item_date <= end)


def _growth(current: float, previous: float) -> float:
    if previous == 0:
        return 0.0 if current == 0 else 100.0

    return round(((current - previous) / previous) * 100, 1)


# -----------------------------------------------------------------------------
# Status helpers
# -----------------------------------------------------------------------------
def _normalize_status(status: Any) -> str:
    value = str(status or "").lower().replace("‌", " ").replace("ي", "ی").replace("ك", "ک")
    value = value.translate(PERSIAN_DIGITS).strip()
    value = re.sub(r"\s+", " ", value)

    return value


def _canonical_status(status: Any) -> str:
    value = _normalize_status(status)

    if not value:
        return "ثبت شده"

    # Order matters a lot here. "در انتظار پرداخت" contains the word
    # "پرداخت", so pending/unpaid statuses MUST be checked before paid.
    if any(
        word in value
        for word in (
            "لغو",
            "cancelled",
            "canceled",
            "cancel",
        )
    ):
        return "لغو شده"

    if any(
        word in value
        for word in (
            "در انتظار",
            "انتظار",
            "منتظر",
            "پرداخت نشده",
            "پرداخت نشد",
            "عدم پرداخت",
            "unpaid",
            "pending",
            "waiting",
            "awaiting",
        )
    ):
        return "در انتظار پرداخت"

    if any(
        word in value
        for word in (
            "ثبت شده",
            "ثبت‌شده",
            "ثبت",
            "ذخیره",
            "saved",
            "registered",
            "created",
            "new",
            "draft",
        )
    ):
        return "ثبت شده"

    if any(
        word in value
        for word in (
            "پرداخت شده",
            "پرداخت‌شده",
            "تسویه شده",
            "تسویه‌شده",
            "تسویه",
            "تکمیل",
            "انجام شده",
            "تمام شده",
            "paid",
            "settled",
            "completed",
            "complete",
            "done",
        )
    ):
        return "پرداخت شده"

    # A bare "پرداخت" is considered paid only after the pending/unpaid checks
    # above have ruled out "در انتظار پرداخت" and "پرداخت نشده".
    if value == "پرداخت":
        return "پرداخت شده"

    return _safe_text(status, "ثبت شده")


def _is_paid_order(order: dict[str, Any]) -> bool:
    return _canonical_status(_order_status(order)) == "پرداخت شده"


def _is_cancelled_order(order: dict[str, Any]) -> bool:
    return _canonical_status(_order_status(order)) == "لغو شده"


def _dashboard_pie_status(order: dict[str, Any]) -> str:
    status = _canonical_status(_order_status(order))

    if status == "پرداخت شده":
        return "پرداخت شده"

    if status == "لغو شده":
        return "لغو شده"

    # ثبت شده + در انتظار پرداخت + unknown are grouped here, matching the
    # current 3-row dashboard status card.
    return "در انتظار پرداخت"


# -----------------------------------------------------------------------------
# Product / customer / order helpers
# -----------------------------------------------------------------------------
def _product_name(product: dict[str, Any]) -> str:
    return (
        _safe_text(
            _get_first(
                product,
                ["name", "product_name", "title", "product_title", "persian_name"],
            )
        )
        or "محصول بدون نام"
    )


def _product_unit(product: dict[str, Any]) -> str:
    return _safe_text(
        _get_first(product, ["unit", "quantity_unit", "price_unit", "measurement_unit"]),
        "",
    )


def _product_price(product: dict[str, Any]) -> float:
    direct_value = _safe_number(
        _get_first(
            product,
            [
                "sale_price",
                "sales_price",
                "selling_price",
                "unit_price",
                "price",
                "default_sale_price",
                "default_price",
                "base_price",
                "price_per_unit",
                "unit_sale_price",
                "product_price",
            ],
            0,
        )
    )

    if direct_value > 0:
        return direct_value

    return _max_numeric_by_keywords(product, ["price", "amount", "total", "sale"])


def _product_stock(product: dict[str, Any]) -> float:
    return _safe_number(
        _get_first(
            product,
            [
                "remaining_stock",
                "stock_quantity",
                "stock",
                "inventory",
                "current_stock",
                "quantity",
                "qty",
                "available_quantity",
                "available_stock",
            ],
            0,
        )
    )


def _product_warning_stock(product: dict[str, Any]) -> float:
    return _safe_number(
        _get_first(
            product,
            [
                "warning_stock",
                "stock_alert_level",
                "low_stock_threshold",
                "min_stock",
                "minimum_stock",
                "minimum_inventory",
                "alert_stock",
                "reorder_level",
                "critical_stock",
            ],
            0,
        )
    )


def _order_date(order: dict[str, Any]) -> date | None:
    return _parse_date(
        _get_first(
            order,
            [
                "order_date_text",
                "order_date",
                "date",
                "created_at",
                "created_date",
                "updated_at",
            ],
        )
    )


def _order_date_text(order: dict[str, Any]) -> str:
    return _safe_text(
        _get_first(
            order,
            ["order_date_text", "date", "order_date", "created_at", "created_date"],
            "-",
        ),
        "-",
    )


def _order_status(order: dict[str, Any]) -> str:
    return _safe_text(
        _get_first(order, ["status", "order_status", "payment_status", "statusLabel"]),
        "ثبت شده",
    )


def _order_code(order: dict[str, Any]) -> str:
    return _safe_text(_get_first(order, ["code", "order_code", "order_number"])) or f"ORD-{order.get('id')}"


def _customer_lookup(customers: list[dict[str, Any]]) -> dict[str, str]:
    lookup: dict[str, str] = {}

    for customer in customers:
        customer_id = _safe_text(customer.get("id"))

        if not customer_id:
            continue

        name = (
            _safe_text(_get_first(customer, ["name", "full_name", "customer_name", "title"]))
            or "مشتری بدون نام"
        )
        lookup[customer_id] = name

    return lookup


def _order_customer_name(order: dict[str, Any], customers: dict[str, str]) -> str:
    direct_name = _safe_text(
        _get_first(order, ["customer_name", "customer", "client_name", "buyer_name"])
    )

    if direct_name:
        return direct_name

    customer_id = _safe_text(order.get("customer_id"))
    return customers.get(customer_id, "-") if customer_id else "-"


def _order_direct_total(order: dict[str, Any]) -> float:
    direct_value = _safe_number(
        _get_first(
            order,
            [
                "total_raw",
                "total",
                "amount",
                "total_amount",
                "grand_total",
                "final_total",
                "final_amount",
                "payable_amount",
                "payable",
                "net_amount",
                "net_total",
                "order_total",
                "order_amount",
                "total_price",
                "final_price",
                "invoice_total",
                "invoice_amount",
                "sum_total",
                "subtotal",
                "total_after_discount",
                "final_total_price",
                "total_final_price",
                "calculated_total",
            ],
            0,
        )
    )

    if direct_value > 0:
        return direct_value

    return _max_numeric_by_keywords(
        order,
        ["total", "amount", "price", "payable", "invoice", "final", "sum"],
    )


def _order_items_context(
    db: Session,
    products: list[dict[str, Any]],
    paid_order_ids: set[str] | None = None,
) -> tuple[dict[str, float], dict[str, int], dict[str, str], list[dict[str, Any]]]:
    if not _table_exists(db, "order_items"):
        return {}, {}, {}, []

    items = _fetch_all(db, "order_items")

    product_lookup: dict[str, dict[str, Any]] = {}

    for product in products:
        product_id = _safe_text(product.get("id"))
        product_code = _safe_text(_get_first(product, ["code", "product_code", "sku"]))
        name = _product_name(product)
        info = {
            "name": name,
            "unit": _product_unit(product),
            "price": _product_price(product),
        }

        for key in (product_id, product_code, name):
            if key:
                product_lookup[key] = info

    order_totals: dict[str, float] = {}
    order_item_counts: dict[str, int] = {}
    order_item_names: dict[str, list[str]] = {}
    product_totals: dict[str, dict[str, Any]] = {}

    for item in items:
        order_id = _safe_text(_get_first(item, ["order_id", "orderId", "order"]))

        if not order_id:
            continue

        product_id = _safe_text(
            _get_first(item, ["product_id", "productId", "product", "product_code", "sku"])
        )
        product_name_from_item = _safe_text(_get_first(item, ["product_name", "name", "title"]))
        product_info = product_lookup.get(product_id) or product_lookup.get(product_name_from_item) or {}
        product_name = product_name_from_item or product_info.get("name") or "محصول بدون نام"

        quantity = _safe_number(
            _get_first(
                item,
                [
                    "quantity_number",
                    "quantity",
                    "qty",
                    "count",
                    "item_quantity",
                    "product_quantity",
                    "amount_quantity",
                ],
                1,
            ),
            1,
        )

        if quantity <= 0:
            quantity = 1

        unit_price = _safe_number(
            _get_first(
                item,
                [
                    "unit_price_raw",
                    "unit_price",
                    "price",
                    "sale_price",
                    "sales_price",
                    "product_price",
                    "selling_price",
                ],
                0,
            )
        )

        if unit_price <= 0:
            unit_price = _safe_number(product_info.get("price"), 0)

        line_total = _safe_number(
            _get_first(
                item,
                [
                    "total_raw",
                    "line_total",
                    "total_price",
                    "total_amount",
                    "final_price",
                    "amount",
                    "subtotal",
                    "sum",
                    "row_total",
                    "item_total",
                ],
                0,
            )
        )

        if line_total <= 0:
            line_total = _max_numeric_by_keywords(item, ["total", "amount", "final", "sum", "subtotal"])

        if line_total <= 0:
            line_total = quantity * unit_price

        order_totals[order_id] = order_totals.get(order_id, 0.0) + line_total
        order_item_counts[order_id] = order_item_counts.get(order_id, 0) + 1
        order_item_names.setdefault(order_id, [])

        if product_name and product_name not in order_item_names[order_id]:
            order_item_names[order_id].append(product_name)

        # Top products are sales-related, so they must use paid orders only.
        if paid_order_ids is not None and order_id not in paid_order_ids:
            continue

        product_key = product_id or product_name

        if product_key not in product_totals:
            product_totals[product_key] = {
                "product_id": product_id or None,
                "name": product_name,
                "count": 0,
                "amount": 0.0,
            }

        product_totals[product_key]["count"] += quantity
        product_totals[product_key]["amount"] += line_total

    order_items_summary = {
        order_id: "، ".join(names[:3]) if names else "-"
        for order_id, names in order_item_names.items()
    }
    top_products = sorted(
        product_totals.values(),
        key=lambda row: (row.get("amount", 0), row.get("count", 0)),
        reverse=True,
    )[:7]

    return order_totals, order_item_counts, order_items_summary, top_products


def _order_total(order: dict[str, Any], order_item_totals: dict[str, float]) -> float:
    direct_total = _order_direct_total(order)

    if direct_total > 0:
        return direct_total

    order_id = _safe_text(order.get("id"))
    return _safe_number(order_item_totals.get(order_id, 0))


# -----------------------------------------------------------------------------
# Metrics and chart builders
# -----------------------------------------------------------------------------
def _period_totals(
    orders: list[dict[str, Any]],
    order_item_totals: dict[str, float],
    period: str,
    anchor: date,
    offset: int = 0,
) -> dict[str, float]:
    start, end = _period_bounds(period, anchor, offset)
    amount = 0.0
    count = 0

    for order in orders:
        if _in_range(_order_date(order), start, end):
            count += 1
            amount += _order_total(order, order_item_totals)

    return {
        "count": count,
        "amount": amount,
    }


def _day_totals(
    orders: list[dict[str, Any]],
    order_item_totals: dict[str, float],
    target_date: date,
) -> dict[str, float]:
    amount = 0.0
    count = 0

    for order in orders:
        if _order_date(order) == target_date:
            count += 1
            amount += _order_total(order, order_item_totals)

    return {
        "count": count,
        "amount": amount,
    }


def _orders_by_period(
    paid_orders: list[dict[str, Any]],
    order_item_totals: dict[str, float],
    period: str,
    anchor: date,
) -> list[dict[str, Any]]:
    # Sales trend must be based only on paid orders.
    if period == "yearly":
        rows: list[dict[str, Any]] = []

        for month in range(1, anchor.month + 1):
            count = 0
            amount = 0.0

            for order in paid_orders:
                order_date = _order_date(order)

                if order_date and order_date.year == anchor.year and order_date.month == month:
                    count += 1
                    amount += _order_total(order, order_item_totals)

            rows.append(
                {
                    "date": f"{anchor.year}-{month:02d}",
                    "label": f"{month:02d}",
                    "count": count,
                    "amount": amount,
                }
            )

        return rows

    start_date, end_date = _period_bounds(period, anchor, 0)
    days = (end_date - start_date).days + 1
    rows: list[dict[str, Any]] = []

    for offset in range(days):
        current_date = start_date + timedelta(days=offset)
        count = 0
        amount = 0.0

        for order in paid_orders:
            if _order_date(order) == current_date:
                count += 1
                amount += _order_total(order, order_item_totals)

        rows.append(
            {
                "date": current_date.isoformat(),
                "label": current_date.strftime("%m/%d"),
                "count": count,
                "amount": amount,
            }
        )

    return rows


def _orders_by_status(orders: list[dict[str, Any]]) -> list[dict[str, Any]]:
    # The pie/status card uses all orders and must update immediately when an
    # order status changes. Registered/unknown orders are grouped under pending.
    result = {status: 0 for status in DASHBOARD_STATUS_ORDER}

    for order in orders:
        status = _dashboard_pie_status(order)
        result[status] = result.get(status, 0) + 1

    return [
        {"status": status, "count": result.get(status, 0)}
        for status in DASHBOARD_STATUS_ORDER
    ]


def _stats(
    orders: list[dict[str, Any]],
    customers: list[dict[str, Any]],
    products: list[dict[str, Any]],
    messages: list[dict[str, Any]],
    order_item_totals: dict[str, float],
    period: str,
    anchor: date,
) -> dict[str, Any]:
    paid_orders = [order for order in orders if _is_paid_order(order)]
    cancelled_orders = [order for order in orders if _is_cancelled_order(order)]
    open_orders = [order for order in orders if not _is_paid_order(order) and not _is_cancelled_order(order)]

    paid_amount = sum(_order_total(order, order_item_totals) for order in paid_orders)
    open_amount = sum(_order_total(order, order_item_totals) for order in open_orders)

    low_stock_products = 0
    out_of_stock_products = 0

    for product in products:
        stock = _product_stock(product)
        warning_stock = _product_warning_stock(product)

        if warning_stock <= 0:
            continue

        if stock <= 0:
            out_of_stock_products += 1
        elif stock <= warning_stock:
            low_stock_products += 1

    today_messages = 0
    previous_day_messages = 0

    for message in messages:
        message_date = _parse_date(_get_first(message, ["date", "created_at", "created_date", "updated_at"]))

        if message_date == anchor:
            today_messages += 1

        if message_date == anchor - timedelta(days=1):
            previous_day_messages += 1

    # Sales summary must use paid orders only.
    period_current = _period_totals(paid_orders, order_item_totals, period, anchor, 0)
    period_previous = _period_totals(paid_orders, order_item_totals, period, anchor, -1)
    today_current = _day_totals(paid_orders, order_item_totals, anchor)
    today_previous = _day_totals(paid_orders, order_item_totals, anchor - timedelta(days=1))

    average_order_amount = (
        period_current["amount"] / period_current["count"]
        if period_current["count"]
        else 0.0
    )

    return {
        # General counts.
        "total_orders": len(orders),
        "total_customers": len(customers),
        "total_products": len(products),
        "total_messages": len(messages),
        # Sales-related counts use paid orders only.
        "period_orders": period_current["count"],
        "today_orders": today_current["count"],
        "completed_orders": len(paid_orders),
        "paid_orders": len(paid_orders),
        # Operational counts.
        "open_orders": len(open_orders),
        "pending_orders": len(open_orders),
        "cancelled_orders": len(cancelled_orders),
        "canceled_orders": len(cancelled_orders),
        "today_messages": today_messages,
        "low_stock_products": low_stock_products,
        "out_of_stock_products": out_of_stock_products,
        # Amounts: total/period/today sales are paid-only.
        "total_amount": paid_amount,
        "period_amount": period_current["amount"],
        "today_amount": today_current["amount"],
        "paid_amount": paid_amount,
        "open_amount": open_amount,
        "month_order_amount": period_current["amount"],
        "average_order_amount": average_order_amount,
        "anchor_date": anchor.isoformat(),
        "growth": {
            "period_amount": _growth(period_current["amount"], period_previous["amount"]),
            "period_orders": _growth(period_current["count"], period_previous["count"]),
            "today_amount": _growth(today_current["amount"], today_previous["amount"]),
            "today_orders": _growth(today_current["count"], today_previous["count"]),
            "today_messages": _growth(today_messages, previous_day_messages),
        },
    }


# -----------------------------------------------------------------------------
# Alerts / recent data
# -----------------------------------------------------------------------------
def _product_alerts(products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    low_stock: list[dict[str, Any]] = []
    out_of_stock: list[dict[str, Any]] = []

    for product in products:
        warning_stock = _product_warning_stock(product)

        if warning_stock <= 0:
            continue

        stock = _product_stock(product)
        row = {
            "product_id": product.get("id"),
            "product_name": _product_name(product),
            "stock_quantity": stock,
            "stock_alert_level": warning_stock,
            "unit": _product_unit(product),
        }

        if stock <= 0:
            out_of_stock.append(row)
        elif stock <= warning_stock:
            low_stock.append(row)

    alerts: list[dict[str, Any]] = []

    if out_of_stock:
        alerts.append(
            {
                "type": "out_of_stock",
                "severity": "critical",
                "title": f"{len(out_of_stock)} محصول بدون موجودی هستند",
                "message": "موجودی این محصولات صفر یا کمتر از صفر است.",
                "count": len(out_of_stock),
                "items": out_of_stock[:8],
            }
        )

    if low_stock:
        alerts.append(
            {
                "type": "low_stock",
                "severity": "warning",
                "title": f"{len(low_stock)} محصول کم‌موجودی هستند",
                "message": "موجودی این محصولات به حد هشدار رسیده است.",
                "count": len(low_stock),
                "items": low_stock[:8],
            }
        )

    return alerts


def _order_alerts(
    orders: list[dict[str, Any]],
    customers: dict[str, str],
    order_item_totals: dict[str, float],
    order_item_counts: dict[str, int],
) -> list[dict[str, Any]]:
    pending_orders: list[dict[str, Any]] = []

    for order in orders:
        if _is_paid_order(order) or _is_cancelled_order(order):
            continue

        order_id = _safe_text(order.get("id"))
        pending_orders.append(
            {
                "order_id": order.get("id"),
                "order_code": _order_code(order),
                "customer_name": _order_customer_name(order, customers),
                "status": _canonical_status(_order_status(order)),
                "total": _order_total(order, order_item_totals),
                "items_count": order_item_counts.get(order_id, 0),
            }
        )

    if not pending_orders:
        return []

    return [
        {
            "type": "open_orders",
            "severity": "info",
            "title": f"{len(pending_orders)} سفارش باز وجود دارد",
            "message": "این سفارش‌ها هنوز پرداخت‌شده یا لغوشده نیستند.",
            "count": len(pending_orders),
            "items": pending_orders[:8],
        }
    ]


def _message_alerts(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    failed: list[dict[str, Any]] = []
    draft: list[dict[str, Any]] = []
    pending: list[dict[str, Any]] = []

    for message in messages:
        status = _normalize_status(_get_first(message, ["status", "message_status"]))

        if any(word in status for word in ["ناموفق", "خطا", "failed", "error"]):
            failed.append(message)
        elif any(word in status for word in ["پیش", "draft"]):
            draft.append(message)
        elif any(word in status for word in ["انتظار", "pending"]):
            pending.append(message)

    alerts: list[dict[str, Any]] = []

    if failed:
        alerts.append(
            {
                "type": "failed_messages",
                "severity": "warning",
                "title": f"{len(failed)} پیام ناموفق وجود دارد",
                "message": "پیام‌های ناموفق نیاز به بررسی دارند.",
                "count": len(failed),
            }
        )

    if draft:
        alerts.append(
            {
                "type": "draft_messages",
                "severity": "info",
                "title": f"{len(draft)} پیام پیش‌نویس وجود دارد",
                "message": "پیام‌های پیش‌نویس هنوز ارسال نشده‌اند.",
                "count": len(draft),
            }
        )

    if pending:
        alerts.append(
            {
                "type": "pending_messages",
                "severity": "info",
                "title": f"{len(pending)} پیام در انتظار ارسال وجود دارد",
                "message": "پیام‌های در انتظار ارسال را بررسی کنید.",
                "count": len(pending),
            }
        )

    return alerts


def _recent_orders(
    orders: list[dict[str, Any]],
    customers: dict[str, str],
    order_item_totals: dict[str, float],
    order_items_summary: dict[str, str],
) -> list[dict[str, Any]]:
    sorted_orders = sorted(
        orders,
        key=lambda order: (_order_date(order) or date.min, _safe_number(order.get("id"), 0)),
        reverse=True,
    )

    result: list[dict[str, Any]] = []

    for order in sorted_orders[:8]:
        order_id = _safe_text(order.get("id"))

        result.append(
            {
                "id": order.get("id"),
                "uid": order.get("id"),
                "order_code": _order_code(order),
                "code": _order_code(order),
                "customer_name": _order_customer_name(order, customers),
                "customer": _order_customer_name(order, customers),
                "status": _canonical_status(_order_status(order)),
                "date": _order_date_text(order),
                "items_summary": order_items_summary.get(order_id, "-"),
                "total": _order_total(order, order_item_totals),
                "amount": _order_total(order, order_item_totals),
            }
        )

    return result


def _recent_messages(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        messages,
        key=lambda message: (
            _parse_date(_get_first(message, ["updated_at", "created_at", "date"])) or date.min,
            _safe_number(message.get("id"), 0),
        ),
        reverse=True,
    )[:8]


def _recent_customers(customers: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        customers,
        key=lambda customer: (
            _parse_date(_get_first(customer, ["updated_at", "created_at", "date"])) or date.min,
            _safe_number(customer.get("id"), 0),
        ),
        reverse=True,
    )[:8]


# -----------------------------------------------------------------------------
# Public API
# -----------------------------------------------------------------------------
def get_dashboard_summary(
    db: Session,
    current_user: Any = None,
    period: str = "weekly",
) -> dict[str, Any]:
    if period not in {"weekly", "monthly", "yearly"}:
        period = "weekly"

    orders = _scope_rows(_fetch_all(db, "orders"), current_user)
    customers = _scope_rows(_fetch_all(db, "customers"), current_user)
    products = _scope_rows(_fetch_all(db, "products"), current_user)
    messages = _scope_rows(_fetch_all(db, "messages"), current_user)

    paid_order_ids = {_safe_text(order.get("id")) for order in orders if _is_paid_order(order)}
    anchor = _dashboard_anchor_date(orders)
    customers_map = _customer_lookup(customers)
    order_item_totals, order_item_counts, order_items_summary, top_products = _order_items_context(
        db,
        products,
        paid_order_ids=paid_order_ids,
    )
    paid_orders = [order for order in orders if _is_paid_order(order)]

    alerts: list[dict[str, Any]] = []
    alerts.extend(_product_alerts(products))
    alerts.extend(_order_alerts(orders, customers_map, order_item_totals, order_item_counts))
    alerts.extend(_message_alerts(messages))

    severity_rank = {
        "critical": 0,
        "warning": 1,
        "info": 2,
        "success": 3,
    }
    alerts = sorted(alerts, key=lambda alert: severity_rank.get(alert.get("severity", "info"), 9))

    return {
        "period": period,
        "stats": _stats(
            orders=orders,
            customers=customers,
            products=products,
            messages=messages,
            order_item_totals=order_item_totals,
            period=period,
            anchor=anchor,
        ),
        "charts": {
            # Trend and top products are paid-only.
            "orders_by_day": _orders_by_period(paid_orders, order_item_totals, period, anchor),
            "top_products": top_products,
            # Status pie uses all order statuses.
            "orders_by_status": _orders_by_status(orders),
        },
        "recent": {
            "recent_orders": _recent_orders(orders, customers_map, order_item_totals, order_items_summary),
            "recent_messages": _recent_messages(messages),
            "recent_customers": _recent_customers(customers),
        },
        "alerts": alerts,
        "generated_at": datetime.utcnow().isoformat(),
    }


def dashboard_summary(
    db: Session,
    current_user: Any = None,
    period: str = "weekly",
) -> dict[str, Any]:
    return get_dashboard_summary(db=db, current_user=current_user, period=period)


def get_summary(
    db: Session,
    current_user: Any = None,
    period: str = "weekly",
) -> dict[str, Any]:
    return get_dashboard_summary(db=db, current_user=current_user, period=period)
