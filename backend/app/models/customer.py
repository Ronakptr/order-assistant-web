from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (
        UniqueConstraint("owner_id", "customer_code", name="uq_customers_owner_customer_code"),
        UniqueConstraint("owner_id", "oa_internal_code", name="uq_customers_owner_oa_internal_code"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )

    customer_code: Mapped[str | None] = mapped_column(
        String,
        index=True,
        nullable=True,
    )

    oa_internal_code: Mapped[str | None] = mapped_column(
        String,
        index=True,
        nullable=True,
    )

    name: Mapped[str] = mapped_column(String, index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    quality: Mapped[str | None] = mapped_column(String, nullable=True)
    source_type: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    accounting_software: Mapped[str | None] = mapped_column(String, nullable=True)
    accounting_id: Mapped[str | None] = mapped_column(String, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    owner = relationship("User")