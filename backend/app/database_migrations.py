from sqlalchemy import inspect, text

from app.database import engine


def _add_column_if_missing(table_name: str, column_name: str, column_definition: str) -> None:
    inspector = inspect(engine)
    existing_columns = {column["name"] for column in inspector.get_columns(table_name)}

    if column_name in existing_columns:
        return

    with engine.begin() as connection:
        connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"))


def _create_company_settings_table_if_missing(table_names: set[str]) -> None:
    if "company_settings" in table_names:
        return

    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS company_settings (
                    id INTEGER NOT NULL PRIMARY KEY,
                    company_id INTEGER NOT NULL,
                    setting_key VARCHAR(80) NOT NULL,
                    value_json TEXT NOT NULL DEFAULT '{}',
                    updated_by INTEGER,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_company_settings_company_key "
                "ON company_settings (company_id, setting_key)"
            )
        )
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_company_settings_company_id "
                "ON company_settings (company_id)"
            )
        )
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_company_settings_setting_key "
                "ON company_settings (setting_key)"
            )
        )

    table_names.add("company_settings")


def ensure_database_schema() -> None:
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    _create_company_settings_table_if_missing(table_names)

    if "users" in table_names:
        _add_column_if_missing("users", "email", "VARCHAR")
        _add_column_if_missing("users", "updated_at", "TIMESTAMP")
        _add_column_if_missing("users", "company_id", "INTEGER")

        with engine.begin() as connection:
            # Ù‡Ø± Ú©Ø§Ø±Ø¨Ø± Ù‚Ø¯ÛŒÙ…ÛŒ Ú©Ù‡ company_id Ù†Ø¯Ø§Ø±Ø¯ØŒ Ø¨Ù‡ Ø¹Ù†ÙˆØ§Ù† Ø´Ø±Ú©Øª Ù…Ø³ØªÙ‚Ù„ Ø®ÙˆØ¯Ø´ Ø¯Ø± Ù†Ø¸Ø± Ú¯Ø±ÙØªÙ‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯.
            connection.execute(text("UPDATE users SET company_id = id WHERE company_id IS NULL"))

    if "customers" in table_names:
        _add_column_if_missing("customers", "updated_at", "TIMESTAMP")
        _add_column_if_missing("customers", "owner_id", "INTEGER")
        _add_column_if_missing("customers", "accounting_software", "VARCHAR")
        _add_column_if_missing("customers", "accounting_id", "VARCHAR")
        # Ø³ØªÙˆÙ† Ù‚Ø¯ÛŒÙ…ÛŒ Ø¨Ø±Ø§ÛŒ Ø³Ø§Ø²Ú¯Ø§Ø±ÛŒ Ø¨Ø§ Ù†Ø³Ø®Ù‡â€ŒÙ‡Ø§ÛŒ Ù‚Ø¨Ù„ÛŒØŒ Ø§Ú¯Ø± ÙˆØ¬ÙˆØ¯ Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´Ø¯ Ù†Ú¯Ù‡ Ø¯Ø§Ø´ØªÙ‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯.
        _add_column_if_missing("customers", "accounting_provider", "VARCHAR")

    if "products" in table_names:
        _add_column_if_missing("products", "updated_at", "TIMESTAMP")
        _add_column_if_missing("products", "owner_id", "INTEGER")
        _add_column_if_missing("products", "accounting_software", "VARCHAR")
        _add_column_if_missing("products", "accounting_id", "VARCHAR")
        _add_column_if_missing("products", "accounting_provider", "VARCHAR")

    if "orders" in table_names:
        _add_column_if_missing("orders", "owner_id", "INTEGER")
        _add_column_if_missing("orders", "accounting_software", "VARCHAR")
        _add_column_if_missing("orders", "accounting_id", "VARCHAR")
        _add_column_if_missing("orders", "accounting_exported_at", "TIMESTAMP")
        _add_column_if_missing("orders", "accounting_export_batch", "VARCHAR")
        _add_column_if_missing("orders", "accounting_imported_at", "TIMESTAMP")
        _add_column_if_missing("orders", "accounting_provider", "VARCHAR")

    if "messages" in table_names:
        _add_column_if_missing("messages", "owner_id", "INTEGER")

    if "users" in table_names:
        with engine.begin() as connection:
            first_user = connection.execute(text("SELECT id FROM users ORDER BY id ASC LIMIT 1")).fetchone()

            if first_user:
                first_user_id = int(first_user[0])

                for table_name in ["customers", "products", "orders", "messages"]:
                    if table_name in table_names:
                        connection.execute(
                            text(f"UPDATE {table_name} SET owner_id = :owner_id WHERE owner_id IS NULL"),
                            {"owner_id": first_user_id},
                        )

