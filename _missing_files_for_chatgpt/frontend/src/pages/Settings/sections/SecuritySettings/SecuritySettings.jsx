import { useState } from "react";
import "./SecuritySettings.css";

function PasswordModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError("همه فیلدها الزامی هستند.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("رمز عبور جدید و تکرار آن یکسان نیستند.");
      return;
    }

    onSave(form.newPassword);
  };

  return (
    <div className="security-modal-backdrop" onClick={onClose}>
      <div className="security-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="security-modal__close"
          onClick={onClose}
          aria-label="بستن"
        >
          ×
        </button>

        <div className="security-modal__field">
          <label>رمز عبور فعلی</label>
          <input
            type="password"
            value={form.currentPassword}
            onChange={(e) =>
              setForm({ ...form, currentPassword: e.target.value })
            }
          />
        </div>

        <div className="security-modal__field">
          <label>رمز عبور جدید</label>
          <input
            type="password"
            value={form.newPassword}
            onChange={(e) =>
              setForm({ ...form, newPassword: e.target.value })
            }
          />
        </div>

        <div className="security-modal__field">
          <label>تکرار رمز عبور جدید</label>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
          />
        </div>

        {error && <p className="security-modal__error">{error}</p>}

        <div className="security-modal__actions">
          <button
            type="button"
            className="security-modal__btn security-modal__btn--cancel"
            onClick={onClose}
          >
            انصراف
          </button>

          <button
            type="button"
            className="security-modal__btn security-modal__btn--save"
            onClick={handleSubmit}
          >
            تغییر رمز
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SecuritySettings() {
  const [username, setUsername] = useState("admin");
  const [draftUsername, setDraftUsername] = useState("admin");

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordChangedMessage, setPasswordChangedMessage] = useState("");

  const handleSaveUsername = () => {
    const cleanName = draftUsername.trim();

    if (!cleanName) return;

    setUsername(cleanName);
    setDraftUsername(cleanName);
    setIsEditingUsername(false);
  };

  const handleCancelUsername = () => {
    setDraftUsername(username);
    setIsEditingUsername(false);
  };

  const handlePasswordSave = () => {
    setShowPasswordModal(false);
    setPasswordChangedMessage("رمز عبور با موفقیت تغییر کرد.");
  };

  return (
    <div className="security-settings">
      <div className="security-settings__card">
        <div className="security-settings__content">
          <div className="security-row security-row--top">
            <div className="security-field">
              <label>نام کاربری</label>

              <div
                className={`username-input-wrap ${
                  isEditingUsername ? "editing" : ""
                }`}
              >
                <input
                  value={draftUsername}
                  onFocus={() => setIsEditingUsername(true)}
                  onChange={(e) => {
                    setDraftUsername(e.target.value);
                    setIsEditingUsername(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveUsername();
                    if (e.key === "Escape") handleCancelUsername();
                  }}
                />

                {isEditingUsername && (
                  <button
                    type="button"
                    className="username-save-btn"
                    onClick={handleSaveUsername}
                    title="ذخیره نام کاربری"
                  >
                    ✓
                  </button>
                )}
              </div>
            </div>

            <div className="security-field">
              <label>رمز عبور</label>

              <div className="password-input-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  value="********"
                  readOnly
                />

                <button
                  type="button"
                  className="password-eye-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title="نمایش/مخفی کردن رمز"
                >
                  {showPassword ? (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C5 20 1 12 1 12a20.3 20.3 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A10.7 10.7 0 0 1 12 4c7 0 11 8 11 8a20.8 20.8 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              <button
                type="button"
                className="change-password-btn"
                onClick={() => {
                  setPasswordChangedMessage("");
                  setShowPasswordModal(true);
                }}
              >
                تغییر رمز عبور
              </button>

              {passwordChangedMessage && (
                <span className="password-success-message">
                  {passwordChangedMessage}
                </span>
              )}
            </div>
          </div>
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