from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import Base, engine
from app.database_migrations import ensure_database_schema
from app.middleware.activity_logger import ActivityLoggerMiddleware
from app.models import *  # noqa: F403,F401
from app.routers import (
    auth,
    customers,
    messages,
    orders,
    products,
    users,
    dashboard,
    activity_logs,
)


def _optional_router(module_name: str):
    try:
        module = __import__(f"app.routers.{module_name}", fromlist=["router"])
        return getattr(module, "router", None)
    except Exception:
        return None


settings_accounting_router = _optional_router("settings_accounting")
settings_notifications_router = _optional_router("settings_notifications")
accounting_sync_router = _optional_router("accounting_sync")
settings_messages_router = _optional_router("settings_messages")


Base.metadata.create_all(bind=engine)
ensure_database_schema()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

app.add_middleware(ActivityLoggerMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in settings.FRONTEND_ORIGINS.split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(users.router)
app.include_router(messages.router)
app.include_router(dashboard.router)
app.include_router(activity_logs.router)

if settings_accounting_router is not None:
    app.include_router(settings_accounting_router)

if settings_notifications_router is not None:
    app.include_router(settings_notifications_router)

if accounting_sync_router is not None:
    app.include_router(accounting_sync_router)

if settings_messages_router is not None:
    app.include_router(settings_messages_router)


@app.get("/")
def root():
    return {
        "message": "Order Assistant backend is running",
        "version": settings.APP_VERSION,
    }


@app.get("/health")
def health():
    return {"status": "ok"}
