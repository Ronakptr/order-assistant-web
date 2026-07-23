from __future__ import annotations

from typing import Any


def get_company_scope_id(current_user: Any) -> int:
    """
    شناسه شرکت جاری.

    برای مدیر شرکت:
      company_id معمولاً برابر id خودش است.
    برای کاربر داخلی شرکت:
      company_id باید برابر id مدیر/شرکت باشد.
    """
    company_id = getattr(current_user, "company_id", None)
    user_id = getattr(current_user, "id", None)

    if company_id:
        return int(company_id)

    return int(user_id or 1)


def is_admin_user(current_user: Any) -> bool:
    role = str(getattr(current_user, "role", "") or "").strip().lower()
    return role in {
        "admin",
        "administrator",
        "owner",
        "manager",
        "مدیر",
        "مدير",
        "ادمین",
        "ادمين",
    }