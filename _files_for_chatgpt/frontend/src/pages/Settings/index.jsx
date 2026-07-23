import { useEffect, useMemo, useState } from "react";
import "./Settings.css";

import DisplaySettings from "./sections/DisplaySettings";
import InvoiceSettings from "./sections/InvoiceSettings";
import CurrencySettings from "./sections/CurrencySettings";
import DateSettings from "./sections/DateSettings";
import BackupSettings from "./sections/BackupSettings/BackupSettings.jsx";
import SecuritySettings from "./sections/SecuritySettings/SecuritySettings.jsx";

const SETTINGS_ACTIVE_SECTION_KEY = "order_assistant_active_settings_section";

const SETTINGS_ITEMS = [
  {
    key: "display",
    label: "نمایش",
    component: DisplaySettings,
  },
  {
    key: "invoice",
    label: "فاکتور",
    component: InvoiceSettings,
  },
  {
    key: "currency",
    label: "واحد پول",
    component: CurrencySettings,
  },
  {
    key: "date",
    label: "تاریخ",
    component: DateSettings,
  },
  {
    key: "backup",
    label: "تهیه فایل پشتیبان",
    component: BackupSettings,
  },
  {
    key: "security",
    label: "امنیت",
    component: SecuritySettings,
  },
];

function getInitialActiveSection() {
  const stored = localStorage.getItem(SETTINGS_ACTIVE_SECTION_KEY);

  if (SETTINGS_ITEMS.some((item) => item.key === stored)) {
    return stored;
  }

  return "display";
}

function SettingsArrowIcon() {
  return (
    <svg
      className="settings-sidebar__arrow"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 6 9 12l6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState(getInitialActiveSection);

  useEffect(() => {
    localStorage.setItem(SETTINGS_ACTIVE_SECTION_KEY, activeSection);
  }, [activeSection]);

  const activeItem = useMemo(() => {
    return (
      SETTINGS_ITEMS.find((item) => item.key === activeSection) ||
      SETTINGS_ITEMS[0]
    );
  }, [activeSection]);

  const ActiveComponent = activeItem.component;

  return (
    <div className="settings-page">
      <aside className="settings-sidebar">
        <div className="settings-sidebar__title">تنظیمات</div>

        <nav className="settings-sidebar__nav" aria-label="بخش‌های تنظیمات">
          {SETTINGS_ITEMS.map((item) => {
            const isActive = item.key === activeSection;

            return (
              <button
                key={item.key}
                type="button"
                className={`settings-sidebar__item ${
                  isActive ? "is-active" : ""
                }`}
                onClick={() => setActiveSection(item.key)}
              >
                <span>{item.label}</span>
                <SettingsArrowIcon />
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="settings-content">
        <ActiveComponent />
      </main>
    </div>
  );
}