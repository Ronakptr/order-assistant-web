import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Customers.css";
import { createCustomer, deleteCustomer, fetchCustomers, updateCustomer } from "../../api/customers";

const CUSTOMERS_STORAGE_KEY = "order_assistant_customers";

const ACCOUNTING_SETTINGS_KEYS = [
  "order_assistant_accounting_settings",
  "order_assistant_settings",
  "order_assistant_app_settings",
  "oa_settings",
  "accounting_settings",
  "app_settings",
  "settings",
];

const INITIAL_CUSTOMERS = [
  {
    uid: 1,
    personId: "CUS-0001",
    customerId: "CUS-0001",
    name: "رضا پناهی دوست",
    phone: "09120000000",
    quality: "عادی",
    active: true,
    sourceType: "عادی",
    description: "",
    accountingSoftware: "",
  },
  {
    uid: 2,
    personId: "CUS-0002",
    customerId: "CUS-0002",
    name: "سارا احمدی",
    phone: "09121111111",
    quality: "ویژه",
    active: true,
    sourceType: "عادی",
    description: "",
    accountingSoftware: "",
  },
  {
    uid: 3,
    personId: "CUS-0003",
    customerId: "CUS-0003",
    name: "مهدی نوری",
    phone: "09122222222",
    quality: "بدحساب",
    active: false,
    sourceType: "عادی",
    description: "",
    accountingSoftware: "",
  },
];

function toEnglishDigits(value) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
}

function toPersianDigits(value) {
  return String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit]);
}

function makeCustomerCode(count) {
  return `CUS-${String(count + 1).padStart(4, "0")}`;
}

function normalizeCustomerCode(code, index = 0) {
  const raw = toEnglishDigits(code).trim().toUpperCase();

  if (/^CUS-\d{4,}$/.test(raw)) {
    return raw;
  }

  if (raw) {
    return raw;
  }

  return makeCustomerCode(index);
}

function normalizeSoftwareName(value) {
  const text = String(value || "").trim();

  if (!text) return "";

  const lower = text.toLowerCase();

  if (text.includes("هلو") || lower.includes("holoo") || lower.includes("holo")) {
    return "هلو";
  }

  if (text.includes("آسان") || text.includes("اسان") || lower.includes("asan")) {
    return "آسان";
  }

  if (text.includes("سورن") || lower.includes("soren")) {
    return "سورن";
  }

  if (text.includes("سپیدار") || lower.includes("sepidar")) {
    return "سپیدار";
  }

  if (text.includes("محک") || lower.includes("mahak")) {
    return "محک";
  }

  return text;
}

function getSelectedAccountingSoftware() {
  for (const key of ACCOUNTING_SETTINGS_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);

      const software =
        parsed?.accountingSoftware ||
        parsed?.selectedAccountingSoftware ||
        parsed?.accountingSystem ||
        parsed?.accountingApp ||
        parsed?.software ||
        parsed?.softwareName ||
        parsed?.accounting?.software ||
        parsed?.accounting?.name ||
        parsed?.accounting?.system ||
        parsed?.company?.accountingSoftware ||
        "";

      const normalized = normalizeSoftwareName(software);

      if (normalized) return normalized;
    } catch {
      const rawText = localStorage.getItem(key);
      const normalized = normalizeSoftwareName(rawText);
      if (normalized) return normalized;
    }
  }

  return "";
}

function normalizeActiveValue(customer) {
  if (typeof customer?.active === "boolean") return customer.active;
  if (typeof customer?.is_active === "boolean") return customer.is_active;
  if (typeof customer?.isActive === "boolean") return customer.isActive;

  const status = String(customer?.status || "")
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return ![
    "غیرفعال",
    "غيرفعال",
    "غیر فعال",
    "غير فعال",
    "inactive",
    "disabled",
    "false",
    "0",
  ].includes(status);
}

