import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { getStoredUser, isAdminRole } from "../../api/auth";
import {
  getCompanyScopedItem,
  setCompanyScopedItem,
} from "../../utils/companyScopedStorage";
import "./Settings.css";

import DisplaySettings from "./sections/DisplaySettings";
import InvoiceSettings from "./sections/InvoiceSettings";
import CurrencySettings from "./sections/CurrencySettings";
import DateSettings from "./sections/DateSettings";
import BackupSettings from "./sections/BackupSettings/BackupSettings.jsx";
import SecuritySettings from "./sections/SecuritySettings/SecuritySettings.jsx";
import AccountingSettings from "./sections/AccountingSettings";
import NotificationSettings from "./sections/NotificationSettings";
import MessageSettings from "./sections/MessageSettings";

const SETTINGS_ACTIVE_SECTION_KEY = "order_assistant_active_settings_section";

function DisplayIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="11.5" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M9 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 16.5V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function InvoiceIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M15 3.5V8h4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 12h6M9 15.5h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CurrencyIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16.5 7.5c-.9-.9-2.4-1.5-4.1-1.5-2.8 0-4.9 1.5-4.9 3.6 0 5 9 2.3 9 6.8 0 2-1.9 3.6-4.5 3.6-1.9 0-3.6-.7-4.8-1.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DateIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M8 3.5v3M16 3.5v3M4 9.5h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="8" y="12" width="3" height="3" rx="1" fill="currentColor" />
    </svg>
  );
}

function BackupIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m8.5 10.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 16.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SecurityIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.5 18.5 6v5.7c0 4.4-2.6 7.2-6.5 8.8-3.9-1.6-6.5-4.4-6.5-8.8V6L12 3.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m9.6 12 1.6 1.6 3.3-3.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


function AccountingIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M8 9h8M8 13h8M8 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 15.5 19 17.5 22 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NotificationIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 18H9m9-1V11a6 6 0 1 0-12 0v6l-2 2h16l-2-2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}


function MessageSettingsIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4.5 3.5V16A2.5 2.5 0 0 1 4 13.5v-7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 8.5h8M8 12h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const SETTINGS_ITEMS = [
  {
    key: "display",
    label: "نمایش",
    icon: DisplayIcon,
    component: DisplaySettings,
  },
  {
    key: "invoice",
    label: "فاکتور",
    icon: InvoiceIcon,
    component: InvoiceSettings,
  },
  {
    key: "currency",
    label: "واحد پول",
    icon: CurrencyIcon,
    component: CurrencySettings,
  },
  {
    key: "date",
    label: "تاریخ",
    icon: DateIcon,
    component: DateSettings,
  },
  {
    key: "accounting",
    label: "حسابداری",
    icon: AccountingIcon,
    component: AccountingSettings,
  },
  {
    key: "notifications",
    label: "اعلان‌ها",
    icon: NotificationIcon,
    component: NotificationSettings,
  },
  {
    key: "message-settings",
    label: "تنظیمات پیام‌ها",
    icon: MessageSettingsIcon,
    component: MessageSettings,
  },
  {
    key: "backup",
    label: "تهیه فایل پشتیبان",
    icon: BackupIcon,
    component: BackupSettings,
  },
  {
    key: "security",
    label: "امنیت",
    icon: SecurityIcon,
    component: SecuritySettings,
  },
];

function getInitialActiveSection() {
  const stored = getCompanyScopedItem(SETTINGS_ACTIVE_SECTION_KEY);

  if (SETTINGS_ITEMS.some((item) => item.key === stored)) {
    return stored;
  }

  return "display";
}

export default function Settings() {
  const currentUser = getStoredUser();
  const canAccessSettings = isAdminRole(currentUser?.role);
  const [activeSection, setActiveSection] = useState(getInitialActiveSection);

  useEffect(() => {
    setCompanyScopedItem(SETTINGS_ACTIVE_SECTION_KEY, activeSection);
  }, [activeSection]);

  const activeItem = useMemo(() => {
    return (
      SETTINGS_ITEMS.find((item) => item.key === activeSection) ||
      SETTINGS_ITEMS[0]
    );
  }, [activeSection]);

  const ActiveComponent = activeItem.component;

  if (!canAccessSettings) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="settings-page">
      <aside className="settings-sidebar" aria-label="منوی تنظیمات">
        <nav className="settings-sidebar__nav" aria-label="بخش‌های تنظیمات">
          {SETTINGS_ITEMS.map((item) => {
            const isActive = item.key === activeSection;
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                type="button"
                className={`settings-sidebar__item ${
                  isActive ? "is-active" : ""
                }`}
                onClick={() => setActiveSection(item.key)}
                aria-label={item.label}
                title={item.label}
              >
                <Icon className="settings-sidebar__icon" />
                <span className="settings-sidebar__item-label">{item.label}</span>
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
