import { useEffect, useMemo, useRef, useState } from "react";
import ActivityReportModal from "../../components/ActivityReportModal";
import {
  getActivityLogs,
  getActivityLogsByUser,
  logActivity,
} from "../../utils/activityLog";
import "./Users.css";
import {
  createUser,
  deleteUser,
  fetchUsers,
  updateUser,
  updateUserPassword,
} from "../../api/users";
import { fetchCurrentUser, getStoredUser, getUserId } from "../../api/auth";

const ROLES = ["مدیر", "سرپرست فروش", "فروشنده", "حسابدار"];

function toEnglishDigits(value) {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

  return String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)));
}

function toPersianDigits(value) {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

  return String(value ?? "").replace(/\d/g, (digit) => persianDigits[Number(digit)]);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatDateToJalali(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "-";
  }

  const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  if (!year || !month || !day) return "-";

  return `${year}/${month}/${day}`;
}

function formatUserDate(value) {
  if (value === null || value === undefined) return "-";

  if (value instanceof Date) {
    return formatDateToJalali(value);
  }

  const raw = String(value).trim();

  if (!raw || raw === "-") return "-";

  const cleaned = toEnglishDigits(raw)
    .replace(/\./g, "/")
    .replace(/-/g, "/");

  const dateOnly = cleaned.split(/[T\s]/)[0];
  const match = dateOnly.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (year >= 1700) {
      return formatDateToJalali(new Date(year, month - 1, day));
    }

    if (year >= 1200 && year <= 1600) {
      return toPersianDigits(`${year}/${pad2(month)}/${pad2(day)}`);
    }
  }

  const parsedDate = new Date(raw);

  if (!Number.isNaN(parsedDate.getTime())) {
    return formatDateToJalali(parsedDate);
  }

  return toPersianDigits(dateOnly || raw);
}

function normalizeStatus(user) {
  if (typeof user?.active === "boolean") return user.active;
  if (typeof user?.is_active === "boolean") return user.is_active;
  if (typeof user?.isActive === "boolean") return user.isActive;

  const status = String(user?.status || user?.status_label || "")
    .trim()
    .toLowerCase();

  return status === "active" || status === "فعال" || status === "true" || status === "1";
}

function getDisplayName(user) {
  return user?.name || user?.full_name || user?.username || "بدون نام";
}

function normalizeUserForPage(user, currentUser) {
  const currentUserId = getUserId(currentUser || getStoredUser());
  const userId = getUserId(user);

  const isCurrent =
    Boolean(user?.current) ||
    Boolean(user?.isCurrentUser) ||
    Boolean(currentUserId && userId && currentUserId === userId);

  const rawDate =
    user?.created_at ||
    user?.createdAt ||
    user?.date ||
    user?.updated_at ||
    user?.updatedAt ||
    null;

  return {
    ...user,
    id: userId || user.id,
    name: getDisplayName(user),
    username: user?.username || "",
    email: user?.email || "",
    role: user?.role_label || user?.role || "فروشنده",
    active: normalizeStatus(user),
    current: isCurrent,
    date: formatUserDate(rawDate),
  };
}

function EditIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13.7 5.3 18.7 10.3" />
      <path d="M4.5 19.5h4.2L19.2 9a2.35 2.35 0 0 0 0-3.3l-.9-.9a2.35 2.35 0 0 0-3.3 0L4.5 15.3v4.2Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="user-card__row-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg
      className="user-card__row-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function UsernameIcon() {
  return (
    <svg
      className="user-card__row-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20h16" />
      <path d="M7 17V9" />
      <path d="M12 17V5" />
      <path d="M17 17v-6" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function DotsMenu({ onEdit, onActivity }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className={`dots-wrap ${open ? "is-open" : ""}`} ref={ref}>
      <button
        type="button"
        className="dots-btn"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((previous) => !previous);
        }}
        aria-label="گزینه‌های کاربر"
        title="گزینه‌های کاربر"
      >
        •••
      </button>

      {open && (
        <div className="dots-menu" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="dots-item"
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
          >
            <EditIcon />
            ویرایش کاربر
          </button>

          <button
            type="button"
            className="dots-item"
            onClick={() => {
              onActivity();
              setOpen(false);
            }}
          >
            <ActivityIcon />
            مشاهده فعالیت کاربر
          </button>
        </div>
      )}
    </div>
  );
}

