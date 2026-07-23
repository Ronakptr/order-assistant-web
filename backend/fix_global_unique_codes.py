from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path

from app.database import engine


TABLES_TO_FIX = {
    "customers": {
        "code_columns": ["customer_code", "oa_internal_code"],
        "scope_columns": ["owner_id", "company_id"],
    },
    "orders": {
        "code_columns": ["code"],
        "scope_columns": ["owner_id", "company_id"],
    },
}


def quote_identifier(name: str) -> str:
    return '"' + str(name).replace('"', '""') + '"'


def get_database_path() -> Path | None:
    url = str(engine.url)

    if not url.startswith("sqlite:///"):
        return None

    raw_path = url.replace("sqlite:///", "", 1)

    if raw_path.startswith("./"):
        raw_path = raw_path[2:]

    return Path(raw_path).resolve()


def backup_database_file() -> None:
    db_path = get_database_path()

    if not db_path or not db_path.exists():
        print("Database file backup skipped. Path not found.")
        return

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.with_name(f"{db_path.stem}_backup_before_fix_unique_{timestamp}{db_path.suffix}")

    shutil.copy2(db_path, backup_path)
    print("Database backup created:")
    print(backup_path)


def table_exists(cursor, table_name: str) -> bool:
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (table_name,),
    )
    return cursor.fetchone() is not None


def get_columns(cursor, table_name: str) -> list[dict]:
    cursor.execute(f"PRAGMA table_info({quote_identifier(table_name)})")
    rows = cursor.fetchall()

    columns = []

    for row in rows:
        columns.append(
            {
                "cid": row[0],
                "name": row[1],
                "type": row[2] or "",
                "notnull": bool(row[3]),
                "default": row[4],
                "pk": int(row[5] or 0),
            }
        )

    return columns


def get_unique_indexes(cursor, table_name: str) -> list[dict]:
    cursor.execute(f"PRAGMA index_list({quote_identifier(table_name)})")
    rows = cursor.fetchall()

    indexes = []

    for row in rows:
        indexes.append(
            {
                "seq": row[0],
                "name": row[1],
                "unique": bool(row[2]),
                "origin": row[3] if len(row) > 3 else "",
                "partial": bool(row[4]) if len(row) > 4 else False,
            }
        )

    return [item for item in indexes if item["unique"]]


def get_index_columns(cursor, index_name: str) -> list[str]:
    cursor.execute(f"PRAGMA index_info({quote_identifier(index_name)})")
    rows = cursor.fetchall()

    return [row[2] for row in rows if row[2]]


def drop_dropable_unique_indexes(cursor, table_name: str) -> None:
    unique_indexes = get_unique_indexes(cursor, table_name)

    for index in unique_indexes:
        index_name = index["name"]
        origin = index["origin"]

        if index_name.startswith("sqlite_autoindex"):
            continue

        if origin == "pk":
            continue

        print(f"Dropping unique index {index_name} on {table_name} ...")
        cursor.execute(f"DROP INDEX IF EXISTS {quote_identifier(index_name)}")


def table_still_has_global_unique_on_code(cursor, table_name: str, code_columns: list[str]) -> bool:
    unique_indexes = get_unique_indexes(cursor, table_name)

    for index in unique_indexes:
        index_name = index["name"]

        if index_name.startswith("sqlite_autoindex"):
            columns = get_index_columns(cursor, index_name)
        else:
            columns = get_index_columns(cursor, index_name)

        for code_column in code_columns:
            if columns == [code_column]:
                print(f"Global UNIQUE still exists on {table_name}.{code_column}: {index_name}")
                return True

    return False


def build_column_sql(column: dict, single_pk_name: str | None) -> str:
    name = column["name"]
    column_type = column["type"] or ""
    notnull = column["notnull"]
    default = column["default"]
    is_single_pk = single_pk_name == name

    parts = [quote_identifier(name)]

    if column_type:
        parts.append(column_type)

    if is_single_pk:
        if "INT" in column_type.upper():
            parts.append("PRIMARY KEY")
        else:
            parts.append("PRIMARY KEY")
    else:
        if notnull:
            parts.append("NOT NULL")

    if default is not None:
        parts.append(f"DEFAULT {default}")

    return " ".join(parts)


