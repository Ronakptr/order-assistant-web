from datetime import datetime

from app.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password


def set_field_if_exists(obj, field_name, value):
    if hasattr(obj, field_name):
        setattr(obj, field_name, value)


def upsert_user(
    db,
    username,
    password,
    full_name,
    email,
    role,
    is_active=True,
    company_id=None,
):
    user = db.query(User).filter(User.username == username).first()

    if not user:
        user = User(
            username=username,
            full_name=full_name,
            email=email,
            role=role,
            hashed_password=hash_password(password),
            is_active=is_active,
        )
        db.add(user)
        db.flush()
    else:
        user.full_name = full_name
        user.email = email
        user.role = role
        user.hashed_password = hash_password(password)
        user.is_active = is_active

    if company_id is not None:
        user.company_id = company_id

    set_field_if_exists(user, "updated_at", datetime.utcnow())

    if not getattr(user, "created_at", None):
        set_field_if_exists(user, "created_at", datetime.utcnow())

    db.flush()
    return user


def ensure_company_admin(db, username, password, full_name, email):
    admin = upsert_user(
        db=db,
        username=username,
        password=password,
        full_name=full_name,
        email=email,
        role="admin",
        is_active=True,
        company_id=None,
    )

    admin.company_id = admin.id
    db.flush()

    return admin


def main():
    db = SessionLocal()

    try:
        company_a_admin = ensure_company_admin(
            db=db,
            username="company_a_admin",
            password="alpha12345",
            full_name="مدیر شرکت آلفا",
            email="alpha_admin@example.com",
        )

        company_b_admin = ensure_company_admin(
            db=db,
            username="company_b_admin",
            password="beta12345",
            full_name="مدیر شرکت بتا",
            email="beta_admin@example.com",
        )

        company_a_sales = upsert_user(
            db=db,
            username="company_a_sales",
            password="alpha_sales123",
            full_name="فروشنده شرکت آلفا",
            email="alpha_sales@example.com",
            role="sales",
            is_active=True,
            company_id=company_a_admin.id,
        )

        company_a_accountant = upsert_user(
            db=db,
            username="company_a_accountant",
            password="alpha_acc123",
            full_name="حسابدار شرکت آلفا",
            email="alpha_accountant@example.com",
            role="accountant",
            is_active=True,
            company_id=company_a_admin.id,
        )

        company_b_sales = upsert_user(
            db=db,
            username="company_b_sales",
            password="beta_sales123",
            full_name="فروشنده شرکت بتا",
            email="beta_sales@example.com",
            role="sales",
            is_active=True,
            company_id=company_b_admin.id,
        )

        db.commit()

        users = [
            company_a_admin,
            company_a_sales,
            company_a_accountant,
            company_b_admin,
            company_b_sales,
        ]

        print("TEST USERS READY")
        print("-" * 60)

        for user in users:
            db.refresh(user)
            print(
                f"id={user.id} | username={user.username} | role={user.role} | "
                f"company_id={user.company_id} | active={user.is_active}"
            )

        print("-" * 60)
        print("LOGIN INFO:")
        print("company_a_admin / alpha12345")
        print("company_a_sales / alpha_sales123")
        print("company_a_accountant / alpha_acc123")
        print("company_b_admin / beta12345")
        print("company_b_sales / beta_sales123")

    finally:
        db.close()


if __name__ == "__main__":
    main()