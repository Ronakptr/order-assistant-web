from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.company_scope import get_company_scope_id


ACTIVITY_COLUMNS = {
    "id": "INTEGER PRIMARY KEY AUTOINCREMENT",
    "company_id": "INTEGER",
    "user_id": "INTEGER",
    "username": "TEXT",
    "role": "TEXT",
    "method": "TEXT",
    "path": "TEXT",
    "action_type": "TEXT",
    "title": "TEXT",
    "description": "TEXT",
    "entity_type": "TEXT",
    "entity_id": "TEXT",
    "target_user_id": "INTEGER",
    "target_username": "TEXT",
    "target_role": "TEXT",
    "status_code": "INTEGER",
    "metadata_json": "TEXT",
    "created_at": "TEXT",
}


def ensure_activity_logs_table(db: Session) -> None:
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER,
                user_id INTEGER,
                username TEXT,
                role TEXT,
                method TEXT,
                path TEXT,
                action_type TEXT,
                title TEXT,
                description TEXT,
                entity_type TEXT,
                entity_id TEXT,
                target_user_id INTEGER,
                target_username TEXT,
                target_role TEXT,
                status_code INTEGER,
                metadata_json TEXT,
                created_at TEXT
            )
            """
        )
    )

    existing_columns = {
        row[1]
        for row in db.execute(text("PRAGMA table_info(activity_logs)")).fetchall()
    }

    for column_name, column_definition in ACTIVITY_COLUMNS.items():
        if column_name not in existing_columns:
            db.execute(
                text(
                    f"ALTER TABLE activity_logs ADD COLUMN {column_name} {column_definition}"
                )
            )

    db.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_activity_logs_company_id ON activity_logs(company_id)"
        )
    )
    db.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_activity_logs_user_id ON activity_logs(user_id)"
        )
    )
    db.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_activity_logs_created_at ON activity_logs(created_at)"
        )
    )


def normalize_path(path: str) -> str:
    return "/" + str(path or "").strip("/")


def get_entity_type(path: str) -> str:
    path = normalize_path(path)

    if path.startswith("/auth"):
        return "auth"
    if path.startswith("/orders"):
        return "order"
    if path.startswith("/customers"):
        return "customer"
    if path.startswith("/products"):
        return "product"
    if path.startswith("/users"):
        return "user"
    if path.startswith("/messages"):
        return "message"
    if path.startswith("/settings"):
        return "settings"
    if path.startswith("/dashboard"):
        return "dashboard"

    return "general"


def get_entity_id_from_path(path: str) -> str | None:
    parts = [part for part in normalize_path(path).split("/") if part]

    if len(parts) >= 2 and parts[1].isdigit():
        return parts[1]

    return None


def get_body_value(body: dict[str, Any], *keys: str, default: Any = None) -> Any:
    for key in keys:
        if key in body and body.get(key) not in [None, ""]:
            return body.get(key)

    return default


def get_action_info(
    *,
    method: str,
    path: str,
    body: dict[str, Any],
    status_code: int,
) -> tuple[str, str, str]:
    path = normalize_path(path)
    method = method.upper()
    entity_type = get_entity_type(path)
    successful = 200 <= int(status_code or 0) < 400

    if path == "/auth/login":
        if successful:
            return "login", "ورود کاربر", "کاربر وارد حساب شد"
        return "login_failed", "ورود ناموفق", "تلاش ورود ناموفق انجام شد"

    if path == "/auth/register":
        if successful:
            return "register", "ثبت‌نام شرکت", "ثبت‌نام شرکت/مدیر انجام شد"
        return "register_failed", "ثبت‌نام ناموفق", "تلاش ثبت‌نام ناموفق انجام شد"

    if path == "/activity-logs/logout":
        return "logout", "خروج کاربر", "کاربر از حساب خارج شد"

    labels = {
        "order": "سفارش",
        "customer": "مشتری",
        "product": "محصول",
        "user": "کاربر",
        "message": "پیام",
        "settings": "تنظیمات",
        "dashboard": "داشبورد",
        "general": "اطلاعات",
    }

    label = labels.get(entity_type, "اطلاعات")

    if method == "POST":
        return f"{entity_type}_create", f"ثبت {label}", f"{label} جدید ثبت شد"

    if method in {"PUT", "PATCH"}:
        return f"{entity_type}_update", f"ویرایش {label}", f"{label} ویرایش شد"

    if method == "DELETE":
        return f"{entity_type}_delete", f"حذف {label}", f"{label} حذف شد"

    return "general", "فعالیت", "یک فعالیت ثبت شد"


def get_target_info(body: dict[str, Any], entity_type: str) -> tuple[int | None, str, str]:
    if entity_type != "user":
        return None, "", ""

    target_id = get_body_value(body, "id", "user_id", "userId", default=None)
    target_name = get_body_value(
        body,
        "full_name",
        "fullName",
        "name",
        "username",
        default="",
    )
    target_role = get_body_value(body, "role", default="")

    try:
        target_id = int(target_id) if target_id is not None else None
    except Exception:
        target_id = None

    return target_id, str(target_name or ""), str(target_role or "")


def create_activity_log(
    db: Session,
    *,
    current_user: Any | None,
    method: str,
    path: str,
    status_code: int = 200,
    body: dict[str, Any] | None = None,
    title: str | None = None,
    description: str | None = None,
    action_type: str | None = None,
    entity_type: str | None = None,
    entity_id: str | int | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    ensure_activity_logs_table(db)

    body = body if isinstance(body, dict) else {}
    path = normalize_path(path)
    method = method.upper()
    resolved_entity_type = entity_type or get_entity_type(path)

    resolved_action_type, resolved_title, resolved_description = get_action_info(
        method=method,
        path=path,
        body=body,
        status_code=status_code,
    )

    target_user_id, target_username, target_role = get_target_info(
        body,
        resolved_entity_type,
    )

    company_id = None
    user_id = None
    username = ""
    role = ""

    if current_user is not None:
        company_id = get_company_scope_id(current_user)
        user_id = getattr(current_user, "id", None)
        username = str(getattr(current_user, "username", "") or "")
        role = str(getattr(current_user, "role", "") or "")

    db.execute(
        text(
            """
            INSERT INTO activity_logs (
                company_id,
                user_id,
                username,
                role,
                method,
                path,
                action_type,
                title,
                description,
                entity_type,
                entity_id,
                target_user_id,
                target_username,
                target_role,
                status_code,
                metadata_json,
                created_at
            )
            VALUES (
                :company_id,
                :user_id,
                :username,
                :role,
                :method,
                :path,
                :action_type,
                :title,
                :description,
                :entity_type,
                :entity_id,
                :target_user_id,
                :target_username,
                :target_role,
                :status_code,
                :metadata_json,
                :created_at
            )
            """
        ),
        {
            "company_id": company_id,
            "user_id": user_id,
            "username": username,
            "role": role,
            "method": method,
            "path": path,
            "action_type": action_type or resolved_action_type,
            "title": title or resolved_title,
            "description": description or resolved_description,
            "entity_type": resolved_entity_type,
            "entity_id": str(entity_id if entity_id is not None else get_entity_id_from_path(path) or ""),
            "target_user_id": target_user_id,
            "target_username": target_username,
            "target_role": target_role,
            "status_code": int(status_code or 0),
            "metadata_json": json.dumps(metadata or {}, ensure_ascii=False),
            "created_at": datetime.utcnow().isoformat(),
        },
    )


def list_company_activity_logs(
    db: Session,
    *,
    company_id: int,
    limit: int = 300,
) -> list[dict[str, Any]]:
    ensure_activity_logs_table(db)

    rows = db.execute(
        text(
            """
            SELECT *
            FROM activity_logs
            WHERE company_id = :company_id
            ORDER BY id DESC
            LIMIT :limit
            """
        ),
        {"company_id": company_id, "limit": int(limit)},
    ).mappings().all()

    return [dict(row) for row in rows]


def list_company_activity_logs_by_user(
    db: Session,
    *,
    company_id: int,
    user_id: int,
    limit: int = 300,
) -> list[dict[str, Any]]:
    ensure_activity_logs_table(db)

    rows = db.execute(
        text(
            """
            SELECT *
            FROM activity_logs
            WHERE company_id = :company_id
              AND (
                user_id = :user_id
                OR target_user_id = :user_id
              )
            ORDER BY id DESC
            LIMIT :limit
            """
        ),
        {
            "company_id": company_id,
            "user_id": int(user_id),
            "limit": int(limit),
        },
    ).mappings().all()

    return [dict(row) for row in rows]