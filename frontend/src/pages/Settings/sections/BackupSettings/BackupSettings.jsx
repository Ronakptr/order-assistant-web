import "./BackupSettings.css";

export default function BackupSettings() {
  return (
    <section className="backup-settings">
      <header className="backup-settings__header">
        <h2>پشتیبان‌گیری</h2>
      </header>

      <div className="backup-settings__card">
        <h3>پشتیبان‌گیری از اطلاعات</h3>
        <p>
          این بخش برای خروجی گرفتن از اطلاعات برنامه و بازیابی نسخه پشتیبان آماده شده است.
          در نسخه آنلاین، اتصال کامل به فضای ذخیره‌سازی امن در مرحله بعد فعال می‌شود.
        </p>

        <div className="backup-settings__actions">
          <button type="button" disabled>
            ساخت فایل پشتیبان
          </button>

          <button type="button" disabled>
            بازیابی اطلاعات
          </button>
        </div>
      </div>
    </section>
  );
}