function ConfirmModal({ user, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-box" onClick={(event) => event.stopPropagation()}>
        <div className="confirm-icon">
          <TrashIcon />
        </div>

        <p className="confirm-text">
          آیا از حذف کاربر <strong>{user.name}</strong> اطمینان دارید؟
        </p>

        <div className="confirm-actions">
          <button
            type="button"
            className="confirm-btn confirm-btn--yes"
            onClick={onConfirm}
          >
            بله، حذف شود
          </button>

          <button
            type="button"
            className="confirm-btn confirm-btn--no"
            onClick={onCancel}
          >
            خیر
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordModal({ user, onClose, onSave }) {
  const randomNameRef = useRef(`oa_pass_${Date.now()}_${Math.random()}`);
  const [editable, setEditable] = useState(false);
  const [form, setForm] = useState({ newPass: "", confirm: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    const activeElement = document.activeElement;
    if (activeElement && typeof activeElement.blur === "function") {
      activeElement.blur();
    }

    const clearAutofillTimer = window.setTimeout(() => {
      setForm({ newPass: "", confirm: "" });
    }, 80);

    return () => window.clearTimeout(clearAutofillTimer);
  }, []);

  const unlockPasswordFields = () => setEditable(true);

  const handleSubmit = () => {
    if (!form.newPass || !form.confirm) {
      setError("رمز عبور جدید و تکرار آن الزامی است");
      return;
    }

    if (form.newPass.length < 6) {
      setError("رمز عبور باید حداقل ۶ کاراکتر باشد");
      return;
    }

    if (form.newPass !== form.confirm) {
      setError("رمز عبور جدید و تکرار آن یکسان نیستند");
      return;
    }

    onSave(form.newPass);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box change-password-box"
        onClick={(event) => event.stopPropagation()}
      >
        <form autoComplete="off" onSubmit={(event) => event.preventDefault()}>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="بستن"
          >
            ×
          </button>

          <h3 className="modal-title">تغییر رمز عبور</h3>
          {user?.name && <p className="modal-subtitle">کاربر: {user.name}</p>}

          <div className="modal-field">
            <label className="modal-label">رمز عبور جدید</label>
            <input
              className="modal-input"
              type="password"
              name={`${randomNameRef.current}_new`}
              autoComplete="new-password"
              data-lpignore="true"
              data-1p-ignore="true"
              readOnly={!editable}
              value={form.newPass}
              onFocus={unlockPasswordFields}
              onMouseDown={unlockPasswordFields}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  newPass: event.target.value,
                }))
              }
              placeholder="رمز عبور جدید"
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">تکرار رمز عبور جدید</label>
            <input
              className="modal-input"
              type="password"
              name={`${randomNameRef.current}_confirm`}
              autoComplete="new-password"
              data-lpignore="true"
              data-1p-ignore="true"
              readOnly={!editable}
              value={form.confirm}
              onFocus={unlockPasswordFields}
              onMouseDown={unlockPasswordFields}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  confirm: event.target.value,
                }))
              }
              placeholder="تکرار رمز عبور جدید"
            />
          </div>

          {error && <div className="modal-error">{error}</div>}

          <div className="modal-actions modal-actions--password">
            <button
              type="button"
              className="modal-btn-save"
              onClick={handleSubmit}
              title="ذخیره رمز عبور"
              aria-label="ذخیره رمز عبور"
            >
              <SaveIcon />
            </button>

            <button
              type="button"
              className="confirm-btn confirm-btn--no"
              onClick={onClose}
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserModal({ user, onClose, onSave, onBeforeChangePassword }) {
  const normalizedUser = user ? normalizeUserForPage(user, getStoredUser()) : null;

  const [form, setForm] = useState({
    id: normalizedUser?.id || null,
    name: normalizedUser?.name || "",
    username: normalizedUser?.username || "",
    role: normalizedUser?.role || "فروشنده",
    email: normalizedUser?.email || "",
    active: normalizedUser?.active ?? true,
    current: normalizedUser?.current ?? false,
    password: normalizedUser?.password || "",
  });

  const [error, setError] = useState("");
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const isEdit = Boolean(user?.id);

  const updateField = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setError("");
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError("نام کاربر را وارد کنید.");
      return;
    }

    if (!form.username.trim()) {
      setError("نام کاربری را وارد کنید.");
      return;
    }

    if (!form.email.trim()) {
      setError("ایمیل کاربر را وارد کنید.");
      return;
    }

    if (!isEdit && (!form.password || form.password.length < 6)) {
      setError("برای کاربر جدید رمز عبور حداقل ۶ کاراکتری وارد کنید.");
      return;
    }

    onSave({
      ...form,
      name: form.name.trim(),
      full_name: form.name.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
      is_active: Boolean(form.active),
      active: Boolean(form.active),
      isActive: Boolean(form.active),
      status: form.active ? "active" : "inactive",
    });
  };

  const openPasswordModal = () => {
    if (typeof onBeforeChangePassword === "function") {
      onBeforeChangePassword();
    }
    setPasswordModalOpen(true);
  };

  const handlePasswordSave = async (newPassword) => {
    if (!form.id) return;

    try {
      await updateUserPassword(form.id, newPassword);
      setPasswordModalOpen(false);
      alert("رمز عبور کاربر با موفقیت تغییر کرد");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.detail || "خطا در تغییر رمز عبور");
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="بستن"
          >
            ×
          </button>

          <h2 className="modal-title">
            {isEdit ? "ویرایش کاربر" : "کاربر جدید"}
          </h2>

          <div className="modal-field">
            <label className="modal-label">نام کاربر</label>
            <input
              className="modal-input"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="نام کاربر"
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">نام کاربری</label>
            <input
              className="modal-input"
              value={form.username}
              onChange={(event) => updateField("username", event.target.value)}
              placeholder="مثلاً admin یا sales01"
              dir="ltr"
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">نقش کاربر</label>
            <select
              className="modal-input modal-select"
              value={form.role}
              onChange={(event) => updateField("role", event.target.value)}
            >
              {ROLES.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
          </div>

          <div className="modal-field">
            <label className="modal-label">ایمیل</label>
            <input
              className="modal-input"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="ایمیل"
            />
          </div>

          {!isEdit && (
            <div className="modal-field">
              <label className="modal-label">رمز عبور</label>
              <input
                className="modal-input"
                type="password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="رمز عبور ورود"
                autoComplete="new-password"
              />
            </div>
          )}

          <div className="modal-field">
            <span className="modal-label">وضعیت کاربر</span>

            <div className="modal-status-row">
              <button
                type="button"
                className={`modal-status-btn ${
                  !form.active ? "selected-inactive" : ""
                }`}
                onClick={() => updateField("active", false)}
              >
                {!form.active && <span>✓</span>}
                غیرفعال
              </button>

              <button
                type="button"
                className={`modal-status-btn ${
                  form.active ? "selected-active" : ""
                }`}
                onClick={() => updateField("active", true)}
              >
                {form.active && <span>✓</span>}
                فعال
              </button>
            </div>
          </div>

          {error && <div className="modal-error">{error}</div>}

          <div className={`modal-actions ${isEdit ? "modal-actions--user-edit" : ""}`}>
            <button
              type="button"
              className="modal-btn-save"
              onClick={handleSubmit}
              title="ذخیره"
              aria-label="ذخیره کاربر"
            >
              <SaveIcon />
            </button>

            {isEdit && (
              <button
                type="button"
                className="modal-btn-change-pass users-change-password-bottom-btn"
                onClick={openPasswordModal}
              >
                تغییر رمز عبور
              </button>
            )}
          </div>
        </div>
      </div>

      {passwordModalOpen && (
        <ChangePasswordModal
          user={form}
          onClose={() => setPasswordModalOpen(false)}
          onSave={handlePasswordSave}
        />
      )}
    </>
  );
}

