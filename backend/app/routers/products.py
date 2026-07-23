from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.services.product_service import (
    create_product,
    delete_product,
    get_product,
    get_product_by_code,
    list_products,
    update_product,
)


router = APIRouter(prefix="/products", tags=["Products"])


@router.get("/", response_model=list[ProductOut])
def get_products(
    search: str | None = Query(default=None),
    active_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_products(
        db,
        search=search,
        current_user=current_user,
        active_only=active_only,
    )


@router.post("/", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def add_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if product_data.product_code:
        existing_product = get_product_by_code(
            db,
            product_data.product_code,
            current_user=current_user,
        )

        if existing_product:
            raise HTTPException(
                status_code=400,
                detail="کد محصول قبلاً ثبت شده است",
            )

    return create_product(
        db,
        product_data,
        current_user=current_user,
    )


@router.put("/{product_id}", response_model=ProductOut)
def edit_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = get_product(
        db,
        product_id,
        current_user=current_user,
    )

    if not product:
        raise HTTPException(status_code=404, detail="محصول پیدا نشد")

    if product_data.product_code and product_data.product_code != product.product_code:
        existing_product = get_product_by_code(
            db,
            product_data.product_code,
            current_user=current_user,
        )

        if existing_product:
            raise HTTPException(
                status_code=400,
                detail="کد محصول قبلاً ثبت شده است",
            )

    return update_product(db, product, product_data)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = get_product(
        db,
        product_id,
        current_user=current_user,
    )

    if not product:
        raise HTTPException(status_code=404, detail="محصول پیدا نشد")

    delete_product(db, product)

    return None