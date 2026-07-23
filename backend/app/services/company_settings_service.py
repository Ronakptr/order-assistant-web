from __future__ import annotations

import copy
import json
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.company_setting import CompanySetting
from app.services.company_scope import get_company_scope_id

ASAN_PROVIDER_KEY = "asan"
SOREN_PROVIDER_KEY = "soren"

ACCOUNTING_SETTING_KEY = "accounting"
NOTIFICATION_SETTING_KEY = "system_notifications"

SYSTEM_NOTIFICATION_CATEGORY_KEYS = [
    "product_inventory",
    "product_pricing",
    "orders_attention",
    "messages_attention",
    "customers_attention",
    "backup",
    "account_security",
    "admin_management",
    "invoice_settings",
    "accounting_sync",
]

SYSTEM_NOTIFICATION_CATEGORY_LABELS = {
    "product_inventory": "موجودی محصولات",
    "product_pricing": "قیمت محصولات",
    "orders_attention": "سفارش‌ها",
    "messages_attention": "پیام‌ها",
    "customers_attention": "مشتریان",
    "backup": "پشتیبان‌گیری",
    "account_security": "امنیت حساب کاربری",
    "admin_management": "مدیریت سیستم",
    "invoice_settings": "تنظیمات فاکتور",
    "accounting_sync": "همگام‌سازی حسابداری",
}

SYSTEM_NOTIFICATION_ROLE_ORDER = ["admin", "sales_manager", "sales", "accountant"]

SYSTEM_NOTIFICATION_ROLE_LABELS = {
    "admin": "مدیر",
    "sales_manager": "سرپرست فروش",
    "sales": "فروشنده",
    "accountant": "حسابدار",
}

DEFAULT_ACCOUNTING_SETTINGS: dict[str, Any] = {
    "provider": "",
    "asan": {
        "enabled": False,
        "customer_id_start": 1001,
        "product_id_start": 1001,
        "order_prefix": "S",
        "default_customer_group": "مشتری ها",
        "default_customer_type": "حقیقی",
        "default_customer_nationality": "ایرانی",
        "default_product_group": "متفرقه",
        "default_product_subgroup": "متفرقه",
        "default_purchase_price": 0,
        "default_initial_stock": 0,
        "default_invoice_discount": 0,
        "default_invoice_tax": 0,
        "default_item_discount": 0,
        "default_item_tax": 0,
        "default_product_purchase_discount": 0,
        "default_product_sales_discount": 0,
        "default_product_tax_rate": 0,
        "product_id_column": "serial_and_barcode",
        "mark_orders_after_export": True,
    },
    "soren": {
        "enabled": False,
        "customer_id_start": 1,
        "product_id_start": 1,
        "order_prefix": "",
        "customer_id_width": 6,
        "product_id_width": 10,
        "default_customer_account_prefix": "102001",
        "default_product_group_code": "001",
        "default_tax_code": "",
        "default_tax_unit_code": "",
        "default_unit_code": "01",
        "mark_orders_after_export": True,
    },
}


def default_system_notification_role_categories() -> dict[str, dict[str, bool]]:
    cats = SYSTEM_NOTIFICATION_CATEGORY_KEYS
    return {
        "admin": {key: True for key in cats},
        "sales_manager": {
            "product_inventory": True,
            "product_pricing": True,
            "orders_attention": True,
            "messages_attention": True,
            "customers_attention": True,
            "backup": False,
            "account_security": True,
            "admin_management": False,
            "invoice_settings": True,
            "accounting_sync": False,
        },
        "sales": {
            "product_inventory": True,
            "product_pricing": False,
            "orders_attention": True,
            "messages_attention": True,
            "customers_attention": True,
            "backup": False,
            "account_security": True,
            "admin_management": False,
            "invoice_settings": False,
            "accounting_sync": False,
        },
        "accountant": {
            "product_inventory": False,
            "product_pricing": False,
            "orders_attention": True,
            "messages_attention": False,
            "customers_attention": False,
            "backup": False,
            "account_security": True,
            "admin_management": False,
            "invoice_settings": True,
            "accounting_sync": True,
        },
    }


DEFAULT_NOTIFICATION_SETTINGS: dict[str, Any] = {
    "categories": SYSTEM_NOTIFICATION_CATEGORY_KEYS,
    "category_labels": SYSTEM_NOTIFICATION_CATEGORY_LABELS,
    "roles": SYSTEM_NOTIFICATION_ROLE_ORDER,
    "role_labels": SYSTEM_NOTIFICATION_ROLE_LABELS,
    "role_categories": default_system_notification_role_categories(),
}


