from datetime import datetime

from app.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password


def set_field_if_exists(obj, field_name, value):
    if hasattr(obj, field_name):
        setattr(obj, field_name, value)


def main():
    db = SessionLocal()

    try:
        admin = db.query(User).filter(User.username == "admin").first()

        if not admin:
            admin = User(
                username="admin",
                full_name="Admin",
                email="admin@example.com",
                role="admin",
                hashed_password=hash_password("admin123"),
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        admin.role = "admin"
        admin.is_active = True
        admin.company_id = admin.id
        admin.hashed_password = hash_password("admin123")
        set_field_if_exists(admin, "updated_at", datetime.utcnow())

        db.commit()
        db.refresh(admin)

        print("ADMIN ACTIVATED")
        print("USERNAME:", admin.username)
        print("PASSWORD:", "admin123")
        print("ROLE:", admin.role)
        print("COMPANY_ID:", admin.company_id)
        print("IS_ACTIVE:", admin.is_active)

    finally:
        db.close()


if __name__ == "__main__":
    main()