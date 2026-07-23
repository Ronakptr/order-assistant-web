# راهنمای تمیزکاری و آنلاین کردن موقت Order Assistant Web

این نسخه برای Deploy تمیز شده است:

- فایل‌های `__pycache__` و backup حذف شده‌اند.
- ساختار پروژه به شکل استاندارد `backend/` و `frontend/` آماده شده است.
- تنظیمات حساس به `.env` منتقل شده‌اند.
- CORS بک‌اند از متغیر `FRONTEND_ORIGINS` خوانده می‌شود.
- فرانت‌اند آدرس API را از `VITE_API_BASE_URL` می‌خواند.
- برای PostgreSQL آنلاین، پکیج `psycopg2-binary` به requirements اضافه شده است.

## اجرای لوکال

### Backend

```powershell
cd backend
copy .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload
```

آدرس تست:

```text
http://127.0.0.1:8000/docs
```

### Frontend

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

آدرس:

```text
http://localhost:5173
```

## Deploy پیشنهادی موقت

من نمی‌توانم در این محیط وضعیت فعلی پلن‌های رایگان سرویس‌ها را آنلاین بررسی کنم، اما از نظر فنی این چینش مناسب است:

- Frontend: Vercel یا Netlify
- Backend: Render / Railway / Fly.io / PythonAnywhere
- Database: Neon یا Supabase PostgreSQL

## متغیرهای Backend روی سرور

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
SECRET_KEY=یک-کلید-طولانی-و-تصادفی
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_ORIGINS=https://your-frontend-domain.vercel.app
```

## متغیرهای Frontend روی Vercel/Netlify

```env
VITE_API_BASE_URL=https://your-backend-domain.onrender.com
```

بعد از Deploy بک‌اند، آدرس `/docs` را باز کن. اگر Swagger باز شد، مقدار `VITE_API_BASE_URL` فرانت را روی همان دامنه بک‌اند بگذار و دوباره فرانت را Deploy کن.
