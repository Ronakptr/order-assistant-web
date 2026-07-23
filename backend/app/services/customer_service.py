from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate
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


def list_customers(
    db: Session,
    search: str | None = None,
    current_user: Any | None = None,
) -> list[Customer]:
    query = db.query(Customer)
    query = apply_company_scope(query, Customer, current_user)

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            Customer.name.ilike(pattern)
            | Customer.phone.ilike(pattern)
            | Customer.customer_code.ilike(pattern)
            | Customer.oa_internal_code.ilike(pattern)
        )

    return query.order_by(Customer.id.desc()).all()


def get_customer(
    db: Session,
    customer_id: int,
    current_user: Any | None = None,
) -> Customer | None:
    query = db.query(Customer).filter(Customer.id == customer_id)
    query = apply_company_scope(query, Customer, current_user)
    return query.first()


def get_customer_by_code(
    db: Session,
    customer_code: str,
    current_user: Any | None = None,
) -> Customer | None:
    query = db.query(Customer).filter(Customer.customer_code == customer_code)
    query = apply_company_scope(query, Customer, current_user)
    return query.first()


def get_customer_by_oa_code(
    db: Session,
    oa_internal_code: str,
    current_user: Any | None = None,
) -> Customer | None:
    query = db.query(Customer).filter(Customer.oa_internal_code == oa_internal_code)
    query = apply_company_scope(query, Customer, current_user)
    return query.first()


def create_customer(
    db: Session,
    customer_data: CustomerCreate,
    current_user: Any | None = None,
) -> Customer:
    customer = Customer(
        **customer_data.model_dump(),
        updated_at=datetime.utcnow(),
    )

    set_company_scope_fields(customer, current_user)

    db.add(customer)
    db.commit()
    db.refresh(customer)

    return customer


def update_customer(
    db: Session,
    customer: Customer,
    customer_data: CustomerUpdate,
) -> Customer:
    update_data = customer_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(customer, field, value)

    customer.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(customer)

    return customer


def delete_customer(db: Session, customer: Customer) -> None:
    db.delete(customer)
    db.commit()