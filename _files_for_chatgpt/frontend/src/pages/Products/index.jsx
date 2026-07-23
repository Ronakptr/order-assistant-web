import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Products.css";
import api from "../../api/client";

const PRODUCTS_STORAGE_KEY = "order_assistant_products";

const SYSTEM_MESSAGE_KEYS = [
  "order_assistant_system_messages",
  "order_assistant_notifications",
  "order_assistant_dashboard_notifications",
];

const INITIAL_PRODUCTS = [
  {
    uid: 1,
    id: "PRD-0001",
    productCode: "PRD-0001",
    name: "والپست U",
    defaultSalePrice: "۱۲۳۴۵",
    basePrice: "۱۲۳۴۵",
    unitPrice: "۱۲۳۴۵",
    price: "۱۲۳۴۵",
    factoryPurchasePrice: "",
    remainingStock: "",
    warningStock: "",
    salePrice: "تعداد",
    active: false,
  },
  {
    uid: 2,
    id: "PRD-0002",
    productCode: "PRD-0002",
    name: "والپست H",
    defaultSalePrice: "۱۲۳۴۵",
    basePrice: "۱۲۳۴۵",
    unitPrice: "۱۲۳۴۵",
    price: "۱۲۳۴۵",
    factoryPurchasePrice: "",
    remainingStock: "",
    warningStock: "",
    salePrice: "تعداد",
    active: false,
  },
  {
    uid: 3,
    id: "PRD-0003",
    productCode: "PRD-0003",
    name: "میلگرد بستر",
    defaultSalePrice: "۱۲۳۴۵",
    basePrice: "۱۲۳۴۵",
    unitPrice: "۱۲۳۴۵",
    price: "۱۲۳۴۵",
    factoryPurchasePrice: "",
    remainingStock: "",
    warningStock: "",
    salePrice: "طول",
    active: true,
  },
  {
    uid: 4,
    id: "PRD-0004",
    productCode: "PRD-0004",
    name: "گیره و قلاب",
    defaultSalePrice: "۱۲۳۴۵",
    basePrice: "۱۲۳۴۵",
    unitPrice: "۱۲۳۴۵",
    price: "۱۲۳۴۵",
    factoryPurchasePrice: "",
    remainingStock: "",
    warningStock: "",
    salePrice: "تعداد",
    active: true,
  },
  {
    uid: 5,
    id: "PRD-0005",
    productCode: "PRD-0005",
    name: "تسمه قالب‌بندی",
    defaultSalePrice: "۱۲۳۴۵",
    basePrice: "۱۲۳۴۵",
    unitPrice: "۱۲۳۴۵",
    price: "۱۲۳۴۵",
    factoryPurchasePrice: "",
    remainingStock: "",
    warningStock: "",
    salePrice: "طول",
    active: true,
  },
  {
    uid: 6,
    id: "PRD-0006",
    productCode: "PRD-0006",
    name: "ورق سیاه ST37",
    defaultSalePrice: "۱۲۳۴۵",
    basePrice: "۱۲۳۴۵",
    unitPrice: "۱۲۳۴۵",
    price: "۱۲۳۴۵",
    factoryPurchasePrice: "",
    remainingStock: "",
    warningStock: "",
    salePrice: "وزن",
    active: true,
  },
  {
    uid: 7,
    id: "PRD-0007",
    productCode: "PRD-0007",
    name: "نبشی سبک",
    defaultSalePrice: "۱۲۳۴۵",
    basePrice: "۱۲۳۴۵",
    unitPrice: "۱۲۳۴۵",
    price: "۱۲۳۴۵",
    factoryPurchasePrice: "",
    remainingStock: "",
    warningStock: "",
    salePrice: "وزن",
    active: true,
  },
  {
    uid: 8,
    id: "PRD-0008",
    productCode: "PRD-0008",
    name: "ناودانی سبک",
    defaultSalePrice: "۱۲۳۴۵",
    basePrice: "۱۲۳۴۵",
    unitPrice: "۱۲۳۴۵",
    price: "۱۲۳۴۵",
    factoryPurchasePrice: "",
    remainingStock: "",
    warningStock: "",
    salePrice: "وزن",
    active: false,
  },
];