def deep_merge(default: Any, override: Any) -> Any:
    if not isinstance(default, dict):
        return copy.deepcopy(override if override is not None else default)

    result = copy.deepcopy(default)

    if not isinstance(override, dict):
        return result

    for key, value in override.items():
        if isinstance(result.get(key), dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = copy.deepcopy(value)

    return result


def _default_for_key(setting_key: str) -> dict[str, Any]:
    if setting_key == ACCOUNTING_SETTING_KEY:
        return copy.deepcopy(DEFAULT_ACCOUNTING_SETTINGS)

    if setting_key == NOTIFICATION_SETTING_KEY:
        return copy.deepcopy(DEFAULT_NOTIFICATION_SETTINGS)

    return {}


def _parse_json(value_json: str | None) -> dict[str, Any]:
    try:
        parsed = json.loads(value_json or "{}")
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def get_company_setting(
    db: Session,
    current_user: Any,
    setting_key: str,
) -> dict[str, Any]:
    company_id = get_company_scope_id(current_user)
    row = (
        db.query(CompanySetting)
        .filter(
            CompanySetting.company_id == company_id,
            CompanySetting.setting_key == setting_key,
        )
        .first()
    )

    saved = _parse_json(row.value_json if row else None)
    return deep_merge(_default_for_key(setting_key), saved)


def save_company_setting(
    db: Session,
    current_user: Any,
    setting_key: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    company_id = get_company_scope_id(current_user)
    merged = deep_merge(_default_for_key(setting_key), payload or {})

    row = (
        db.query(CompanySetting)
        .filter(
            CompanySetting.company_id == company_id,
            CompanySetting.setting_key == setting_key,
        )
        .first()
    )

    if row is None:
        row = CompanySetting(
            company_id=company_id,
            setting_key=setting_key,
            value_json="{}",
            updated_by=getattr(current_user, "id", None),
        )
        db.add(row)

    row.value_json = json.dumps(merged, ensure_ascii=False)
    row.updated_by = getattr(current_user, "id", None)
    row.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(row)

    return merged


def normalize_accounting_settings(payload: dict[str, Any]) -> dict[str, Any]:
    settings = deep_merge(DEFAULT_ACCOUNTING_SETTINGS, payload or {})
    provider = str(settings.get("provider") or "").strip().lower()

    if provider not in {ASAN_PROVIDER_KEY, SOREN_PROVIDER_KEY}:
        provider = ""

    settings["provider"] = provider

    asan_enabled = bool(settings.get("asan", {}).get("enabled", False))
    soren_enabled = bool(settings.get("soren", {}).get("enabled", False))

    if provider == ASAN_PROVIDER_KEY and asan_enabled:
        settings["soren"]["enabled"] = False
    elif provider == SOREN_PROVIDER_KEY and soren_enabled:
        settings["asan"]["enabled"] = False
    elif asan_enabled and not soren_enabled:
        settings["provider"] = ASAN_PROVIDER_KEY
    elif soren_enabled and not asan_enabled:
        settings["provider"] = SOREN_PROVIDER_KEY
        settings["asan"]["enabled"] = False
    else:
        settings["provider"] = ""
        settings["asan"]["enabled"] = False
        settings["soren"]["enabled"] = False

    return settings


def normalize_notification_settings(payload: dict[str, Any]) -> dict[str, Any]:
    settings = deep_merge(DEFAULT_NOTIFICATION_SETTINGS, payload or {})
    defaults = default_system_notification_role_categories()
    saved = settings.get("role_categories") if isinstance(settings.get("role_categories"), dict) else {}
    clean: dict[str, dict[str, bool]] = {}

    for role in SYSTEM_NOTIFICATION_ROLE_ORDER:
        role_defaults = defaults.get(role, {})
        clean[role] = {}

        for category in SYSTEM_NOTIFICATION_CATEGORY_KEYS:
            clean[role][category] = bool(
                saved.get(role, {}).get(category, role_defaults.get(category, False))
            )

    settings["categories"] = SYSTEM_NOTIFICATION_CATEGORY_KEYS
    settings["category_labels"] = SYSTEM_NOTIFICATION_CATEGORY_LABELS
    settings["roles"] = SYSTEM_NOTIFICATION_ROLE_ORDER
    settings["role_labels"] = SYSTEM_NOTIFICATION_ROLE_LABELS
    settings["role_categories"] = clean

    return settings
