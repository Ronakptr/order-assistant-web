from __future__ import annotations

import copy
import json
import re
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.company_setting import CompanySetting

MESSAGE_SETTING_KEY = "message_settings"

# سه کانال اصلی صفحه تنظیمات پیام‌ها:
# - پیامک
# - پیامرسان: داخل خودش نوع ایرانی / خارجی و نام پیامرسان دارد.
# - ایمیل
MESSAGE_CHANNELS = ["sms", "messenger", "email"]

MESSAGE_CHANNEL_LABELS = {
    "sms": "پیامک",
    "messenger": "پیامرسان",
    "email": "ایمیل",
}

MESSENGER_TYPE_LABELS = {
    "iranian": "ایرانی",
    "foreign": "خارجی",
}

MESSENGER_OPTIONS = {
    "iranian": ["بله", "ایتا", "روبیکا", "سروش", "گپ", "آی‌گپ", "سایر"],
    "foreign": ["WhatsApp", "Telegram", "Instagram / Meta", "Facebook Messenger", "سایر"],
}

MESSAGE_TEMPLATE_VARIABLES = [
    "{نام_مشتری}",
    "{نام_محصول}",
    "{مبلغ}",
    "{تاریخ}",
    "{کد_سفارش}",
    "{شماره_تماس}",
    "{ایمیل}",
]

MESSAGE_TEMPLATE_CATEGORIES = [
    "خوش‌آمدگویی",
    "یادآوری سبد خرید",
    "تخفیف",
    "پیگیری فروش",
    "تبریک تولد",
    "اطلاع‌رسانی پرداخت",
    "پیگیری سفارش",
    "پیام دلخواه",
]

DEFAULT_MESSAGE_TEMPLATES = [
    {
        "id": "invoice-ready",
        "title": "صورتحساب آماده شد",
        "category": "اطلاع‌رسانی پرداخت",
        "channel": "sms",
        "body": "{نام_مشتری} عزیز، صورتحساب سفارش {کد_سفارش} آماده است. مبلغ کل: {مبلغ}.",
        "is_active": True,
    },
    {
        "id": "payment-followup",
        "title": "پیگیری پرداخت",
        "category": "پیگیری فروش",
        "channel": "sms",
        "body": "{نام_مشتری} عزیز، برای تکمیل سفارش {کد_سفارش} لطفاً وضعیت پرداخت را اعلام کنید.",
        "is_active": True,
    },
    {
        "id": "discount-offer",
        "title": "اعلام تخفیف",
        "category": "تخفیف",
        "channel": "messenger",
        "body": "{نام_مشتری} عزیز، برای محصول {نام_محصول} شرایط تخفیف ویژه فراهم شده است. جهت هماهنگی با واحد فروش در ارتباط باشید.",
        "is_active": True,
    },
    {
        "id": "birthday",
        "title": "تبریک تولد",
        "category": "تبریک تولد",
        "channel": "sms",
        "body": "{نام_مشتری} عزیز، تولدتان مبارک. برای شما آرزوی سلامتی و موفقیت داریم.",
        "is_active": True,
    },
]


def _default_channel(channel: str) -> dict[str, Any]:
    return {
        "enabled": channel == "sms",
        "provider_name": "",
        "api_key": "",
        "api_secret": "",
        "sender_id": "",
        "messenger_type": "iranian" if channel == "messenger" else "",
        "messenger_name": "بله" if channel == "messenger" else "",
        "test_status": "not_tested",
        "test_message": "تست اتصال انجام نشده است.",
        "tested_at": "",
    }


DEFAULT_MESSAGE_SETTINGS: dict[str, Any] = {
    "selected_channels": ["sms"],
    "channel_labels": MESSAGE_CHANNEL_LABELS,
    "messenger_type_labels": MESSENGER_TYPE_LABELS,
    "messenger_options": MESSENGER_OPTIONS,
    "channels": {channel: _default_channel(channel) for channel in MESSAGE_CHANNELS},
    "template_categories": MESSAGE_TEMPLATE_CATEGORIES,
    "template_variables": MESSAGE_TEMPLATE_VARIABLES,
    "templates": DEFAULT_MESSAGE_TEMPLATES,
}


def get_company_scope_id(current_user: Any) -> int:
    return int(getattr(current_user, "company_id", None) or getattr(current_user, "id"))


def deep_merge(default: Any, override: Any) -> Any:
    if isinstance(default, dict):
        result = copy.deepcopy(default)

        if not isinstance(override, dict):
            return result

        for key, value in override.items():
            if isinstance(result.get(key), dict) and isinstance(value, dict):
                result[key] = deep_merge(result[key], value)
            else:
                result[key] = copy.deepcopy(value)

        return result

    return copy.deepcopy(override if override is not None else default)