function toEnglishDigits(value) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
}

function extractNumber(value) {
  return toEnglishDigits(value).replace(/[^\d.]/g, "");
}

function toNumber(value) {
  const normalized = extractNumber(value);
  if (!normalized) return 0;

  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function toPersianDigits(value) {
  return String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit]);
}

function makeProductCode(count) {
  return `PRD-${String(count + 1).padStart(4, "0")}`;
}

function normalizeProductCode(code, index = 0) {
  const raw = toEnglishDigits(code).trim().toUpperCase();

  if (/^PRD-\d{4,}$/.test(raw)) {
    return raw;
  }

  return makeProductCode(index);
}

function normalizeProduct(product, index) {
  const productCode = normalizeProductCode(
    product?.productCode ||
      product?.product_code ||
      product?.code ||
      product?.id ||
      "",
    index
  );

  const defaultSalePrice =
    product?.defaultSalePrice ??
    product?.saleDefaultPrice ??
    product?.sellingPrice ??
    product?.basePrice ??
    product?.defaultPrice ??
    product?.price ??
    product?.unitPrice ??
    "";

  return {
    uid:
      product?.uid ??
      product?.productUid ??
      product?.product_code ??
      product?.productCode ??
      productCode,

    id: productCode,
    code: productCode,
    productCode,

    name:
      product?.name ??
      product?.productName ??
      product?.product_name ??
      product?.title ??
      "",

    productName:
      product?.name ??
      product?.productName ??
      product?.product_name ??
      product?.title ??
      "",

    basePrice: String(defaultSalePrice ?? ""),
    defaultSalePrice: String(defaultSalePrice ?? ""),
    unitPrice: String(defaultSalePrice ?? ""),
    price: String(defaultSalePrice ?? ""),

    factoryPurchasePrice: String(
      product?.factoryPurchasePrice ??
        product?.factoryBuyPrice ??
        product?.purchasePrice ??
        product?.buyPrice ??
        product?.factoryPrice ??
        ""
    ),

    remainingStock: String(
      product?.remainingStock ??
        product?.inventory ??
        product?.stock ??
        product?.availableStock ??
        ""
    ),

    warningStock: String(
      product?.warningStock ??
        product?.alertStock ??
        product?.minimumStock ??
        product?.lowStockThreshold ??
        ""
    ),

    salePrice:
      product?.salePrice ??
      product?.defaultBase ??
      product?.priceBase ??
      product?.pricingBasis ??
      product?.quantityMethod ??
      "تعداد",

    active:
      typeof product?.active === "boolean"
        ? product.active
        : product?.status === "غیرفعال" || product?.status === "inactive"
          ? false
          : true,
  };
}

function apiProductToUi(product, index = 0) {
  const productCode = normalizeProductCode(
    product?.product_code || product?.productCode || product?.id || "",
    index
  );

  return normalizeProduct({
    uid: product?.id ?? productCode,
    backendId: product?.id,
    id: productCode,
    code: productCode,
    productCode,
    name: product?.name || "",
    productName: product?.name || "",
    defaultSalePrice:
      product?.default_sale_price ??
      product?.base_price ??
      product?.unit_price ??
      product?.price ??
      "",
    basePrice:
      product?.default_sale_price ??
      product?.base_price ??
      product?.unit_price ??
      product?.price ??
      "",
    unitPrice:
      product?.default_sale_price ??
      product?.base_price ??
      product?.unit_price ??
      product?.price ??
      "",
    price:
      product?.default_sale_price ??
      product?.base_price ??
      product?.unit_price ??
      product?.price ??
      "",
    factoryPurchasePrice: product?.factory_purchase_price ?? "",
    remainingStock: product?.remaining_stock ?? "",
    warningStock: product?.warning_stock ?? "",
    salePrice:
      product?.sale_price ??
      product?.pricing_basis ??
      product?.quantity_method ??
      "تعداد",
    active: product?.is_active ?? true,
  });
}

