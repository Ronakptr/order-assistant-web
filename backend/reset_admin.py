from datetime import datetime

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.core.security import hash_password

try:
    from app.database_migrations import ensure_database_schema
except Exception:
    ensure_database_schema = None


def set_field_if_exists(obj, field_name, value):
    if hasattr(obj, field_name):
        setattr(obj, field_name, value)


def main():
    Base.metadata.create_all(bind=engine)

    if ensure_database_schema:
        try:
            ensure_database_schema()
        except Exception as exc:
            print("Migration warning:", exc)

    db = SessionLocal()

    try:
        username = "admin"
        password = "admin123"

        user = db.query(User).filter(User.username == username).first()

        if user:
            user.hashed_password = hash_password(password)
            user.role = "admin"
            user.is_active = True
            set_field_if_exists(user, "updated_at", datetime.utcnow())
            print("Admin user password was reset.")
        else:
            user = User(
                username=username,
                full_name="Admin",
                role="admin",
                hashed_password=hash_password(password),
                is_active=True,
            )

            set_field_if_exists(user, "email", "admin@example.com")
            set_field_if_exists(user, "created_at", datetime.utcnow())
            set_field_if_exists(user, "updated_at", datetime.utcnow())

            db.add(user)
            print("Admin user was created.")

        db.commit()

        print("USERNAME:", username)
        print("PASSWORD:", password)

    finally:
        db.close()


if __name__ == "__main__":
    main()