function normalizeCustomer(customer, index) {
  const rawCustomerCode =
    customer?.personId ||
    customer?.customerId ||
    customer?.customer_code ||
    customer?.customerCode ||
    customer?.oa_internal_code ||
    customer?.oaInternalCode ||
    customer?.accounting_id ||
    customer?.accountingId ||
    customer?.code ||
    "";

  const uid =
    customer?.uid ??
    customer?.customerUid ??
    customer?.personUid ??
    customer?.id ??
    rawCustomerCode ??
    index;

  const personId = normalizeCustomerCode(rawCustomerCode || uid, index);

  return {
    ...customer,

    uid,
    id: customer?.id ?? uid,

    personId,
    customerId: personId,

    accountingId:
      customer?.accountingId ??
      customer?.accounting_id ??
      personId,

    oaInternalCode:
      customer?.oaInternalCode ??
      customer?.oa_internal_code ??
      personId,

    name:
      customer?.name ??
      customer?.customerName ??
      customer?.customer_name ??
      customer?.fullName ??
      customer?.full_name ??
      customer?.title ??
      "",

    phone:
      customer?.phone ??
      customer?.mobile ??
      customer?.customerPhone ??
      customer?.customer_phone ??
      customer?.mobilePhone ??
      customer?.mobile_phone ??
      "",

    quality:
      customer?.quality ??
      customer?.customerQuality ??
      customer?.customer_quality ??
      customer?.customerNote ??
      "عادی",

    active: normalizeActiveValue(customer),

    sourceType:
      customer?.sourceType ??
      customer?.source_type ??
      customer?.source ??
      customer?.registerType ??
      customer?.register_type ??
      customer?.origin ??
      "عادی",

    description:
      customer?.description ??
      customer?.notes ??
      customer?.comment ??
      "",

    accountingSoftware:
      customer?.accountingSoftware ??
      customer?.accounting_software ??
      customer?.software ??
      customer?.accountingSystem ??
      customer?.accounting_system ??
      "",
  };
}

function normalizeCustomerListResponse(data) {
  if (Array.isArray(data)) {
    return data.map(normalizeCustomer);
  }

  if (Array.isArray(data?.customers)) {
    return data.customers.map(normalizeCustomer);
  }

  if (Array.isArray(data?.items)) {
    return data.items.map(normalizeCustomer);
  }

  if (Array.isArray(data?.data)) {
    return data.data.map(normalizeCustomer);
  }

  if (Array.isArray(data?.results)) {
    return data.results.map(normalizeCustomer);
  }

  return [];
}

function loadCustomers() {
  try {
    const saved = localStorage.getItem(CUSTOMERS_STORAGE_KEY);

    if (!saved) {
      const normalizedInitial = INITIAL_CUSTOMERS.map(normalizeCustomer);

      localStorage.setItem(
        CUSTOMERS_STORAGE_KEY,
        JSON.stringify(normalizedInitial)
      );

      return normalizedInitial;
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      const normalizedInitial = INITIAL_CUSTOMERS.map(normalizeCustomer);

      localStorage.setItem(
        CUSTOMERS_STORAGE_KEY,
        JSON.stringify(normalizedInitial)
      );

      return normalizedInitial;
    }

    const normalizedCustomers = parsed.map((customer, index) =>
      normalizeCustomer(customer, index)
    );

    localStorage.setItem(
      CUSTOMERS_STORAGE_KEY,
      JSON.stringify(normalizedCustomers)
    );

    return normalizedCustomers;
  } catch (error) {
    console.error("خطا در خواندن مشتریان:", error);
    return INITIAL_CUSTOMERS.map(normalizeCustomer);
  }
}

function saveCustomers(customers) {
  try {
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));

    window.dispatchEvent(
      new CustomEvent("order-assistant-customers-updated", {
        detail: customers,
      })
    );
  } catch (error) {
    console.error("خطا در ذخیره مشتریان:", error);
  }
}

function customerToApiPayload(customer, accountingSoftware = "") {
  const code = String(customer?.personId || customer?.customerId || customer?.accountingId || "").trim();

  return {
    customer_code: code,
    name: String(customer?.name || "").trim(),
    phone: String(customer?.phone || "").trim(),
    quality: customer?.quality || "عادی",
    is_active: Boolean(customer?.active),
    source_type: customer?.sourceType || "عادی",
    description: customer?.description || null,
    accounting_software: customer?.accountingSoftware || accountingSoftware || null,
    accounting_id: customer?.accountingId || code,
    oa_internal_code: customer?.oaInternalCode || code,
  };
}

function generateCustomerCode(customers) {
  const numericCodes = customers
    .map((customer) => {
      const code = String(customer.personId || customer.customerId || "");
      const match = toEnglishDigits(code).match(/CUS-(\d+)/i);
      return match ? Number(match[1]) : null;
    })
    .filter(Number.isFinite);

  const highestCode = numericCodes.length > 0 ? Math.max(...numericCodes) : 0;

  return `CUS-${String(highestCode + 1).padStart(4, "0")}`;
}

