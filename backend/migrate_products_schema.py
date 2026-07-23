import sqlite3
from pathlib import Path

db_path = Path(__file__).resolve().parent / "order_assistant.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='products'")
if cur.fetchone():
    cur.execute("PRAGMA table_info(products)")
    existing = {row[1] for row in cur.fetchall()}
    columns = {
        "default_sale_price": "TEXT",
        "base_price": "TEXT",
        "unit_price": "TEXT",
        "factory_purchase_price": "TEXT",
        "remaining_stock": "TEXT",
        "warning_stock": "TEXT",
        "sale_price": "TEXT",
        "accounting_software": "TEXT",
        "accounting_id": "TEXT",
        "oa_internal_code": "TEXT",
        "updated_at": "DATETIME",
    }
    for name, sql_type in columns.items():
        if name not in existing:
            cur.execute(f"ALTER TABLE products ADD COLUMN {name} {sql_type}")
    cur.execute("UPDATE products SET updated_at = COALESCE(updated_at, created_at, datetime('now')) WHERE updated_at IS NULL")
conn.commit()
conn.close()
print("Products schema migration completed.")
