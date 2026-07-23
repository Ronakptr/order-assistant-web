from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    product_code: str | None = None
    name: str = Field(min_length=1, max_length=200)

    default_sale_price: str | None = None
    base_price: str | None = None
    unit_price: str | None = None
    price: float = 0

    factory_purchase_price: str | None = None
    remaining_stock: str | None = None
    warning_stock: str | None = None
    sale_price: str | None = None

    category: str | None = None
    unit: str | None = None
    stock_quantity: float = 0
    pricing_basis: str | None = None
    quantity_method: str | None = None
    description: str | None = None

    accounting_software: str | None = None
    accounting_id: str | None = None
    oa_internal_code: str | None = None

    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    product_code: str | None = None
    name: str | None = None

    default_sale_price: str | None = None
    base_price: str | None = None
    unit_price: str | None = None
    price: float | None = None

    factory_purchase_price: str | None = None
    remaining_stock: str | None = None
    warning_stock: str | None = None
    sale_price: str | None = None

    category: str | None = None
    unit: str | None = None
    stock_quantity: float | None = None
    pricing_basis: str | None = None
    quantity_method: str | None = None
    description: str | None = None

    accounting_software: str | None = None
    accounting_id: str | None = None
    oa_internal_code: str | None = None

    is_active: bool | None = None


class ProductOut(ProductBase):
    id: int

    model_config = {"from_attributes": True}