def recreate_table_without_unique(cursor, table_name: str) -> None:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    old_table_name = f"{table_name}__old_unique_{timestamp}"

    columns = get_columns(cursor, table_name)

    if not columns:
        print(f"No columns found for {table_name}. Skipped.")
        return

    pk_columns = [column for column in columns if column["pk"] > 0]
    single_pk_name = pk_columns[0]["name"] if len(pk_columns) == 1 else None

    column_sql_parts = []

    for column in columns:
        column_sql_parts.append(build_column_sql(column, single_pk_name))

    if len(pk_columns) > 1:
        ordered_pk_columns = sorted(pk_columns, key=lambda item: item["pk"])
        pk_sql = ", ".join(quote_identifier(column["name"]) for column in ordered_pk_columns)
        column_sql_parts.append(f"PRIMARY KEY ({pk_sql})")

    create_sql = f"""
    CREATE TABLE {quote_identifier(table_name)} (
        {", ".join(column_sql_parts)}
    )
    """

    column_names = [column["name"] for column in columns]
    column_list_sql = ", ".join(quote_identifier(name) for name in column_names)

    print(f"Rebuilding table {table_name} without global UNIQUE constraints ...")

    cursor.execute(f"ALTER TABLE {quote_identifier(table_name)} RENAME TO {quote_identifier(old_table_name)}")
    cursor.execute(create_sql)
    cursor.execute(
        f"""
        INSERT INTO {quote_identifier(table_name)} ({column_list_sql})
        SELECT {column_list_sql}
        FROM {quote_identifier(old_table_name)}
        """
    )
    cursor.execute(f"DROP TABLE {quote_identifier(old_table_name)}")

    print(f"Table {table_name} rebuilt.")


def create_safe_indexes(cursor, table_name: str, columns: list[dict], config: dict) -> None:
    existing_column_names = {column["name"] for column in columns}

    for scope_column in config["scope_columns"]:
        if scope_column in existing_column_names:
            cursor.execute(
                f"""
                CREATE INDEX IF NOT EXISTS {quote_identifier(f"ix_{table_name}_{scope_column}_safe")}
                ON {quote_identifier(table_name)} ({quote_identifier(scope_column)})
                """
            )

    for code_column in config["code_columns"]:
        if code_column in existing_column_names:
            cursor.execute(
                f"""
                CREATE INDEX IF NOT EXISTS {quote_identifier(f"ix_{table_name}_{code_column}_safe")}
                ON {quote_identifier(table_name)} ({quote_identifier(code_column)})
                """
            )


def fix_table(cursor, table_name: str, config: dict) -> None:
    if not table_exists(cursor, table_name):
        print(f"Table {table_name} does not exist. Skipped.")
        return

    print("-" * 70)
    print(f"Checking table: {table_name}")

    drop_dropable_unique_indexes(cursor, table_name)

    if table_still_has_global_unique_on_code(cursor, table_name, config["code_columns"]):
        recreate_table_without_unique(cursor, table_name)
    else:
        print(f"No global UNIQUE code constraint found on {table_name} after index cleanup.")

    columns = get_columns(cursor, table_name)
    create_safe_indexes(cursor, table_name, columns, config)

    print(f"{table_name} fixed.")


def print_final_indexes(cursor, table_name: str) -> None:
    if not table_exists(cursor, table_name):
        return

    print("-" * 70)
    print(f"Final indexes for {table_name}:")

    cursor.execute(f"PRAGMA index_list({quote_identifier(table_name)})")
    rows = cursor.fetchall()

    for row in rows:
        print(row)


def main() -> None:
    backup_database_file()

    raw_connection = engine.raw_connection()

    try:
        cursor = raw_connection.cursor()

        cursor.execute("PRAGMA foreign_keys=OFF")
        cursor.execute("PRAGMA legacy_alter_table=ON")

        for table_name, config in TABLES_TO_FIX.items():
            fix_table(cursor, table_name, config)

        raw_connection.commit()

        for table_name in TABLES_TO_FIX:
            print_final_indexes(cursor, table_name)

        print("-" * 70)
        print("DONE: Global UNIQUE constraints on customer/order codes were removed.")

    except Exception:
        raw_connection.rollback()
        raise

    finally:
        raw_connection.close()


if __name__ == "__main__":
    main()