from pathlib import Path

ROOT = Path.cwd()
MAIN = ROOT / "backend" / "app" / "main.py"

if not MAIN.exists():
    raise SystemExit("backend/app/main.py پیدا نشد. این اسکریپت را از ریشه پروژه اجرا کن.")

text = MAIN.read_text(encoding="utf-8-sig")

if "profile_security" not in text:
    lines = text.splitlines()
    updated = []
    injected_import = False

    for line in lines:
        if line.startswith("from app.routers import ") and not injected_import:
            if line.rstrip().endswith(")") or "(" in line:
                # Safe fallback for multi-line imports: add a separate import.
                updated.append(line)
                updated.append("from app.routers import profile_security")
            else:
                updated.append(line.rstrip() + ", profile_security")
            injected_import = True
        else:
            updated.append(line)

    if not injected_import:
        insert_at = 0
        for i, line in enumerate(updated):
            if line.startswith("from ") or line.startswith("import "):
                insert_at = i + 1
        updated.insert(insert_at, "from app.routers import profile_security")

    text = "\n".join(updated) + "\n"

include_line = "app.include_router(profile_security.router)"
if include_line not in text:
    lines = text.splitlines()
    last_include = -1

    for i, line in enumerate(lines):
        if "app.include_router(" in line:
            last_include = i

    if last_include >= 0:
        lines.insert(last_include + 1, include_line)
    else:
        insert_at = 0
        for i, line in enumerate(lines):
            if line.startswith("app = FastAPI"):
                insert_at = i + 1
        lines.insert(insert_at, include_line)

    text = "\n".join(lines) + "\n"

MAIN.write_text(text, encoding="utf-8")
print("Security profile router با موفقیت به backend/app/main.py اضافه شد.")
