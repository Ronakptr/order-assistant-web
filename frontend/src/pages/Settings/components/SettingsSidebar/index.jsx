import "./SettingsSidebar.css";

const settingsItems = [
  { key: "display", label: "نمایش" },
  { key: "invoice", label: "فاکتور" },
  { key: "currency", label: "واحد پول" },
  { key: "date", label: "تاریخ" },
  { key: "backup", label: "تهیه فایل پشتیبان" },
  { key: "security", label: "امنیت" },
];

export default function SettingsSidebar({ activeSection = "display", onChange }) {
  return (
    <aside className="settings-sidebar">
      <div className="settings-sidebar__header">
        <h2 className="settings-sidebar__title">تنظیمات</h2>
      </div>

      <nav className="settings-sidebar__nav">
        {settingsItems.map((item) => {
          const isActive = activeSection === item.key;

          return (
            <button
              key={item.key}
              type="button"
              className={`settings-sidebar__item${isActive ? " active" : ""}`}
              onClick={() => onChange?.(item.key)}
            >
              <span className="settings-sidebar__item-label">
                {item.label}
              </span>

              <span className="settings-sidebar__item-arrow">‹</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}