from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=6, max_length=128)
    full_name: str | None = None
    email: str | None = None
    role: str = "user"


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    company_id: int | None = None
    username: str
    full_name: str | None = None
    email: str | None = None
    role: str
    is_active: bool

    model_config = {"from_attributes": True}


class TokenUser(BaseModel):
    id: int
    company_id: int | None = None
    username: str
    full_name: str | None = None
    email: str | None = None
    role: str
    is_active: bool

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: TokenUser