function SortArrow({ column, sortKey, sortDirection }) {
  const isActive = column === sortKey;

  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={
        isActive ? "customers-sort-arrow is-active" : "customers-sort-arrow"
      }
      aria-hidden="true"
    >
      {isActive && sortDirection === "asc" && (
        <polyline points="18 15 12 9 6 15" />
      )}

      {isActive && sortDirection === "desc" && (
        <polyline points="6 9 12 15 18 9" />
      )}

      {!isActive && (
        <>
          <polyline points="18 15 12 9 6 15" />
          <polyline points="6 17 12 23 18 17" />
        </>
      )}
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
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13.7 5.3 18.7 10.3" />
      <path d="M4.5 19.5h4.2L19.2 9a2.35 2.35 0 0 0 0-3.3l-.9-.9a2.35 2.35 0 0 0-3.3 0L4.5 15.3v4.2Z" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg
      width="19"
      height="19"
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

function DeleteIcon() {
  return (
    <svg
      width="19"
      height="19"
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
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function CustomerStatusBadge({ active }) {
  return (
    <span className={`customer-badge ${active ? "active" : "inactive"}`}>
      {active ? "فعال" : "غیرفعال"}
    </span>
  );
}

function DeleteConfirmDialog({ customerName, onCancel, onConfirm }) {
  return (
    <div
      className="customer-delete-confirm-layer"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div
        className="customer-delete-confirm-box"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="customer-delete-confirm-icon">
          <TrashIcon />
        </div>

        <p className="customer-delete-confirm-text">
          آیا از حذف مشتری{" "}
          <strong>{customerName || "انتخاب‌شده"}</strong> اطمینان دارید؟
        </p>

        <div className="customer-delete-confirm-actions">
          <button
            type="button"
            className="customer-delete-confirm-cancel"
            onClick={onCancel}
          >
            خیر
          </button>

          <button
            type="button"
            className="customer-delete-confirm-submit"
            onClick={onConfirm}
          >
            بله، حذف شود
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerModal({
  customer,
  existingCustomers,
  accountingSoftware,
  onClose,
  onSave,
  onDelete,
}) {
  const isEdit = Boolean(customer?.uid);

  const idLabel = accountingSoftware
    ? `شناسه مشتری ${accountingSoftware}`
    : "شناسه شخص";

  const [form, setForm] = useState({
    personId:
      customer?.personId ||
      customer?.customerId ||
      generateCustomerCode(existingCustomers),
    name: customer?.name || "",
    phone: customer?.phone || "",
    quality: customer?.quality || "عادی",
    active: customer?.active ?? true,
    sourceType: customer?.sourceType || "عادی",
    description: customer?.description || "",
  });

  const [error, setError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError("");
  };

  const handleSubmit = () => {
    if (!String(form.personId).trim()) {
      setError(`${idLabel} را وارد کنید.`);
      return;
    }

    if (!form.name.trim()) {
      setError("نام مشتری را وارد کنید.");
      return;
    }

    if (!form.phone.trim()) {
      setError("تلفن همراه را وارد کنید.");
      return;
    }

    const duplicateId = existingCustomers.some(
      (item) =>
        String(item.personId || item.customerId) === String(form.personId) &&
        String(item.uid) !== String(customer?.uid)
    );

    if (duplicateId) {
      setError("این شناسه قبلاً ثبت شده است.");
      return;
    }

    onSave({
      uid: customer?.uid || Date.now(),
      personId: String(form.personId).trim(),
      customerId: String(form.personId).trim(),
      accountingId: String(form.personId).trim(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      quality: form.quality,
      active: form.active,
      sourceType: form.sourceType,
      description: form.description.trim(),
      accountingSoftware,
    });
  };

  const openDeleteConfirm = () => {
    if (!isEdit) return;
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!isEdit) return;
    setDeleteConfirmOpen(false);
    onDelete(customer);
  };

  return (
    <div className="customer-modal-overlay" onMouseDown={onClose}>
      <div
        className="customer-modal-box"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="customer-modal-close"
          onClick={onClose}
          aria-label="بستن"
        >
          ×
        </button>

        <h2 className="customer-modal-title">
          {isEdit ? "ویرایش مشتری" : "مشتری جدید"}
        </h2>

        <div className="customer-modal-form-grid">
          <div className="customer-modal-field">
            <label className="customer-modal-label" htmlFor="customer-id">
              {idLabel}
            </label>

            <input
              id="customer-id"
              className="customer-modal-input customer-modal-input--code"
              value={form.personId}
              onChange={(event) => updateField("personId", event.target.value)}
            />
          </div>

          <div className="customer-modal-field">
            <label className="customer-modal-label" htmlFor="customer-name">
              نام مشتری
            </label>

            <input
              id="customer-name"
              className="customer-modal-input"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="نام مشتری را وارد کنید"
              autoFocus
            />
          </div>

          <div className="customer-modal-field">
            <label className="customer-modal-label" htmlFor="customer-phone">
              تلفن همراه
            </label>

            <input
              id="customer-phone"
              className="customer-modal-input customer-modal-input--phone"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="مثلاً 09121234567"
            />
          </div>

          <div className="customer-modal-field">
            <label className="customer-modal-label" htmlFor="customer-quality">
              کیفیت مشتری
            </label>

            <select
              id="customer-quality"
              className="customer-modal-input customer-modal-select"
              value={form.quality}
              onChange={(event) => updateField("quality", event.target.value)}
            >
              <option value="عادی">عادی</option>
              <option value="خوب">خوب</option>
              <option value="ویژه">ویژه</option>
              <option value="بدحساب">بدحساب</option>
            </select>
          </div>

          <div className="customer-modal-field">
            <label className="customer-modal-label" htmlFor="customer-source">
              توضیحات ثبت
            </label>

            <select
              id="customer-source"
              className="customer-modal-input customer-modal-select"
              value={form.sourceType}
              onChange={(event) => updateField("sourceType", event.target.value)}
            >
              <option value="عادی">عادی</option>
              <option value="وارد شده از نرم افزار حسابداری">
                وارد شده از نرم افزار حسابداری
              </option>
            </select>
          </div>

          <div className="customer-modal-field">
            <label
              className="customer-modal-label"
              htmlFor="customer-description"
            >
              توضیحات
            </label>

            <input
              id="customer-description"
              className="customer-modal-input"
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="توضیحات تکمیلی"
            />
          </div>

          <div className="customer-modal-field customer-modal-field--full">
            <span className="customer-modal-label">وضعیت مشتری</span>

            <div className="customer-modal-status-row">
              <button
                type="button"
                className={`customer-modal-status-btn ${
                  !form.active ? "selected-inactive" : ""
                }`}
                onClick={() => updateField("active", false)}
              >
                {!form.active && <span>✓</span>}
                غیرفعال
              </button>

              <button
                type="button"
                className={`customer-modal-status-btn ${
                  form.active ? "selected-active" : ""
                }`}
                onClick={() => updateField("active", true)}
              >
                {form.active && <span>✓</span>}
                فعال
              </button>
            </div>
          </div>
        </div>

        {error && <div className="customer-modal-error">{error}</div>}

        <div className="customer-modal-actions">
          <button
            type="button"
            className="customer-modal-btn-save"
            onClick={handleSubmit}
            title="ذخیره"
            aria-label="ذخیره مشتری"
          >
            <SaveIcon />
          </button>

          {isEdit && (
            <button
              type="button"
              className="customer-modal-btn-delete"
              onClick={openDeleteConfirm}
              title="حذف"
              aria-label="حذف مشتری"
            >
              <DeleteIcon />
            </button>
          )}
        </div>
      </div>

      {deleteConfirmOpen && (
        <DeleteConfirmDialog
          customerName={customer?.name}
          onCancel={() => setDeleteConfirmOpen(false)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

export default function Customers() {
  const navigate = useNavigate();
  const location = useLocation();

  const cameFromDashboard = location.state?.fromDashboard === true;
  const isNewCustomerRoute = location.pathname === "/customers/new";

  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalCustomer, setModalCustomer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [sortKey, setSortKey] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  const [accountingSoftware, setAccountingSoftware] = useState(() =>
    getSelectedAccountingSoftware()
  );

  const idColumnLabel = accountingSoftware
    ? `شناسه مشتری ${accountingSoftware}`
    : "شناسه شخص";

  const reloadCustomers = async () => {
    setCustomersLoading(true);

    try {
      const apiResponse = await fetchCustomers();
      const normalizedCustomers = normalizeCustomerListResponse(apiResponse);

      setCustomers(normalizedCustomers);
      setAccountingSoftware(getSelectedAccountingSoftware());
    } catch (error) {
      console.error("خطا در دریافت مشتریان:", error);
      alert(error?.message || "خطا در دریافت مشتریان از سرور");
    } finally {
      setCustomersLoading(false);
    }
  };

  useEffect(() => {
    if (isNewCustomerRoute || location.state?.openNewCustomer) {
      setModalCustomer(null);
      setIsModalOpen(true);
    }
  }, [isNewCustomerRoute, location.state]);

  useEffect(() => {
    reloadCustomers();
  }, []);

  useEffect(() => {
    const refreshCustomers = () => {
      reloadCustomers();
    };

    window.addEventListener("focus", refreshCustomers);
    window.addEventListener("order-assistant-customers-updated", refreshCustomers);

    return () => {
      window.removeEventListener("focus", refreshCustomers);
      window.removeEventListener(
        "order-assistant-customers-updated",
        refreshCustomers
      );
    };
  }, [search]);

  const openAddModal = () => {
    setModalCustomer(null);
    setIsModalOpen(true);
  };

  const openEditModal = (customer) => {
    setModalCustomer(customer);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setModalCustomer(null);
    setIsModalOpen(false);

    if (cameFromDashboard) {
      navigate("/dashboard");
      return;
    }

    if (isNewCustomerRoute) {
      navigate("/customers");
    }
  };

  const handleSaveCustomer = async (savedCustomer) => {
    const normalizedSavedCustomer = normalizeCustomer(
      savedCustomer,
      customers.length
    );

    try {
      const payload = customerToApiPayload(
        normalizedSavedCustomer,
        accountingSoftware
      );

      if (modalCustomer?.uid) {
        await updateCustomer(modalCustomer.uid, payload);
      } else {
        await createCustomer(payload);
      }

      await reloadCustomers();

      window.dispatchEvent(
        new CustomEvent("order-assistant-customers-updated")
      );

      closeModal();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      alert(detail || "خطا در ذخیره مشتری");
    }
  };

  const handleDeleteCustomer = async (customerToDelete) => {
    try {
      await deleteCustomer(customerToDelete.uid);
      await reloadCustomers();

      window.dispatchEvent(
        new CustomEvent("order-assistant-customers-updated")
      );

      closeModal();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      alert(detail || "خطا در حذف مشتری");
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((previous) => (previous === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }

    setCurrentPage(1);
  };

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = customers.filter((customer) => {
      if (!query) return true;

      const statusText = customer.active ? "فعال" : "غیرفعال";

      return [
        customer.personId,
        customer.customerId,
        customer.accountingId,
        customer.name,
        customer.phone,
        customer.quality,
        customer.sourceType,
        customer.description,
        statusText,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );
    });

    if (!sortKey) return result;

    return [...result].sort((first, second) => {
      let firstValue = first[sortKey];
      let secondValue = second[sortKey];

      if (sortKey === "active") {
        firstValue = first.active ? 1 : 0;
        secondValue = second.active ? 1 : 0;
      }

      const comparison = String(firstValue ?? "").localeCompare(
        String(secondValue ?? ""),
        "fa",
        {
          numeric: true,
          sensitivity: "base",
        }
      );

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [customers, search, sortKey, sortDirection]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCustomers.length / rowsPerPage)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const displayedCustomers = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * rowsPerPage;

    return filteredCustomers.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredCustomers, safeCurrentPage, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (isNewCustomerRoute) {
    return (
      <div className="customers-page">
        <CustomerModal
          customer={modalCustomer}
          existingCustomers={customers}
          accountingSoftware={accountingSoftware}
          onClose={closeModal}
          onSave={handleSaveCustomer}
          onDelete={handleDeleteCustomer}
        />
      </div>
    );
  }

  return (
    <div className="customers-page">
      <header className="customers-header">
        <h1 className="customers-title">مدیریت مشتریان</h1>

        <div className="customers-header__actions">
          <button
            type="button"
            className="customer-add-btn"
            onClick={openAddModal}
          >
            <PlusIcon />
            <span>مشتری جدید</span>
          </button>

          <label className="customers-search">
            <SearchIcon />

            <input
              className="customers-search-input"
              type="search"
              value={search}
              placeholder="جستجو..."
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
            />
          </label>
        </div>
      </header>

      <div className="customers-table-wrap">
        <table className="customers-table">
          <colgroup>
            <col className="customers-col-edit" />
            <col className="customers-col-id" />
            <col className="customers-col-name" />
            <col className="customers-col-phone" />
            <col className="customers-col-quality" />
            <col className="customers-col-source" />
            <col className="customers-col-description" />
            <col className="customers-col-status" />
          </colgroup>

          <thead>
            <tr>
              <th className="customers-th customers-th-edit" />

              <th
                className="customers-th customers-sortable"
                onClick={() => handleSort("personId")}
              >
                <span className="customers-th-inner">
                  <SortArrow
                    column="personId"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                  />
                  {idColumnLabel}
                </span>
              </th>

              <th
                className="customers-th customers-sortable"
                onClick={() => handleSort("name")}
              >
                <span className="customers-th-inner">
                  <SortArrow
                    column="name"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                  />
                  نام مشتری
                </span>
              </th>

              <th
                className="customers-th customers-sortable"
                onClick={() => handleSort("phone")}
              >
                <span className="customers-th-inner">
                  <SortArrow
                    column="phone"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                  />
                  تلفن همراه
                </span>
              </th>

              <th
                className="customers-th customers-sortable"
                onClick={() => handleSort("quality")}
              >
                <span className="customers-th-inner">
                  <SortArrow
                    column="quality"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                  />
                  کیفیت مشتری
                </span>
              </th>

              <th
                className="customers-th customers-sortable"
                onClick={() => handleSort("sourceType")}
              >
                <span className="customers-th-inner">
                  <SortArrow
                    column="sourceType"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                  />
                  توضیحات ثبت
                </span>
              </th>

              <th
                className="customers-th customers-sortable"
                onClick={() => handleSort("description")}
              >
                <span className="customers-th-inner">
                  <SortArrow
                    column="description"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                  />
                  توضیحات
                </span>
              </th>

              <th
                className="customers-th customers-sortable"
                onClick={() => handleSort("active")}
              >
                <span className="customers-th-inner">
                  <SortArrow
                    column="active"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                  />
                  وضعیت مشتری
                </span>
              </th>
            </tr>
          </thead>

          <tbody>
            {customersLoading ? (
              <tr>
                <td colSpan={8} className="customers-empty">
                  در حال دریافت مشتریان...
                </td>
              </tr>
            ) : displayedCustomers.length === 0 ? (
              <tr>
                <td colSpan={8} className="customers-empty">
                  مشتری برای نمایش وجود ندارد.
                </td>
              </tr>
            ) : (
              displayedCustomers.map((customer, index) => (
                <tr
                  key={customer.uid}
                  className={
                    index < displayedCustomers.length - 1
                      ? "customers-row customers-row--border"
                      : "customers-row"
                  }
                  onDoubleClick={() => openEditModal(customer)}
                  title="برای ویرایش مشتری دوبار کلیک کنید"
                >
                  <td className="customers-td customers-td-edit">
                    <button
                      type="button"
                      className="customers-edit-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditModal(customer);
                      }}
                      title="ویرایش مشتری"
                      aria-label={`ویرایش ${customer.name}`}
                    >
                      <EditIcon />
                    </button>
                  </td>

                  <td className="customers-td customers-id">
                    {customer.personId}
                  </td>

                  <td className="customers-td">{customer.name}</td>

                  <td className="customers-td customers-phone">
                    {customer.phone}
                  </td>

                  <td className="customers-td">{customer.quality}</td>

                  <td className="customers-td">{customer.sourceType}</td>

                  <td className="customers-td">
                    {customer.description || "-"}
                  </td>

                  <td className="customers-td customers-td-status">
                    <CustomerStatusBadge active={customer.active} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="customers-pagination">
        <div className="customers-pagination-info">
          <span>
            نمایش صفحه {toPersianDigits(safeCurrentPage)} از{" "}
            {toPersianDigits(totalPages)}
          </span>

          <span className="customers-pagination-total">
            تعداد کل: {toPersianDigits(filteredCustomers.length)}
          </span>
        </div>

        <div className="customers-pagination-controls">
          <label className="customers-rows-per-page">
            <span>تعداد در صفحه:</span>

            <select
              value={rowsPerPage}
              onChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={5}>۵</option>
              <option value={8}>۸</option>
              <option value={10}>۱۰</option>
              <option value={15}>۱۵</option>
            </select>
          </label>

          <button
            type="button"
            className="customers-pagination-btn"
            disabled={safeCurrentPage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            قبلی
          </button>

          <button
            type="button"
            className="customers-pagination-btn"
            disabled={safeCurrentPage === totalPages}
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
          >
            بعدی
          </button>
        </div>
      </div>

      {isModalOpen && (
        <CustomerModal
          customer={modalCustomer}
          existingCustomers={customers}
          accountingSoftware={accountingSoftware}
          onClose={closeModal}
          onSave={handleSaveCustomer}
          onDelete={handleDeleteCustomer}
        />
      )}
    </div>
  );
}