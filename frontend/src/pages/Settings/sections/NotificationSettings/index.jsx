import { useEffect, useMemo, useState } from "react";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_ROLES,
  NOTIFICATION_ROLE_LABELS,
  defaultNotificationRoleCategories,
  fetchNotificationSettings,
  normalizeNotificationSettings,
  saveNotificationSettings,
} from "../../../../api/notificationSettings";
import "./NotificationSettings.css";

function cloneMatrix(matrix) {
  return JSON.parse(JSON.stringify(matrix || {}));
}

function countEnabledForRole(matrix, role) {
  return NOTIFICATION_CATEGORIES.filter((category) => Boolean(matrix?.[role]?.[category])).length;
}

function CompactSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      className={`notification-compact-switch ${checked ? "is-on" : ""}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <i>{checked ? "✓" : ""}</i>
    </button>
  );
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState(() => normalizeNotificationSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [activeRole, setActiveRole] = useState("admin");

  useEffect(() => {
    let alive = true;
    setLoading(true);

    fetchNotificationSettings()
      .then((data) => {
        if (alive) setSettings(data);
      })
      .catch((error) => {
        console.error(error);
        if (alive) setStatus({ type: "danger", text: "خطا در دریافت تنظیمات اعلان‌ها" });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const matrix = settings.role_categories || settings.roleCategories || {};
  const activeCount = countEnabledForRole(matrix, activeRole);

  const roleSummary = useMemo(() => {
    return NOTIFICATION_ROLES.map((role) => ({
      role,
      label: NOTIFICATION_ROLE_LABELS[role] || role,
      count: countEnabledForRole(matrix, role),
      total: NOTIFICATION_CATEGORIES.length,
    }));
  }, [matrix]);

  const updateCell = (role, category, checked) => {
    setSettings((previous) => {
      const roleCategories = cloneMatrix(previous.role_categories || previous.roleCategories);
      roleCategories[role] = { ...(roleCategories[role] || {}), [category]: checked };
      return normalizeNotificationSettings({ ...previous, role_categories: roleCategories });
    });
    setStatus({ type: "", text: "" });
  };

  const setRoleAll = (role, checked) => {
    setSettings((previous) => {
      const roleCategories = cloneMatrix(previous.role_categories || previous.roleCategories);
      roleCategories[role] = Object.fromEntries(NOTIFICATION_CATEGORIES.map((category) => [category, checked]));
      return normalizeNotificationSettings({ ...previous, role_categories: roleCategories });
    });
    setStatus({ type: "", text: "" });
  };

  const resetDefaults = () => {
    setSettings(normalizeNotificationSettings({ role_categories: defaultNotificationRoleCategories() }));
    setStatus({ type: "info", text: "تنظیمات پیش‌فرض آماده ذخیره است." });
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const saved = await saveNotificationSettings(settings);
      setSettings(saved);
      setStatus({ type: "success", text: "تنظیمات اعلان‌ها ذخیره شد." });
    } catch (error) {
      setStatus({
        type: "danger",
        text: error?.response?.data?.detail || error?.message || "خطا در ذخیره تنظیمات اعلان‌ها",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="notification-settings">
        <div className="notification-settings__card">
          <div className="notification-loading">در حال دریافت تنظیمات اعلان‌ها...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-settings">
      <div className="notification-settings__card">
        <div className="notification-settings__header">
          <div>
            <h2>تنظیمات اعلان‌ها</h2>
          </div>

          <div className="notification-settings__actions">
            <button type="button" className="notification-secondary-btn" onClick={resetDefaults}>پیش‌فرض</button>
            <button type="button" className="notification-primary-btn" onClick={saveSettings} disabled={saving}>
              {saving ? "در حال ذخیره..." : "ذخیره"}
            </button>
          </div>
        </div>

        {status.text && <div className={`notification-status notification-status--${status.type || "info"}`}>{status.text}</div>}

        <div className="notification-compact-layout">
          <aside className="notification-role-list" aria-label="نقش‌ها">
            {roleSummary.map((item) => (
              <button
                key={item.role}
                type="button"
                className={`notification-role-card ${activeRole === item.role ? "is-active" : ""}`}
                onClick={() => setActiveRole(item.role)}
              >
                <strong>{item.label}</strong>
                <span>{item.count} از {item.total} اعلان فعال</span>
                <i style={{ width: `${Math.round((item.count / item.total) * 100)}%` }} />
              </button>
            ))}
          </aside>

          <section className="notification-role-panel">
            <div className="notification-role-panel__head">
              <div>
                <span>نقش انتخاب‌شده</span>
                <h3>{NOTIFICATION_ROLE_LABELS[activeRole] || activeRole}</h3>
              </div>

              <div className="notification-role-panel__tools">
                <button type="button" onClick={() => setRoleAll(activeRole, true)}>فعال‌سازی همه</button>
                <button type="button" onClick={() => setRoleAll(activeRole, false)}>غیرفعال‌سازی همه</button>
              </div>
            </div>

            <div className="notification-mini-summary">
              <strong>{activeCount}</strong>
              <span>دسته اعلان فعال برای این نقش</span>
            </div>

            <div className="notification-category-list">
              {NOTIFICATION_CATEGORIES.map((category) => {
                const checked = Boolean(matrix?.[activeRole]?.[category]);

                return (
                  <div key={category} className={`notification-category-card ${checked ? "is-on" : ""}`}>
                    <div>
                      <strong>{NOTIFICATION_CATEGORY_LABELS[category] || category}</strong>
                      <span>{category}</span>
                    </div>

                    <CompactSwitch
                      checked={checked}
                      onChange={(nextChecked) => updateCell(activeRole, category, nextChecked)}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
