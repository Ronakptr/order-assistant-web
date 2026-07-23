from __future__ import annotations

import json

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.security import decode_access_token
from app.database import SessionLocal
from app.models.user import User
from app.services.activity_log_service import create_activity_log, normalize_path


MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def safe_json_loads(raw_body: bytes) -> dict:
    if not raw_body:
        return {}

    try:
        value = json.loads(raw_body.decode("utf-8"))
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def get_bearer_token(request: Request) -> str | None:
    authorization = request.headers.get("authorization") or ""

    if not authorization.lower().startswith("bearer "):
        return None

    return authorization.split(" ", 1)[1].strip()


def get_user_from_token(db, request: Request) -> User | None:
    token = get_bearer_token(request)

    if not token:
        return None

    payload = decode_access_token(token)

    if not payload:
        return None

    user_id = payload.get("user_id") or payload.get("id")

    if user_id is None:
        return None

    try:
        return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        return None


def get_user_from_login_or_register_body(db, body: dict) -> User | None:
    username = str(body.get("username") or body.get("email") or "").strip().lower()

    if not username:
        return None

    return db.query(User).filter(User.username == username).first()


def should_log_request(method: str, path: str) -> bool:
    method = method.upper()
    path = normalize_path(path)

    if path.startswith("/docs"):
        return False

    if path.startswith("/redoc"):
        return False

    if path.startswith("/openapi"):
        return False

    if path.startswith("/activity-logs") and path != "/activity-logs/logout":
        return False

    if method in MUTATING_METHODS:
        return True

    return False


class ActivityLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        raw_body = await request.body()
        body = safe_json_loads(raw_body)

        async def receive():
            return {
                "type": "http.request",
                "body": raw_body,
                "more_body": False,
            }

        request = Request(request.scope, receive)

        response = await call_next(request)

        if should_log_request(request.method, request.url.path):
            db = SessionLocal()

            try:
                current_user = get_user_from_token(db, request)

                if current_user is None and normalize_path(request.url.path) in {
                    "/auth/login",
                    "/auth/register",
                }:
                    current_user = get_user_from_login_or_register_body(db, body)

                create_activity_log(
                    db,
                    current_user=current_user,
                    method=request.method,
                    path=request.url.path,
                    status_code=response.status_code,
                    body=body,
                )

                db.commit()
            except Exception:
                db.rollback()
            finally:
                db.close()

        return response