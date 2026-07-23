from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.company_scope import get_company_scope_id


def get_model_columns(model: Any) -> set[str]:
    return {column.key for column in inspect(model).mapper.column_attrs}


def apply_company_scope(query, model: Any, current_user: Any | None):
    if current_user is None:
        return query

    columns = get_model_columns(model)
    scope_id = get_company_scope_id(current_user)

    if "owner_id" in columns:
        return query.filter(model.owner_id == scope_id)

    if "company_id" in columns:
        return query.filter(model.company_id == scope_id)

    return query


def set_company_scope_fields(instance: Any, current_user: Any | None) -> None:
    if current_user is None:
        return

    columns = get_model_columns(type(instance))
    scope_id = get_company_scope_id(current_user)

    if "owner_id" in columns:
        setattr(instance, "owner_id", scope_id)

    if "company_id" in columns:
        setattr(instance, "company_id", scope_id)


def list_products(
    db: Session,
    search: str | None = None,
    current_user: Any | None = None,
    active_only: bool = False,
) -> list[Product]:
    query = db.query(Product)

    query = apply_company_scope(query, Product, current_user)

    if active_only and "is_active" in get_model_columns(Product):
        query = query.filter(Product.is_active == True)

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            Product.name.ilike(pattern)
            | Product.product_code.ilike(pattern)
            | Product.sale_price.ilike(pattern)
        )

    return query.order_by(Product.id.desc()).all()


def get_product(
    db: Session,
    product_id: int,
    current_user: Any | None = None,
) -> Product | None:
    query = db.query(Product).filter(Product.id == product_id)
    query = apply_company_scope(query, Product, current_user)
    return query.first()


def get_product_by_code(
    db: Session,
    product_code: str,
    current_user: Any | None = None,
) -> Product | None:
    query = db.query(Product).filter(Product.product_code == product_code)
    query = apply_company_scope(query, Product, current_user)
    return query.first()


def create_product(
    db: Session,
    product_data: ProductCreate,
    current_user: Any | None = None,
) -> Product:
    product = Product(
        **product_data.model_dump(),
        updated_at=datetime.utcnow(),
    )

    set_company_scope_fields(product, current_user)

    db.add(product)
    db.commit()
    db.refresh(product)

    return product


def update_product(
    db: Session,
    product: Product,
    product_data: ProductUpdate,
) -> Product:
    update_data = product_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(product, field, value)

    product.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(product)

    return product


def delete_product(db: Session, product: Product) -> None:
    db.delete(product)
    db.commit()