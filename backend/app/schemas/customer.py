from pydantic import BaseModel, Field


class CustomerBase(BaseModel):
    customer_code: str | None = None
    oa_internal_code: str | None = None
    name: str = Field(min_length=1, max_length=200)
    phone: str | None = None
    quality: str | None = None
    source_type: str | None = None
    description: str | None = None
    accounting_software: str | None = None
    accounting_id: str | None = None
    is_active: bool = True


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    customer_code: str | None = None
    oa_internal_code: str | None = None
    name: str | None = None
    phone: str | None = None
    quality: str | None = None
    source_type: str | None = None
    description: str | None = None
    accounting_software: str | None = None
    accounting_id: str | None = None
    is_active: bool | None = None


class CustomerOut(CustomerBase):
    id: int

    model_config = {"from_attributes": True}