def _parse_json(value_json: str | None) -> dict[str, Any]:
    try:
        parsed = json.loads(value_json or "{}")
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _clean_text(value: Any, fallback: str = "") -> str:
    value = str(value or "").strip()
    return value if value else fallback


def _normalize_bool(value: Any) -> bool:
    return bool(value)


def _slug_from_title(title: str, fallback: str) -> str:
    base = re.sub(r"\s+", "-", str(title or "").strip().lower())
    base = re.sub(r"[^\w\-آ-ی۰-۹]", "", base, flags=re.UNICODE)
    return base or fallback


def _legacy_channel(value: Any) -> str:
    channel = _clean_text(value, "sms").lower()
    legacy_map = {
        "پیامک": "sms",
        "sms": "sms",
        "ایمیل": "email",
        "email": "email",
        "واتساپ": "messenger",
        "whatsapp": "messenger",
        "تلگرام": "messenger",
        "telegram": "messenger",
        "پیامرسان": "messenger",
        "messenger": "messenger",
        "پیام رسان": "messenger",
    }
    return legacy_map.get(channel, channel if channel in MESSAGE_CHANNELS else "sms")


def _normalize_messenger_type(value: Any) -> str:
    value = _clean_text(value, "iranian").lower()
    if value in {"ایرانی", "iran", "iranian", "داخلی"}:
        return "iranian"
    if value in {"خارجی", "foreign", "external", "international"}:
        return "foreign"
    return value if value in MESSENGER_OPTIONS else "iranian"


def _normalize_messenger_name(messenger_type: str, value: Any) -> str:
    options = MESSENGER_OPTIONS.get(messenger_type) or MESSENGER_OPTIONS["iranian"]
    name = _clean_text(value, options[0])
    return name if name in options else name


def _normalize_channel_config(channel: str, payload: dict[str, Any] | None) -> dict[str, Any]:
    default = _default_channel(channel)
    data = deep_merge(default, payload or {})

    status = str(data.get("test_status") or "not_tested").strip()
    if status not in {"not_tested", "success", "failed"}:
        status = "not_tested"

    messenger_type = _normalize_messenger_type(data.get("messenger_type")) if channel == "messenger" else ""

    return {
        "enabled": _normalize_bool(data.get("enabled")),
        "provider_name": _clean_text(data.get("provider_name")),
        "api_key": _clean_text(data.get("api_key")),
        "api_secret": _clean_text(data.get("api_secret")),
        "sender_id": _clean_text(data.get("sender_id")),
        "messenger_type": messenger_type,
        "messenger_name": _normalize_messenger_name(messenger_type, data.get("messenger_name")) if channel == "messenger" else "",
        "test_status": status,
        "test_message": _clean_text(data.get("test_message"), default["test_message"]),
        "tested_at": _clean_text(data.get("tested_at")),
    }


def _normalize_template(template: dict[str, Any], index: int) -> dict[str, Any]:
    title = _clean_text(template.get("title"), f"قالب پیام {index + 1}")
    channel = _legacy_channel(template.get("channel"))

    category = _clean_text(template.get("category"), "پیام دلخواه")
    body = _clean_text(template.get("body"))

    return {
        "id": _clean_text(template.get("id"), _slug_from_title(title, f"template-{index + 1}")),
        "title": title,
        "category": category,
        "channel": channel,
        "body": body,
        "is_active": bool(template.get("is_active", True)),
    }


