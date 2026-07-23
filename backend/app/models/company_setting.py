from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CompanySetting(Base):
    __tablename__ = "company_settings"
    __table_args__ = (
        UniqueConstraint("company_id", "setting_key", name="uq_company_settings_company_key"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    setting_key: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    value_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    updated_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
