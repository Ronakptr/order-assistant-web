from pydantic import BaseModel, Field


class OrderItemBase(BaseModel):
    id: str | int | None = None
    name: str = Field(default="بدون نام")
    customer: str | None = None
    date: str | None = None
    quantityMethod: str | None = None
    quantityValueRaw: str | None = None
    addQuantityMethod: str | None = None
    addQuantityRaw: str | None = None
    finalQuantityRaw: str | None = None
    quantityNumber: float | int | str | None = 0
    quantity: str | None = None
    countDisplay: str | None = None
    weight: str | None = None
    length: str | None = None
    unitPriceRaw: str | None = None
    unitPrice: str | None = None
    total: str | None = None
    totalRaw: float | int | str | None = 0
    specs: str | None = None
    notes: str | None = None


class OrderBase(BaseModel):
    uid: str | int | str | None = None
    code: str | None = None
    customer: str = Field(default="بدون نام")
    phone: str | None = None
    customerQuality: str | None = None
    items: list[OrderItemBase] = []
    status: str | None = None
    orderStatus: str | None = None
    statusLabel: str | None = None
    date: str | None = None
    dateInputValue: str | None = None
    invoiceDescription: str | None = None
    total: str | None = None
    totalRaw: float | int | str | None = 0
    prepayment: str | None = None
    prepaymentRaw: float | int | str | None = 0
    remaining: str | None = None
    remainingRaw: float | int | str | None = 0


class OrderCreate(OrderBase):
    pass


class OrderUpdate(OrderBase):
    pass


class OrderOut(OrderBase):
    uid: str | int
    code: str