function uiProductToApi(product) {
  return {
    product_code: String(product.productCode || product.id || "").trim() || null,
    name: String(product.name || "").trim(),
    default_sale_price: String(product.defaultSalePrice || "").trim(),
    base_price: String(product.basePrice || product.defaultSalePrice || "").trim(),
    unit_price: String(product.unitPrice || product.defaultSalePrice || "").trim(),
    price: toNumber(product.defaultSalePrice || product.price || 0),
    factory_purchase_price: String(product.factoryPurchasePrice || "").trim(),
    remaining_stock: String(product.remainingStock || "").trim(),
    warning_stock: String(product.warningStock || "").trim(),
    sale_price: product.salePrice || "تعداد",
    is_active: Boolean(product.active),
  };
}

async function fetchProductsFromServer() {
  const response = await api.get("/products/");
  return Array.isArray(response.data)
    ? response.data.map((product, index) => apiProductToUi(product, index))
    : [];
}

function saveProducts(products) {
  window.dispatchEvent(
    new CustomEvent("order-assistant-products-updated", {
      detail: products,
    })
  );
}

function safeParseArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function createLowStockSystemMessage(product) {
  const remainingStock = toNumber(product.remainingStock);
  const warningStock = toNumber(product.warningStock);

  if (!product.warningStock || warningStock <= 0) return;
  if (remainingStock > warningStock) return;

  const lowStockKey = `product-low-stock-${product.uid}-${remainingStock}-${warningStock}`;

  const messageText = `موجودی محصول «${product.name}» به ${toPersianDigits(
    remainingStock
  )} رسیده است. حد هشدار این محصول ${toPersianDigits(warningStock)} است.`;

  const message = {
    id: lowStockKey,
    type: "system",
    category: "inventory",
    title: "هشدار موجودی محصول",
    message: messageText,
    text: messageText,
    description: messageText,
    unread: true,
    createdAt: new Date().toISOString(),
    date: new Date().toLocaleDateString("fa-IR"),
    entityType: "product",
    entityId: product.uid,
    productId: product.productCode,
    productCode: product.productCode,
    productName: product.name,
    metadata: {
      lowStockKey,
      remainingStock,
      warningStock,
    },
  };

  SYSTEM_MESSAGE_KEYS.forEach((key) => {
    const existingMessages = safeParseArray(key);
    const alreadyExists = existingMessages.some((item) => {
      return (
        item?.id === lowStockKey ||
        item?.metadata?.lowStockKey === lowStockKey
      );
    });

    if (alreadyExists) return;

    localStorage.setItem(key, JSON.stringify([message, ...existingMessages]));
  });

  window.dispatchEvent(
    new CustomEvent("order-assistant-system-message-created", {
      detail: message,
    })
  );

  window.dispatchEvent(
    new CustomEvent("order-assistant-notifications-updated", {
      detail: message,
    })
  );
}

