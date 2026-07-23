from datetime import datetime

from pydantic import BaseModel, Field


class ManagedUserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=6, max_length=128)

    full_name: str | None = None
    name: str | None = None
    email: str | None = None

    role: str = "sales"

    is_active: bool | None = True
    active: bool | None = None
    isActive: bool | None = None
    status: str | None = None


class ManagedUserUpdate(BaseModel):
    username: str | None = None
    full_name: str | None = None
    name: str | None = None
    email: str | None = None
    role: str | None = None

    is_active: bool | None = None
    active: bool | None = None
    isActive: bool | None = None
    status: str | None = None


class ManagedUserPasswordUpdate(BaseModel):
    password: str = Field(min_length=6, max_length=128)


class ManagedUserOut(BaseModel):
    id: int
    uid: int | None = None

    company_id: int | None = None

    username: str
    full_name: str | None = None
    name: str | None = None
    email: str | None = None

    role: str = "user"
    role_label: str | None = None

    is_active: bool = True
    active: bool | None = None
    isActive: bool | None = None

    status: str | None = None
    status_label: str | None = None

    isCurrentUser: bool = False

    created_at: datetime | str | None = None
    updated_at: datetime | str | None = None

    model_config = {"from_attributes": True}