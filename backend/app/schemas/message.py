from pydantic import BaseModel


class MessageBase(BaseModel):
    message_code: str | None = None
    order_code: str | None = None
    invoice_code: str | None = None
    customer: str | None = None
    phone: str | None = None
    email: str | None = None
    items: list[dict] = []
    status: str = "پیش نویس"
    template: str | None = None
    channel: str | None = None
    preview: str | None = None


class MessageCreate(MessageBase):
    pass


class MessageUpdate(BaseModel):
    message_code: str | None = None
    order_code: str | None = None
    invoice_code: str | None = None
    customer: str | None = None
    phone: str | None = None
    email: str | None = None
    items: list[dict] | None = None
    status: str | None = None
    template: str | None = None
    channel: str | None = None
    preview: str | None = None


class MessageOut(MessageBase):
    id: str | int
    uid: str | int
    date: str