function generateProductCode(products) {
  const numericCodes = products
    .map((product) => {
      const code = String(product.productCode || product.id || "");
      const match = toEnglishDigits(code).match(/PRD-(\d+)/i);
      return match ? Number(match[1]) : null;
    })
    .filter(Number.isFinite);

  const highestCode = numericCodes.length > 0 ? Math.max(...numericCodes) : 0;

  return `PRD-${String(highestCode + 1).padStart(4, "0")}`;
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  return value;
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
      className={isActive ? "sort-arrow is-active" : "sort-arrow"}
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

function ProductStatusBadge({ active }) {
  return (
    <span
      className={`product-badge ${active ? "active" : "inactive"}`}
      title="وضعیت محصول فقط از پنجره ویرایش قابل تغییر است"
    >
      {active ? "فعال" : "غیرفعال"}
    </span>
  );
}

function DeleteConfirmDialog({ productName, onCancel, onConfirm }) {
  return (
    <div
      className="product-delete-confirm-layer"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div
        className="product-delete-confirm-box"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="product-delete-confirm-icon">
          <TrashIcon />
        </div>

        <p className="product-delete-confirm-text">
          آیا از حذف محصول{" "}
          <strong>{productName || "انتخاب‌شده"}</strong> اطمینان دارید؟
        </p>

        <div className="product-delete-confirm-actions">
          <button
            type="button"
            className="product-delete-confirm-cancel"
            onClick={onCancel}
          >
            خیر
          </button>

          <button
            type="button"
            className="product-delete-confirm-submit"
            onClick={onConfirm}
          >
            بله، حذف شود
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductModal({
  product,
  existingProducts,
  onClose,
  onSave,
  onDelete,
}) {
  const isEdit = Boolean(product?.uid);

  const [form, setForm] = useState({
    productCode:
      product?.productCode ||
      product?.id ||
      generateProductCode(existingProducts),
    name: product?.name || "",
    defaultSalePrice: product?.defaultSalePrice || product?.basePrice || "",
    factoryPurchasePrice: product?.factoryPurchasePrice || "",
    remainingStock: product?.remainingStock || "",
    warningStock: product?.warningStock || "",
    salePrice: product?.salePrice || "تعداد",
    active: product?.active ?? true,
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
    if (!String(form.productCode).trim()) {
      setError("کد محصول مشخص نشده است.");
      return;
    }

    if (!form.name.trim()) {
      setError("نام محصول را وارد کنید.");
      return;
    }

    if (!String(form.defaultSalePrice).trim()) {
      setError("قیمت فروش پیش‌فرض را وارد کنید.");
      return;
    }

    const duplicateCode = existingProducts.some(
      (item) =>
        String(item.productCode || item.id) === String(form.productCode) &&
        String(item.uid) !== String(product?.uid)
    );

    if (duplicateCode) {
      setError("این کد محصول قبلاً ثبت شده است.");
      return;
    }

    onSave({
      uid: product?.uid || Date.now(),
      id: String(form.productCode).trim(),
      code: String(form.productCode).trim(),
      productCode: String(form.productCode).trim(),
      name: form.name.trim(),
      productName: form.name.trim(),
      basePrice: String(form.defaultSalePrice).trim(),
      defaultSalePrice: String(form.defaultSalePrice).trim(),
      unitPrice: String(form.defaultSalePrice).trim(),
      price: String(form.defaultSalePrice).trim(),
      factoryPurchasePrice: String(form.factoryPurchasePrice).trim(),
      remainingStock: String(form.remainingStock).trim(),
      warningStock: String(form.warningStock).trim(),
      salePrice: form.salePrice,
      active: form.active,
    });
  };

  const openDeleteConfirm = () => {
    if (!isEdit) return;
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!isEdit) return;
    setDeleteConfirmOpen(false);
    onDelete(product);
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-box modal-box--wide"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="بستن"
        >
          ×
        </button>

        <h2 className="modal-title">
          {isEdit ? "ویرایش محصول" : "محصول جدید"}
        </h2>

        <div className="modal-form-grid">
          <div className="modal-field">
            <label className="modal-label" htmlFor="product-code">
              کد محصول
            </label>

            <input
              id="product-code"
              className="modal-input modal-input--code"
              value={form.productCode}
              readOnly
            />
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="product-name">
              نام محصول
            </label>

            <input
              id="product-name"
              className="modal-input"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="نام محصول را وارد کنید"
              autoFocus
            />
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="product-default-sale-price">
              قیمت فروش پیش‌فرض
            </label>

            <input
              id="product-default-sale-price"
              className="modal-input"
              type="number"
              min="0"
              value={form.defaultSalePrice}
              onChange={(event) =>
                updateField("defaultSalePrice", event.target.value)
              }
              placeholder="قیمت فروش پیش‌فرض را وارد کنید"
            />
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="product-purchase-price">
              قیمت خرید
            </label>

            <input
              id="product-purchase-price"
              className="modal-input"
              type="number"
              min="0"
              value={form.factoryPurchasePrice}
              onChange={(event) =>
                updateField("factoryPurchasePrice", event.target.value)
              }
              placeholder="قیمت خرید را وارد کنید"
            />
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="product-base">
              مبنای پیش‌فرض
            </label>

            <select
              id="product-base"
              className="modal-input modal-select"
              value={form.salePrice}
              onChange={(event) => updateField("salePrice", event.target.value)}
            >
              <option value="تعداد">تعداد</option>
              <option value="وزن">وزن</option>
              <option value="طول">طول</option>
            </select>
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="product-remaining-stock">
              موجودی باقی‌مانده
            </label>

            <input
              id="product-remaining-stock"
              className="modal-input"
              type="number"
              min="0"
              value={form.remainingStock}
              onChange={(event) =>
                updateField("remainingStock", event.target.value)
              }
              placeholder="موجودی باقی‌مانده را وارد کنید"
            />
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="product-warning-stock">
              موجودی هشدار
            </label>

            <input
              id="product-warning-stock"
              className="modal-input"
              type="number"
              min="0"
              value={form.warningStock}
              onChange={(event) =>
                updateField("warningStock", event.target.value)
              }
              placeholder="حد هشدار موجودی را وارد کنید"
            />
          </div>

          <div className="modal-field modal-field--full">
            <span className="modal-label">وضعیت محصول</span>

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
        </div>

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-actions">
          <button
            type="button"
            className="modal-btn-save"
            onClick={handleSubmit}
            title="ذخیره"
            aria-label="ذخیره محصول"
          >
            <SaveIcon />
          </button>

          {isEdit && (
            <button
              type="button"
              className="modal-btn-delete"
              onClick={openDeleteConfirm}
              title="حذف"
              aria-label="حذف محصول"
            >
              <DeleteIcon />
            </button>
          )}
        </div>
      </div>

      {deleteConfirmOpen && (
        <DeleteConfirmDialog
          productName={product?.name}
          onCancel={() => setDeleteConfirmOpen(false)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

export default function Products() {
  const navigate = useNavigate();
  const location = useLocation();

  const cameFromDashboard = location.state?.fromDashboard === true;
  const isNewProductRoute = location.pathname === "/products/new";

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [modalProduct, setModalProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [sortKey, setSortKey] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  useEffect(() => {
    if (isNewProductRoute || location.state?.openNewProduct) {
      setModalProduct(null);
      setIsModalOpen(true);
    }
  }, [isNewProductRoute, location.state]);

  const refreshProducts = async () => {
    try {
      const serverProducts = await fetchProductsFromServer();
      setProducts(serverProducts);
    } catch (error) {
      console.error("خطا در دریافت محصولات از سرور:", error);
      alert("خطا در دریافت محصولات از سرور");
    }
  };

  useEffect(() => {
    refreshProducts();

    window.addEventListener("focus", refreshProducts);
    window.addEventListener(
      "order-assistant-products-updated",
      refreshProducts
    );

    return () => {
      window.removeEventListener("focus", refreshProducts);
      window.removeEventListener(
        "order-assistant-products-updated",
        refreshProducts
      );
    };
  }, []);

  const openAddModal = () => {
    setModalProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setModalProduct(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setModalProduct(null);
    setIsModalOpen(false);

    if (cameFromDashboard) {
      navigate("/dashboard");
      return;
    }

    if (isNewProductRoute) {
      navigate("/products");
    }
  };

  const handleSaveProduct = async (savedProduct) => {
    const normalizedSavedProduct = normalizeProduct(
      savedProduct,
      products.length
    );

    const exists = products.some(
      (product) => String(product.uid) === String(normalizedSavedProduct.uid)
    );

    try {
      const payload = uiProductToApi(normalizedSavedProduct);

      let response;
      if (exists) {
        response = await api.put(`/products/${normalizedSavedProduct.uid}`, payload);
      } else {
        response = await api.post("/products/", payload);
      }

      const savedFromServer = apiProductToUi(response.data, products.length);

      setProducts((previousProducts) => {
        const updatedProducts = exists
          ? previousProducts.map((product) =>
              String(product.uid) === String(normalizedSavedProduct.uid)
                ? savedFromServer
                : product
            )
          : [savedFromServer, ...previousProducts];

        saveProducts(updatedProducts);
        return updatedProducts;
      });

      createLowStockSystemMessage(savedFromServer);
      closeModal();
    } catch (error) {
      console.error("خطا در ذخیره محصول:", error);
      alert(error.response?.data?.detail || "خطا در ذخیره محصول");
    }
  };

  const handleDeleteProduct = async (productToDelete) => {
    try {
      await api.delete(`/products/${productToDelete.uid}`);

      setProducts((previousProducts) => {
        const updatedProducts = previousProducts.filter(
          (product) => String(product.uid) !== String(productToDelete.uid)
        );

        saveProducts(updatedProducts);
        return updatedProducts;
      });

      closeModal();
    } catch (error) {
      console.error("خطا در حذف محصول:", error);
      alert(error.response?.data?.detail || "خطا در حذف محصول");
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((previous) =>
        previous === "asc" ? "desc" : "asc"
      );
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }

    setCurrentPage(1);
  };

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = products.filter((product) => {
      if (!query) return true;

      const statusText = product.active ? "فعال" : "غیرفعال";

      return [
        product.productCode,
        product.id,
        product.name,
        product.defaultSalePrice,
        product.factoryPurchasePrice,
        product.remainingStock,
        product.warningStock,
        product.salePrice,
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

      if (
        sortKey === "defaultSalePrice" ||
        sortKey === "factoryPurchasePrice" ||
        sortKey === "remainingStock"
      ) {
        firstValue = toNumber(firstValue);
        secondValue = toNumber(secondValue);
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
  }, [products, search, sortKey, sortDirection]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / rowsPerPage)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const displayedProducts = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * rowsPerPage;

    return filteredProducts.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredProducts, safeCurrentPage, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (isNewProductRoute) {
    return (
      <div className="products-page">
        <ProductModal
          product={modalProduct}
          existingProducts={products}
          onClose={closeModal}
          onSave={handleSaveProduct}
          onDelete={handleDeleteProduct}
        />
      </div>
    );
  }

  return (
    <div className="products-page">
      <header className="products-header">
        <h1 className="products-title">مدیریت محصولات</h1>

        <div className="products-header__actions">
          <button
            type="button"
            className="add-btn"
            onClick={openAddModal}
          >
            <PlusIcon />
            <span>محصول جدید</span>
          </button>

          <label className="products-search">
            <SearchIcon />

            <input
              className="search-input"
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

      <div className="products-table-wrap">
        <table className="products-table">
          <colgroup>
            <col className="col-edit" />
            <col className="col-id" />
            <col className="col-name" />
            <col className="col-default-sale-price" />
            <col className="col-factory-price" />
            <col className="col-sale-price" />
            <col className="col-remaining-stock" />
            <col className="col-status" />
          </colgroup>

          <thead>
            <tr>
              <th className="pt-head pt-head-edit" />

              <th
                className="pt-head pt-sortable"
                onClick={() => handleSort("productCode")}
              >
                <span className="pt-head-inner">
                  <SortArrow
                    column="productCode"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                  />
                  کد محصول
                </span>
              </th>

              <th
                className="pt-head pt-sortable"
                onClick={() => handleSort("name")}
              >
                <span className="pt-head-inner">
                  <SortArrow
                    column="name"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                  />
                  نام محصول
                </span>
              </th>

              <th
                className="pt-head pt-sortable"
                onClick={() => handleSort("defaultSalePrice")}
              >
                <span className="pt-head-inner">
                  <SortArrow
                    column="defaultSalePrice"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                  />
                  قیمت فروش پیش‌فرض
                </span>
              </th>

              <th
                className="pt-head pt-sortable"
                onClick={() => handleSort("factoryPurchasePrice")}
              >
                <span className="pt-head-inner">
                  <SortArrow
                    column="factoryPurchasePrice"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                  />
                  قیمت خرید
                </span>
              </th>

              <th
                className="pt-head pt-sortable"
                onClick={() => handleSort("salePrice")}
              >
                <span className="pt-head-inner">
                  <SortArrow
                    column="salePrice"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                  />
                  مبنای پیش‌فرض
                </span>
              </th>

              <th
                className="pt-head pt-sortable"
                onClick={() => handleSort("remainingStock")}
              >
                <span className="pt-head-inner">
                  <SortArrow
                    column="remainingStock"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                  />
                  موجودی باقی‌مانده
                </span>
              </th>

              <th
                className="pt-head pt-sortable"
                onClick={() => handleSort("active")}
              >
                <span className="pt-head-inner">
                  <SortArrow
                    column="active"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                  />
                  وضعیت محصول
                </span>
              </th>
            </tr>
          </thead>

          <tbody>
            {displayedProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="pt-empty">
                  محصولی برای نمایش وجود ندارد.
                </td>
              </tr>
            ) : (
              displayedProducts.map((product, index) => (
                <tr
                  key={product.uid}
                  className={
                    index < displayedProducts.length - 1
                      ? "pt-row pt-row--border"
                      : "pt-row"
                  }
                  onDoubleClick={() => openEditModal(product)}
                  title="برای ویرایش محصول دوبار کلیک کنید"
                >
                  <td className="pt-cell pt-cell-edit">
                    <button
                      type="button"
                      className="edit-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditModal(product);
                      }}
                      title="ویرایش محصول"
                      aria-label={`ویرایش ${product.name}`}
                    >
                      <EditIcon />
                    </button>
                  </td>

                  <td className="pt-cell pt-id">{product.productCode}</td>
                  <td className="pt-cell">{product.name}</td>
                  <td className="pt-cell">
                    {displayValue(product.defaultSalePrice)}
                  </td>
                  <td className="pt-cell">
                    {displayValue(product.factoryPurchasePrice)}
                  </td>
                  <td className="pt-cell">{product.salePrice}</td>
                  <td className="pt-cell">
                    {displayValue(product.remainingStock)}
                  </td>

                  <td className="pt-cell pt-cell-status">
                    <ProductStatusBadge active={product.active} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="products-pagination">
        <div className="pagination-info">
          <span>
            نمایش صفحه {toPersianDigits(safeCurrentPage)} از{" "}
            {toPersianDigits(totalPages)}
          </span>

          <span className="pagination-total">
            تعداد کل: {toPersianDigits(filteredProducts.length)}
          </span>
        </div>

        <div className="pagination-controls">
          <label className="rows-per-page">
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
            className="pagination-btn"
            disabled={safeCurrentPage === 1}
            onClick={() =>
              setCurrentPage((page) => Math.max(1, page - 1))
            }
          >
            قبلی
          </button>

          <button
            type="button"
            className="pagination-btn"
            disabled={safeCurrentPage === totalPages}
            onClick={() =>
              setCurrentPage((page) =>
                Math.min(totalPages, page + 1)
              )
            }
          >
            بعدی
          </button>
        </div>
      </div>

      {isModalOpen && (
        <ProductModal
          product={modalProduct}
          existingProducts={products}
          onClose={closeModal}
          onSave={handleSaveProduct}
          onDelete={handleDeleteProduct}
        />
      )}
    </div>
  );
}