def normalize_message_settings(payload: dict[str, Any] | None) -> dict[str, Any]:
    settings = deep_merge(DEFAULT_MESSAGE_SETTINGS, payload or {})

    raw_channels = settings.get("channels") or {}

    # سازگاری با نسخه قبلی: اگر تنظیمات واتساپ/تلگرام وجود داشت، داخل پیامرسان ادغام شود.
    legacy_messenger = {}
    for old_key, default_name in [("whatsapp", "WhatsApp"), ("telegram", "Telegram")]:
        old_config = raw_channels.get(old_key)
        if isinstance(old_config, dict) and old_config.get("enabled"):
            legacy_messenger = copy.deepcopy(old_config)
            legacy_messenger["messenger_type"] = "foreign"
            legacy_messenger["messenger_name"] = default_name
            break

    channels = {}
    selected_channels = []

    for channel in MESSAGE_CHANNELS:
        payload_config = raw_channels.get(channel)
        if channel == "messenger" and not payload_config and legacy_messenger:
            payload_config = legacy_messenger

        channels[channel] = _normalize_channel_config(channel, payload_config)
        if channels[channel]["enabled"]:
            selected_channels.append(channel)

    raw_selected = settings.get("selected_channels")
    if isinstance(raw_selected, list):
        selected_channels = []
        for channel in raw_selected:
            normalized = _legacy_channel(channel)
            if normalized in MESSAGE_CHANNELS and channels[normalized]["enabled"] and normalized not in selected_channels:
                selected_channels.append(normalized)

    if not selected_channels and channels["sms"]["enabled"]:
        selected_channels = ["sms"]

    raw_categories = settings.get("template_categories")
    categories = [
        _clean_text(category)
        for category in raw_categories
        if _clean_text(category)
    ] if isinstance(raw_categories, list) else MESSAGE_TEMPLATE_CATEGORIES

    if not categories:
        categories = MESSAGE_TEMPLATE_CATEGORIES

    seen_categories = []
    for category in categories:
        if category not in seen_categories:
            seen_categories.append(category)

    raw_templates = settings.get("templates")
    templates = [
        _normalize_template(template, index)
        for index, template in enumerate(raw_templates)
        if isinstance(template, dict)
    ] if isinstance(raw_templates, list) else copy.deepcopy(DEFAULT_MESSAGE_TEMPLATES)

    if not templates:
        templates = copy.deepcopy(DEFAULT_MESSAGE_TEMPLATES)

    return {
        "selected_channels": selected_channels,
        "channel_labels": MESSAGE_CHANNEL_LABELS,
        "messenger_type_labels": MESSENGER_TYPE_LABELS,
        "messenger_options": MESSENGER_OPTIONS,
        "channels": channels,
        "template_categories": seen_categories,
        "template_variables": MESSAGE_TEMPLATE_VARIABLES,
        "templates": templates,
    }


def get_message_settings(db: Session, current_user: Any) -> dict[str, Any]:
    company_id = get_company_scope_id(current_user)
    row = (
        db.query(CompanySetting)
        .filter(
            CompanySetting.company_id == company_id,
            CompanySetting.setting_key == MESSAGE_SETTING_KEY,
        )
        .first()
    )

    return normalize_message_settings(_parse_json(row.value_json if row else None))


def save_message_settings(
    db: Session,
    current_user: Any,
    payload: dict[str, Any] | None,
) -> dict[str, Any]:
    company_id = get_company_scope_id(current_user)
    normalized = normalize_message_settings(payload or {})

    row = (
        db.query(CompanySetting)
        .filter(
            CompanySetting.company_id == company_id,
            CompanySetting.setting_key == MESSAGE_SETTING_KEY,
        )
        .first()
    )

    if row is None:
        row = CompanySetting(
            company_id=company_id,
            setting_key=MESSAGE_SETTING_KEY,
            value_json="{}",
            updated_by=getattr(current_user, "id", None),
        )
        db.add(row)

    row.value_json = json.dumps(normalized, ensure_ascii=False)
    row.updated_by = getattr(current_user, "id", None)
    row.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(row)

    return normalized


def test_message_channel(
    db: Session,
    current_user: Any,
    channel: str,
    payload: dict[str, Any] | None,
) -> dict[str, Any]:
    channel = _legacy_channel(channel)

    if channel not in MESSAGE_CHANNELS:
        settings = get_message_settings(db, current_user)
        return {
            "ok": False,
            "channel": channel,
            "message": "کانال ارسال معتبر نیست.",
            "settings": settings,
        }

    settings = normalize_message_settings(payload or get_message_settings(db, current_user))
    channel_config = settings["channels"][channel]

    missing = []
    if not channel_config.get("enabled"):
        missing.append("فعال‌سازی کانال")
    if not channel_config.get("provider_name"):
        missing.append("نام سرویس‌دهنده")
    if not channel_config.get("api_key"):
        missing.append("API Key")
    if channel != "email" and not channel_config.get("sender_id"):
        missing.append("شماره خط ارسال / Sender ID")
    if channel == "messenger":
        if not channel_config.get("messenger_type"):
            missing.append("نوع پیامرسان")
        if not channel_config.get("messenger_name"):
            missing.append("نام پیامرسان")

    # در این مرحله، تست واقعی به سرویس‌دهنده خارجی ارسال نمی‌شود.
    # این endpoint اعتبارسنجی ساختار اتصال را انجام می‌دهد و آماده است در مرحله بعد
    # به API واقعی سرویس انتخابی متصل شود.
    now = datetime.utcnow().isoformat(timespec="seconds") + "Z"

    if missing:
        channel_config["test_status"] = "failed"
        channel_config["test_message"] = "موارد ناقص: " + "، ".join(missing)
        channel_config["tested_at"] = now
        ok = False
    else:
        channel_config["test_status"] = "success"
        channel_config["test_message"] = "تست ساختار اتصال موفق بود."
        channel_config["tested_at"] = now
        ok = True

    settings["channels"][channel] = channel_config
    saved = save_message_settings(db, current_user, settings)

    return {
        "ok": ok,
        "channel": channel,
        "message": channel_config["test_message"],
        "settings": saved,
    }