function UserCard({ user, onEdit, onDeleteRequest, onActivity }) {
  return (
    <div className={`user-card ${user.current ? "user-card--current" : ""}`}>
      <div className="user-card__header">
        <DotsMenu onEdit={onEdit} onActivity={onActivity} />

        <div className="user-card__name-row">
          <span className="user-card__name">
            {user.name} ({user.role})
          </span>

          <span
            className={`user-badge ${user.active ? "active" : "inactive"}`}
            title="وضعیت فقط از پنجره ویرایش کاربر تغییر می‌کند"
          >
            {user.active ? "فعال" : "غیرفعال"}
          </span>
        </div>
      </div>

      <div className="user-card__divider" />

      <div className="user-card__info">
        <div className="user-card__row">
          <CalendarIcon />
          <span className="user-card__row-text">{user.date}</span>
        </div>

        <div className="user-card__row">
          <UsernameIcon />
          <span className="user-card__row-text user-card__row-text--email">
            {user.username ? `@${user.username}` : "-"}
          </span>
        </div>

        <div className="user-card__row">
          <EmailIcon />
          <span className="user-card__row-text user-card__row-text--email">
            {user.email}
          </span>
        </div>
      </div>

      <div className="user-card__divider" />

      <div className="user-card__footer">
        {user.current ? (
          <span className="user-delete-btn user-delete-btn--disabled">
            <TrashIcon />
            حذف
          </span>
        ) : (
          <button type="button" className="user-delete-btn" onClick={onDeleteRequest}>
            <TrashIcon />
            حذف
          </button>
        )}

        {user.current && <span className="user-current">کاربر فعلی</span>}
      </div>
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState("");
  const [searchReadonly, setSearchReadonly] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirmUser, setConfirmUser] = useState(null);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const [activityModal, setActivityModal] = useState({ open: false, user: null });

  const searchName = useMemo(
    () => `oa_user_search_${Date.now()}_${Math.random()}`,
    []
  );

  const allActivityLogs = useMemo(() => getActivityLogs(), [activityRefreshKey]);

  const selectedUserActivityLogs = useMemo(() => {
    if (!activityModal.user) return [];
    return getActivityLogsByUser(activityModal.user);
  }, [activityModal.user, activityRefreshKey]);

  useEffect(() => {
    const handleActivityUpdate = () =>
      setActivityRefreshKey((previous) => previous + 1);

    window.addEventListener(
      "order-assistant-activity-log-updated",
      handleActivityUpdate
    );

    return () => {
      window.removeEventListener(
        "order-assistant-activity-log-updated",
        handleActivityUpdate
      );
    };
  }, []);

  const loadUsers = async () => {
    setLoadingUsers(true);

    try {
      const freshCurrentUser = await fetchCurrentUser();
      const resolvedCurrentUser = freshCurrentUser || getStoredUser();

      if (resolvedCurrentUser) {
        setCurrentUser(resolvedCurrentUser);
      }

      const data = await fetchUsers();
      const normalizedUsers = Array.isArray(data)
        ? data.map((user) => normalizeUserForPage(user, resolvedCurrentUser))
        : [];

      setUsers(normalizedUsers);
    } catch (error) {
      console.error(error);
      alert("خطا در دریافت کاربران از سرور");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();

    function handleAuthChange(event) {
      const user = event.detail || getStoredUser();

      setCurrentUser(user);
      setUsers((previous) =>
        previous.map((item) => normalizeUserForPage(item, user))
      );
    }

    window.addEventListener("oa-auth-changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("oa-auth-changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  const filteredUsers = users.filter((user) => {
    const query = search.trim();

    if (!query) return true;

    return (
      user.name.includes(query) ||
      (user.username || "").includes(query) ||
      (user.email || "").includes(query) ||
      user.role.includes(query)
    );
  });

  const displayedUsers = useMemo(() => {
    return [...filteredUsers].sort((firstUser, secondUser) => {
      if (firstUser.current && !secondUser.current) return -1;
      if (!firstUser.current && secondUser.current) return 1;
      return 0;
    });
  }, [filteredUsers]);

  const handleSave = async (data) => {
    try {
      let savedUser;

      if (data.id) {
        savedUser = await updateUser(data.id, data);
        const normalizedSavedUser = normalizeUserForPage(savedUser, currentUser);

        setUsers((previous) =>
          previous.map((user) =>
            user.id === normalizedSavedUser.id ? normalizedSavedUser : user
          )
        );

        logActivity({
          type: "user_update",
          title: "ویرایش کاربر",
          description: `اطلاعات کاربر ${normalizedSavedUser.name} ویرایش شد.`,
          targetUserId: normalizedSavedUser.id,
          targetUsername: normalizedSavedUser.name,
          targetRole: normalizedSavedUser.role,
          entityType: "user",
          entityId: normalizedSavedUser.id,
        });
      } else {
        savedUser = await createUser(data);
        const normalizedSavedUser = normalizeUserForPage(savedUser, currentUser);

        setUsers((previous) => [normalizedSavedUser, ...previous]);

        logActivity({
          type: "user_create",
          title: "ثبت کاربر",
          description: `کاربر ${normalizedSavedUser.name} ثبت شد.`,
          targetUserId: normalizedSavedUser.id,
          targetUsername: normalizedSavedUser.name,
          targetRole: normalizedSavedUser.role,
          entityType: "user",
          entityId: normalizedSavedUser.id,
        });
      }

      await loadUsers();
      setActivityRefreshKey((previous) => previous + 1);
      setModal(null);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.detail || "خطا در ذخیره کاربر");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmUser) return;

    if (confirmUser.current) {
      alert("امکان حذف کاربر فعلی وجود ندارد");
      setConfirmUser(null);
      return;
    }

    try {
      await deleteUser(confirmUser.id);
      setUsers((previous) => previous.filter((user) => user.id !== confirmUser.id));

      logActivity({
        type: "user_delete",
        title: "حذف کاربر",
        description: `کاربر ${confirmUser.name} حذف شد.`,
        targetUserId: confirmUser.id,
        targetUsername: confirmUser.name,
        targetRole: confirmUser.role,
        entityType: "user",
        entityId: confirmUser.id,
      });

      setActivityRefreshKey((previous) => previous + 1);
      setConfirmUser(null);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.detail || "خطا در حذف کاربر");
    }
  };

  const openCreateModal = () => {
    setSearch("");
    setModal({});
  };

  const openEditModal = (user) => {
    setSearch("");
    setModal(user);
  };

  const clearSearchBeforePasswordModal = () => {
    setSearch("");
    setSearchReadonly(true);

    const activeElement = document.activeElement;

    if (activeElement && typeof activeElement.blur === "function") {
      activeElement.blur();
    }
  };

  return (
    <div className="users-page">
      <div className="users-header">
        <h1 className="users-title">مدیریت کاربران</h1>

        <div className="users-header__actions">
          <label className="users-search">
            <SearchIcon />

            <input
              className="search-input"
              type="search"
              name={searchName}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              readOnly={searchReadonly}
              placeholder="جستجو."
              value={search}
              onMouseDown={() => setSearchReadonly(false)}
              onFocus={() => setSearchReadonly(false)}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <button
            type="button"
            className="add-btn"
            onClick={() => setActivityModal({ open: true, user: null })}
          >
            <ActivityIcon />
            همه فعالیت‌ها
          </button>

          <button type="button" className="add-btn" onClick={openCreateModal}>
            <PlusIcon />
            کاربر جدید
          </button>
        </div>
      </div>

      <div className="users-grid">
        {loadingUsers ? (
          <div className="empty-state">در حال دریافت کاربران...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">کاربری ثبت نشده است.</div>
        ) : (
          displayedUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={() => openEditModal(user)}
              onDeleteRequest={() => setConfirmUser(user)}
              onActivity={() => setActivityModal({ open: true, user })}
            />
          ))
        )}
      </div>

      {confirmUser && (
        <ConfirmModal
          user={confirmUser}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmUser(null)}
        />
      )}

      {modal !== null && (
        <UserModal
          user={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onBeforeChangePassword={clearSearchBeforePasswordModal}
        />
      )}

      {activityModal.open && (
        <ActivityReportModal
          title={
            activityModal.user
              ? `گزارش فعالیت ${activityModal.user.name}`
              : "گزارش فعالیت تمامی کاربران"
          }
          logs={activityModal.user ? selectedUserActivityLogs : allActivityLogs}
          onClose={() => setActivityModal({ open: false, user: null })}
        />
      )}
    </div>
  );
}