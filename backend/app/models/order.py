from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        UniqueConstraint("owner_id", "code", name="uq_orders_owner_code"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )

    code: Mapped[str] = mapped_column(String, index=True, nullable=False)

    customer_name: Mapped[str] = mapped_column(String, index=True, nullable=False)
    customer_phone: Mapped[str | None] = mapped_column(String, nullable=True)
    customer_quality: Mapped[str | None] = mapped_column(String, nullable=True)

    status: Mapped[str] = mapped_column(String, default="ثبت شده")
    order_date_text: Mapped[str | None] = mapped_column(String, nullable=True)
    order_date_input: Mapped[str | None] = mapped_column(String, nullable=True)

    invoice_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    total_text: Mapped[str | None] = mapped_column(String, nullable=True)
    total_raw: Mapped[float] = mapped_column(Float, default=0)
    prepayment_text: Mapped[str | None] = mapped_column(String, nullable=True)
    prepayment_raw: Mapped[float] = mapped_column(Float, default=0)
    remaining_text: Mapped[str | None] = mapped_column(String, nullable=True)
    remaining_raw: Mapped[float] = mapped_column(Float, default=0)

    accounting_software: Mapped[str | None] = mapped_column(String, nullable=True)
    accounting_id: Mapped[str | None] = mapped_column(String, nullable=True)
    accounting_exported_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    accounting_export_batch: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    owner = relationship("User")

    items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="OrderItem.sort_order",
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    line_uid: Mapped[str | None] = mapped_column(String, nullable=True)
    product_name: Mapped[str] = mapped_column(String, nullable=False)

    quantity_method: Mapped[str | None] = mapped_column(String, nullable=True)
    quantity_value_raw: Mapped[str | None] = mapped_column(String, nullable=True)
    add_quantity_method: Mapped[str | None] = mapped_column(String, nullable=True)
    add_quantity_raw: Mapped[str | None] = mapped_column(String, nullable=True)
    final_quantity_raw: Mapped[str | None] = mapped_column(String, nullable=True)

    quantity_number: Mapped[float] = mapped_column(Float, default=0)
    quantity_text: Mapped[str | None] = mapped_column(String, nullable=True)
    count_display: Mapped[str | None] = mapped_column(String, nullable=True)
    weight: Mapped[str | None] = mapped_column(String, nullable=True)
    length: Mapped[str | None] = mapped_column(String, nullable=True)

    unit_price_raw: Mapped[str | None] = mapped_column(String, nullable=True)
    unit_price_text: Mapped[str | None] = mapped_column(String, nullable=True)
    total_text: Mapped[str | None] = mapped_column(String, nullable=True)
    total_raw: Mapped[float] = mapped_column(Float, default=0)

    specs: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    order: Mapped[Order] = relationship("Order", back_populates="items")