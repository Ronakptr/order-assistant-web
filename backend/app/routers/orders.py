from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.order import OrderCreate, OrderOut, OrderUpdate
from app.services.order_service import (
    create_order,
    delete_order,
    get_order,
    list_orders,
    order_to_out,
    update_order,
)


router = APIRouter(prefix="/orders", tags=["Orders"])


def get_current_company_id(current_user: User) -> int:
    return int(current_user.company_id or current_user.id)


@router.get("/", response_model=list[OrderOut])
def get_orders(
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_id = get_current_company_id(current_user)
    return list_orders(db, owner_id=company_id, search=search)


@router.get("/{order_id}", response_model=OrderOut)
def get_order_by_id(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_id = get_current_company_id(current_user)

    order = get_order(db, order_id, owner_id=company_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return order_to_out(order)


@router.post("/", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def add_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_id = get_current_company_id(current_user)
    return create_order(db, order_data, owner_id=company_id)


@router.put("/{order_id}", response_model=OrderOut)
def edit_order(
    order_id: str,
    order_data: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_id = get_current_company_id(current_user)

    order = get_order(db, order_id, owner_id=company_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return update_order(db, order, order_data, owner_id=company_id)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_id = get_current_company_id(current_user)

    order = get_order(db, order_id, owner_id=company_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    delete_order(db, order)
    return None