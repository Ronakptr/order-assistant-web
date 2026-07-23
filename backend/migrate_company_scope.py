from app.database import engine


TABLES_TO_SCOPE = [
    "customers",
    "products",
    "orders",
    "messages",
]


def get_columns(cursor, table_name):
    cursor.execute(f"PRAGMA table_info({table_name})")
    return [row[1] for row in cursor.fetchall()]


def table_exists(cursor, table_name):
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (table_name,),
    )
    return cursor.fetchone() is not None


def get_default_company_id(cursor):
    cursor.execute(
        """
        SELECT id
        FROM users
        WHERE role IN ('admin', 'مدیر', 'مدير', 'ادمین', 'ادمين')
        ORDER BY id ASC
        LIMIT 1
        """
    )
    row = cursor.fetchone()

    if row:
        return row[0]

    cursor.execute("SELECT id FROM users ORDER BY id ASC LIMIT 1")
    row = cursor.fetchone()

    return row[0] if row else None


def ensure_company_id_on_users(cursor):
    if not table_exists(cursor, "users"):
        return

    columns = get_columns(cursor, "users")

    if "company_id" not in columns:
        print("Adding users.company_id ...")
        cursor.execute("ALTER TABLE users ADD COLUMN company_id INTEGER")

    cursor.execute(
        """
        UPDATE users
        SET company_id = id
        WHERE company_id IS NULL
          AND role IN ('admin', 'مدیر', 'مدير', 'ادمین', 'ادمين')
        """
    )

    cursor.execute(
        """
        UPDATE users
        SET company_id = (
            SELECT id
            FROM users AS admins
            WHERE admins.role IN ('admin', 'مدیر', 'مدير', 'ادمین', 'ادمين')
            ORDER BY admins.id ASC
            LIMIT 1
        )
        WHERE company_id IS NULL
        """
    )

    try:
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS ix_users_company_id ON users(company_id)"
        )
    except Exception as exc:
        print("Index users.company_id skipped:", exc)


def ensure_company_id_on_business_tables(cursor, default_company_id):
    if default_company_id is None:
        print("No default company found. Skipping business table migration.")
        return

    for table_name in TABLES_TO_SCOPE:
        if not table_exists(cursor, table_name):
            print(f"Table {table_name} does not exist. Skipped.")
            continue

        columns = get_columns(cursor, table_name)

        if "company_id" not in columns:
            print(f"Adding {table_name}.company_id ...")
            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN company_id INTEGER")

        print(f"Backfilling {table_name}.company_id ...")
        cursor.execute(
            f"""
            UPDATE {table_name}
            SET company_id = ?
            WHERE company_id IS NULL
            """,
            (default_company_id,),
        )

        try:
            cursor.execute(
                f"CREATE INDEX IF NOT EXISTS ix_{table_name}_company_id ON {table_name}(company_id)"
            )
        except Exception as exc:
            print(f"Index {table_name}.company_id skipped:", exc)


def main():
    raw_connection = engine.raw_connection()

    try:
        cursor = raw_connection.cursor()

        ensure_company_id_on_users(cursor)
        default_company_id = get_default_company_id(cursor)

        print("DEFAULT COMPANY ID:", default_company_id)

        ensure_company_id_on_business_tables(cursor, default_company_id)

        raw_connection.commit()

        print("COMPANY SCOPE MIGRATION DONE")

    finally:
        raw_connection.close()


if __name__ == "__main__":
    main()