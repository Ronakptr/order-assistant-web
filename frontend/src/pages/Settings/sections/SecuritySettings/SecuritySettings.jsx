import { useEffect, useMemo, useState } from "react";
import { getStoredUser } from "../../../../api/auth";
import {
  changeCurrentPassword,
  fetchSecurityProfile,
  updateCurrentUsername,
} from "../../../../api/profileSecurity";
import {
  getCompanyScopedItem,
  migrateLegacyCompanyScopedItem,
  setCompanyScopedItem,
} from "../../../../utils/companyScopedStorage";
import "./SecuritySettings.css";

const SECURITY_SETTINGS_STORAGE_KEY = "order_assistant_security_settings";

const DEFAULT_SECURITY_SETTINGS = {
  backupEmail: "",
  backupPhone: "",
};

function normalizeSecuritySettings(settings) {
  return {
    backupEmail: String(settings?.backupEmail || settings?.backup_email || "").trim(),
    backupPhone: String(settings?.backupPhone || settings?.backup_phone || "").trim(),
  };
}

function loadSecuritySettings() {
  try {
    const raw =
      getCompanyScopedItem(SECURITY_SETTINGS_STORAGE_KEY) ||
      migrateLegacyCompanyScopedItem(SECURITY_SETTINGS_STORAGE_KEY);

    return normalizeSecuritySettings(
      raw ? JSON.parse(raw) : DEFAULT_SECURITY_SETTINGS
    );
  } catch {
    return normalizeSecuritySettings(DEFAULT_SECURITY_SETTINGS);
  }
}

function saveSecuritySettings(settings) {
  const normalized = normalizeSecuritySettings(settings);

  setCompanyScopedItem(
    SECURITY_SETTINGS_STORAGE_KEY,
    JSON.stringify(normalized)
  );

  window.dispatchEvent(
    new CustomEvent("order-assistant-security-settings-updated", {
      detail: normalized,
    })
  );

  return normalized;
}

function userDisplayName(user) {
  return (
    user?.name ||
    user?.full_name ||
    user?.fullName ||
    user?.username ||
    "کاربر فعلی"
  );
}

function PasswordModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updateField = (name, value) => {
    setForm((previous) => ({ ...previous, [name]: value }));
    setError("");
  };

  const handleSubmit = async () => {
    const currentPassword = form.currentPassword.trim();
    const newPassword = form.newPassword.trim();
    const confirmPassword = form.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("همه فیلدها الزامی هستند.");
      return;
    }

    if (newPassword.length < 6) {
      setError("رمز عبور جدید باید حداقل ۶ کاراکتر باشد.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("رمز عبور جدید و تکرار آن یکسان نیستند.");
      return;
    }

    try {
      setSaving(true);
      await onSave(currentPassword, newPassword);
    } catch (error) {
      setError(error?.message || "خطا در تغییر رمز عبور");
    } finally {
      setSaving(false);
    }
  };

  const inputType = (key) => (showPassword[key] ? "text" : "password");

  return (
    <div className="security-modal-backdrop" onMouseDown={onClose}>
      <div
        className="security-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="security-modal__close"
          onClick={onClose}
          aria-label="بستن"
        >
          ×
        </button>

        <h3 className="security-modal__title">تغییر رمز عبور</h3>

        <div className="security-modal__field">
          <label>رمز عبور فعلی</label>

          <div className="security-password-field">
            <input
              type={inputType("current")}
              value={form.currentPassword}
              autoComplete="current-password"
              onChange={(event) =>
                updateField("currentPassword", event.target.value)
              }
            />

            <button
              type="button"
              className="security-password-field__eye"
              onClick={() =>
                setShowPassword((previous) => ({
                  ...previous,
                  current: !previous.current,
                }))
              }
              aria-label="نمایش رمز فعلی"
            >
              👁
            </button>
          </div>
        </div>

        <div className="security-modal__field">
          <label>رمز عبور جدید</label>

          <div className="security-password-field">
            <input
              type={inputType("next")}
              value={form.newPassword}
              autoComplete="new-password"
              onChange={(event) =>
                updateField("newPassword", event.target.value)
              }
            />

            <button
              type="button"
              className="security-password-field__eye"
              onClick={() =>
                setShowPassword((previous) => ({
                  ...previous,
                  next: !previous.next,
                }))
              }
              aria-label="نمایش رمز جدید"
            >
              👁
            </button>
          </div>
        </div>

        <div className="security-modal__field">
          <label>تکرار رمز عبور جدید</label>

          <div className="security-password-field">
            <input
              type={inputType("confirm")}
              value={form.confirmPassword}
              autoComplete="new-password"
              onChange={(event) =>
                updateField("confirmPassword", event.target.value)
              }
            />

            <button
              type="button"
              className="security-password-field__eye"
              onClick={() =>
                setShowPassword((previous) => ({
                  ...previous,
                  confirm: !previous.confirm,
                }))
              }
              aria-label="نمایش تکرار رمز"
            >
              👁
            </button>
          </div>
        </div>

        {error && <p className="security-modal__error">{error}</p>}

        <div className="security-modal__actions">
          <button
            type="button"
            className="security-modal__btn security-modal__btn--cancel"
            onClick={onClose}
            disabled={saving}
          >
            انصراف
          </button>

          <button
            type="button"
            className="security-modal__btn security-modal__btn--save"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "در حال ذخیره..." : "ذخیره رمز جدید"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SecuritySettings() {
  const storedUser = useMemo(() => getStoredUser(), []);

  const [currentUser, setCurrentUser] = useState(storedUser);
  const [usernameDraft, setUsernameDraft] = useState(
    storedUser?.username || ""
  );
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [securitySettings, setSecuritySettings] = useState(loadSecuritySettings);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingBackup, setSavingBackup] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchSecurityProfile()
      .then((user) => {
        if (!isMounted || !user) return;

        setCurrentUser(user);
        setUsernameDraft(user.username || "");
      })
      .catch(() => null);

    const handleAuthChanged = () => {
      const user = getStoredUser();

      setCurrentUser(user);
      setUsernameDraft(user?.username || "");
      setSecuritySettings(loadSecuritySettings());
    };

    window.addEventListener("oa-auth-changed", handleAuthChanged);
    window.addEventListener("storage", handleAuthChanged);

    return () => {
      isMounted = false;
      window.removeEventListener("oa-auth-changed", handleAuthChanged);
      window.removeEventListener("storage", handleAuthChanged);
    };
  }, []);

  const updateSecurityField = (field, value) => {
    setSecuritySettings((previous) => ({
      ...previous,
      [field]: value,
    }));

    setMessage({ type: "", text: "" });
  };

  const handleSaveBackupInfo = () => {
    setSavingBackup(true);

    const saved = saveSecuritySettings(securitySettings);

    setSecuritySettings(saved);
    setMessage({ type: "success", text: "اطلاعات پشتیبان شرکت ذخیره شد." });
    setSavingBackup(false);
  };

  const handleSaveUsername = async () => {
    const nextUsername = usernameDraft.trim().toLowerCase();

    if (!nextUsername) {
      setMessage({ type: "error", text: "نام کاربری نمی‌تواند خالی باشد." });
      return;
    }

    if (nextUsername.length < 3) {
      setMessage({
        type: "error",
        text: "نام کاربری باید حداقل ۳ کاراکتر باشد.",
      });
      return;
    }

    try {
      setSavingUsername(true);

      const updatedUser = await updateCurrentUsername(nextUsername);

      setCurrentUser(updatedUser);
      setUsernameDraft(updatedUser?.username || nextUsername);
      setIsEditingUsername(false);
      setMessage({ type: "success", text: "نام کاربری با موفقیت تغییر کرد." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error?.message || "خطا در تغییر نام کاربری",
      });
    } finally {
      setSavingUsername(false);
    }
  };

  const handleCancelUsername = () => {
    setUsernameDraft(currentUser?.username || "");
    setIsEditingUsername(false);
    setMessage({ type: "", text: "" });
  };

  const handlePasswordSave = async (currentPassword, newPassword) => {
    await changeCurrentPassword(currentPassword, newPassword);

    setShowPasswordModal(false);
    setMessage({ type: "success", text: "رمز عبور با موفقیت تغییر کرد." });
  };

  return (
    <div className="security-settings">
      <div className="security-settings__card">
        <div className="security-settings__content">
          <div className="security-settings__header">
            <div>
              <h2>امنیت حساب</h2>
            </div>
          </div>

          {message.text && (
            <div
              className={`security-alert security-alert--${
                message.type || "info"
              }`}
            >
              {message.text}
            </div>
          )}

          <section className="security-section">
            <div className="security-section__title-wrap">
              <h3>اطلاعات پشتیبان شرکت</h3>
              <span>برای بازیابی، پیگیری و ارتباط اضطراری</span>
            </div>

            <div className="security-grid security-grid--backup">
              <label className="security-field">
                <span>ایمیل پشتیبان</span>

                <input
                  type="email"
                  value={securitySettings.backupEmail}
                  placeholder="example@email.com"
                  dir="ltr"
                  onChange={(event) =>
                    updateSecurityField("backupEmail", event.target.value)
                  }
                />
              </label>

              <label className="security-field">
                <span>شماره تماس پشتیبان</span>

                <input
                  type="tel"
                  value={securitySettings.backupPhone}
                  placeholder="09123456789"
                  dir="ltr"
                  onChange={(event) =>
                    updateSecurityField("backupPhone", event.target.value)
                  }
                />
              </label>
            </div>

            <button
              type="button"
              className="security-primary-btn"
              onClick={handleSaveBackupInfo}
              disabled={savingBackup}
            >
              {savingBackup ? "در حال ذخیره..." : "ذخیره اطلاعات پشتیبان"}
            </button>
          </section>

          <section className="security-section">
            <div className="security-section__title-wrap">
              <h3>اطلاعات ورود کاربر فعلی</h3>
              <span>{userDisplayName(currentUser)}</span>
            </div>

            <div className="security-grid">
              <div className="security-field">
                <span>نام کاربری</span>

                <div
                  className={`username-input-wrap ${
                    isEditingUsername ? "editing" : ""
                  }`}
                >
                  <input
                    value={usernameDraft}
                    dir="ltr"
                    onFocus={() => setIsEditingUsername(true)}
                    onChange={(event) => {
                      setUsernameDraft(event.target.value);
                      setIsEditingUsername(true);
                      setMessage({ type: "", text: "" });
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleSaveUsername();
                      if (event.key === "Escape") handleCancelUsername();
                    }}
                  />

                  {isEditingUsername && (
                    <div className="username-actions">
                      <button
                        type="button"
                        className="username-save-btn"
                        onClick={handleSaveUsername}
                        disabled={savingUsername}
                        title="ذخیره نام کاربری"
                      >
                        ✓
                      </button>

                      <button
                        type="button"
                        className="username-cancel-btn"
                        onClick={handleCancelUsername}
                        disabled={savingUsername}
                        title="انصراف"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="security-field">
                <span>رمز عبور</span>

                <div className="password-readonly-box">
                  <strong>••••••••</strong>
                  <small>
                    رمز عبور واقعی به‌صورت امن و هش‌شده ذخیره می‌شود و قابل
                    نمایش نیست.
                  </small>
                </div>

                <button
                  type="button"
                  className="change-password-btn"
                  onClick={() => {
                    setMessage({ type: "", text: "" });
                    setShowPasswordModal(true);
                  }}
                >
                  تغییر رمز عبور
                </button>
              </div>
            </div>
          </section>
        </div>

        {showPasswordModal && (
          <PasswordModal
            onClose={() => setShowPasswordModal(false)}
            onSave={handlePasswordSave}
          />
        )}
      </div>
    </div>
  );
}