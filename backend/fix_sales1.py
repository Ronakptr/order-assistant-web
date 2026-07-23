from datetime import datetime

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.core.security import hash_password, verify_password


def set_field_if_exists(obj, field_name, value):
    if hasattr(obj, field_name):
        setattr(obj, field_name, value)


def main():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        admin = db.query(User).filter(User.username == "admin").first()

        if not admin:
            raise RuntimeError("admin user not found")

        admin.role = "admin"
        admin.company_id = admin.id
        admin.is_active = True
        set_field_if_exists(admin, "updated_at", datetime.utcnow())

        sales = db.query(User).filter(User.username == "sales1").first()

        if not sales:
            sales = User(
                username="sales1",
                full_name="Sales User",
                email="sales1@example.com",
                role="sales",
                hashed_password=hash_password("sales12345"),
                is_active=True,
                company_id=admin.id,
            )
            set_field_if_exists(sales, "created_at", datetime.utcnow())
            set_field_if_exists(sales, "updated_at", datetime.utcnow())
            db.add(sales)
        else:
            sales.username = "sales1"
            sales.full_name = sales.full_name or "Sales User"
            sales.role = "sales"
            sales.company_id = admin.id
            sales.is_active = True
            sales.hashed_password = hash_password("sales12345")
            set_field_if_exists(sales, "updated_at", datetime.utcnow())

        db.commit()
        db.refresh(admin)
        db.refresh(sales)

        print("ADMIN:", admin.id, admin.username, admin.role, admin.company_id, admin.is_active)
        print("SALES:", sales.id, sales.username, sales.role, sales.company_id, sales.is_active)
        print("PASSWORD_TEST:", verify_password("sales12345", sales.hashed_password))

    finally:
        db.close()


if __name__ == "__main__":
    main()