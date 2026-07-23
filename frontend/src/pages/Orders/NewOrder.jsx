import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./NewOrder.css";
import { fetchOrder, createOrder as createOrderApi, updateOrder as updateOrderApi } from "../../api/orders";
import { fetchProducts } from "../../api/products";
import { fetchCustomers } from "../../api/customers";
import { loadInvoiceSettings as loadStoredInvoiceSettings } from "../../utils/invoiceSettings";
import {
  formatCurrency as formatCurrencyValue,
  useCurrencyVersion,
} from "../../utils/currencySettings";
import {
  formatAppDateTime,
  formatAppDateOrText,
  getCurrentInputDate as getCurrentConfiguredInputDate,
  useDateSettingsVersion,
} from "../../utils/appDate";

const ORDERS_STORAGE_KEY = "order_assistant_orders";

const PRODUCT_STORAGE_KEYS = [
  "order_assistant_products",
  "products",
  "oa_products",
  "order-management-products",
  "order_assistant_product_list",
];

const CUSTOMER_STORAGE_KEYS = [
  "order_assistant_customers",
  "customers",
  "oa_customers",
  "order-management-customers",
  "order_assistant_customer_list",
];

const INVOICE_SETTINGS_KEYS = [
  "order_assistant_invoice_settings",
  "invoice_settings",
  "invoiceSettings",
  "oa_invoice_settings",
  "order-management-invoice-settings",
];

const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const PERSIAN_WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const FALLBACK_PRODUCTS = [
  "والپست U",
  "والپست H",
  "میلگرد بستر",
  "گیره و قلاب",
  "تسمه قالب‌بندی",
  "ورق سیاه ST37",
  "نبشی سبک",
  "ناودانی سبک",
  "پلیت",
  "رول بولت",
  "قوطی",
  "پروفیل",
];

const DEFAULT_FORM_BASE = {
  customerName: "",
  customerPhone: "",
  customerQuality: "عادی",
  orderStatus: "ثبت‌شده",

  productName: "",
  quantityMethod: "تعداد",
  quantityValue: "",
  addQuantityMethod: "تعداد",
  addQuantity: "",
  finalQuantity: "",

  unitPrice: "",
  prepayment: "",
  notes: "",

  invoiceDescription: "",
};

const DEFAULT_INVOICE_SETTINGS = {
  companyName: "فارس برش",
  companySubtitle: "آهن‌آلات و برشکاری",
  address: "شیراز، بلوار امیرکبیر",
  phones: "09170123033 / 09177151440",
  website: "www.Farsboresh.ir",
  email: "info@farsboresh.ir",
  economicCode: "114-882-441",

  invoiceTitle: "فاکتور فروش",
  invoiceDescription: "لطفاً قبل از بارگیری، مشخصات کالا را با سفارش کنترل شود.",
  validityText: "اعتبار فاکتور تا 24 ساعت می‌باشد.",
  footerText:
    "آهن آلات و برشکاری فارس برش، عرضه کننده انواع آهن آلات ساختمانی و تولید کننده انواع والپست، تسمه‌های قالب بندی، میلگرد بستر و گیره و قلاب و برش و CNC انواع ورق.",

  primaryColor: "#182641",
  accentColor: "#CBB135",
  tableHeaderColor: "#182641",
  rowColor: "#EEF2F7",
  borderColor: "#D7DCE5",
  textColor: "#111827",
  mutedTextColor: "#64748B",
  dangerColor: "#B91C1C",

  taxEnabledByDefault: false,
  defaultTaxRate: 0,

  logoUrl: "",

  showLogo: true,
  showCompanyName: true,
  showCompanySubtitle: true,
  showAddress: true,
  showPhones: true,
  showWebsite: true,
  showEmail: false,
  showEconomicCode: false,
  showBuyerSignature: true,
  showSellerSignature: true,
  showFooter: true,
};

function toEnglishDigits(value) {
  return String(value || "")
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
}

function toPersianDigits(value) {
  return String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit]);
}

function extractNumber(value) {
  const normalized = toEnglishDigits(value).replace(/[^\d.]/g, "");
  return normalized || "";
}

function toFaNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  return Number(value).toLocaleString("fa-IR");
}

function toCurrency(value) {
  return formatCurrencyValue(value);
}

function padTwo(value) {
  return String(value).padStart(2, "0");
}

function div(a, b) {
  return Math.floor(a / b);
}

function gregorianToJalali(gy, gm, gd) {
  let jy;
  let days;
  const gDayMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

  gy = Number(gy);
  gm = Number(gm);
  gd = Number(gd);

  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }

  const gy2 = gm > 2 ? gy + 1 : gy;

  days =
    365 * gy +
    div(gy2 + 3, 4) -
    div(gy2 + 99, 100) +
    div(gy2 + 399, 400) -
    80 +
    gd +
    gDayMonth[gm - 1];

  jy += 33 * div(days, 12053);
  days %= 12053;

  jy += 4 * div(days, 1461);
  days %= 1461;

  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }

  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);

  return { jy, jm, jd };
}

function jalaliToGregorian(jy, jm, jd) {
  jy = Number(jy) + 1595;
  jm = Number(jm);
  jd = Number(jd);

  let days =
    -355668 +
    365 * jy +
    div(jy, 33) * 8 +
    div((jy % 33) + 3, 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);

  let gy = 400 * div(days, 146097);
  days %= 146097;

  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;

    if (days >= 365) {
      days += 1;
    }
  }

  gy += 4 * div(days, 1461);
  days %= 1461;

  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }

  let gd = days + 1;

  const leap =
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;

  const monthDays = [
    0,
    31,
    leap ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  let gm = 1;

  while (gm <= 12 && gd > monthDays[gm]) {
    gd -= monthDays[gm];
    gm += 1;
  }

  return { gy, gm, gd };
}

function toInputDate(date) {
  const d = date ? new Date(date) : new Date();

  if (Number.isNaN(d.getTime())) {
    return toInputDate(new Date());
  }

  const year = d.getFullYear();
  const month = padTwo(d.getMonth() + 1);
  const day = padTwo(d.getDate());

  return `${year}-${month}-${day}`;
}

function toInputDateFromJalali(jy, jm, jd) {
  const gregorian = jalaliToGregorian(jy, jm, jd);

  return `${gregorian.gy}-${padTwo(gregorian.gm)}-${padTwo(gregorian.gd)}`;
}

function getJalaliPartsFromInputDate(inputDate) {
  const safeInput = inputDate || toInputDate(new Date());
  const [gy, gm, gd] = safeInput.split("-").map(Number);

  if (!gy || !gm || !gd) {
    const now = new Date();
    return gregorianToJalali(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate()
    );
  }

  return gregorianToJalali(gy, gm, gd);
}

function formatJalaliDate(parts) {
  return `${toPersianDigits(parts.jy)}/${toPersianDigits(
    padTwo(parts.jm)
  )}/${toPersianDigits(padTwo(parts.jd))}`;
}

function formatDateTimeForDisplay(dateValue) {
  return formatAppDateTime(dateValue);
}

function formatStoredDateForDisplay(value) {
  return formatAppDateOrText(value);
}

function isJalaliLeapYear(jy) {
  const firstDay = jalaliToGregorian(jy, 1, 1);
  const nextFirstDay = jalaliToGregorian(jy + 1, 1, 1);

  const firstDate = new Date(
    firstDay.gy,
    firstDay.gm - 1,
    firstDay.gd
  ).getTime();

  const nextDate = new Date(
    nextFirstDay.gy,
    nextFirstDay.gm - 1,
    nextFirstDay.gd
  ).getTime();

  return Math.round((nextDate - firstDate) / 86400000) === 366;
}

function getJalaliMonthLength(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

function getJalaliWeekdayIndex(jy, jm, jd) {
  const gregorian = jalaliToGregorian(jy, jm, jd);
  const date = new Date(gregorian.gy, gregorian.gm - 1, gregorian.gd);
  return (date.getDay() + 1) % 7;
}

function getPreviousJalaliMonth(view) {
  if (view.jm === 1) {
    return { jy: view.jy - 1, jm: 12, jd: 1 };
  }

  return { jy: view.jy, jm: view.jm - 1, jd: 1 };
}

function getNextJalaliMonth(view) {
  if (view.jm === 12) {
    return { jy: view.jy + 1, jm: 1, jd: 1 };
  }

  return { jy: view.jy, jm: view.jm + 1, jd: 1 };
}

function normalizePersianStatus(status) {
  const value = String(status || "")
    .replace(/[{}]/g, "")
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!value) return "ثبت‌شده";

  if (value === "paid") return "پرداخت شده";
  if (value === "pending") return "در انتظار پرداخت";
  if (value === "cancelled" || value === "canceled") return "لغو شده";
  if (value === "registered") return "ثبت‌شده";

  if (value.includes("ثبت")) return "ثبت‌شده";
  if (value.includes("انتظار")) return "در انتظار پرداخت";
  if (value.includes("پرداخت")) return "پرداخت شده";
  if (value.includes("لغو")) return "لغو شده";

  return value;
}

function loadOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));

  window.dispatchEvent(
    new CustomEvent("order-assistant-orders-updated", {
      detail: orders,
    })
  );
}

function makeOrderCode(count) {
  const next = count + 1;
  return `ORD-${String(next).padStart(4, "0")}`;
}

function normalizeStatusForForm(status) {
  return normalizePersianStatus(status);
}

function getProductName(product) {
  if (typeof product === "string") return product;

  return (
    product?.name ||
    product?.productName ||
    product?.title ||
    product?.product_name ||
    product?.label ||
    product?.نام ||
    product?.["نام محصول"] ||
    ""
  );
}

function getProductUnitPrice(product) {
  if (!product || typeof product === "string") return "";

  return (
    product?.unitPrice ||
    product?.price ||
    product?.salePrice ||
    product?.defaultSalePrice ||
    product?.basePrice ||
    product?.unit_price ||
    product?.قیمت ||
    product?.["قیمت واحد"] ||
    ""
  );
}

function normalizeProducts(rawProducts) {
  if (!Array.isArray(rawProducts)) return [];

  return rawProducts
    .map((item) => {
      const name = getProductName(item);
      const unitPrice = getProductUnitPrice(item);

      if (!name) return null;

      return {
        name,
        unitPrice: extractNumber(unitPrice),
        original: item,
      };
    })
    .filter(Boolean);
}

function loadProductsFromStorage() {
  for (const key of PRODUCT_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const normalized = normalizeProducts(parsed);

      if (normalized.length > 0) {
        return normalized;
      }
    } catch {
      // ignore
    }
  }

  return FALLBACK_PRODUCTS.map((name) => ({
    name,
    unitPrice: "",
    original: name,
  }));
}

function getCustomerName(customer) {
  return (
    customer?.name ||
    customer?.customerName ||
    customer?.fullName ||
    customer?.title ||
    customer?.نام ||
    customer?.["نام مشتری"] ||
    ""
  );
}

function getCustomerPhone(customer) {
  return (
    customer?.phone ||
    customer?.mobile ||
    customer?.customerPhone ||
    customer?.mobilePhone ||
    customer?.telephone ||
    customer?.تلفن ||
    customer?.["تلفن همراه"] ||
    ""
  );
}

function getCustomerQuality(customer) {
  return (
    customer?.quality ||
    customer?.customerQuality ||
    customer?.customerNote ||
    customer?.description ||
    customer?.["کیفیت مشتری"] ||
    "عادی"
  );
}

function normalizeCustomers(rawCustomers) {
  if (!Array.isArray(rawCustomers)) return [];

  return rawCustomers
    .map((item) => {
      const name = getCustomerName(item);
      const phone = getCustomerPhone(item);
      const quality = getCustomerQuality(item);

      if (!name && !phone) return null;

      return {
        id:
          item?.uid ||
          item?.id ||
          item?.personId ||
          item?.customerId ||
          phone ||
          name,
        name,
        phone,
        quality: quality || "عادی",
        original: item,
      };
    })
    .filter(Boolean);
}

function loadCustomersFromStorage() {
  for (const key of CUSTOMER_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const normalized = normalizeCustomers(parsed);

      if (normalized.length > 0) {
        return normalized;
      }
    } catch {
      // ignore
    }
  }

  return [];
}

function findCustomerExact(customers, value) {
  const query = String(value || "").trim();
  const queryDigits = toEnglishDigits(query);

  if (!query) return null;

  return (
    customers.find((customer) => String(customer.name || "").trim() === query) ||
    customers.find(
      (customer) => toEnglishDigits(customer.phone || "").trim() === queryDigits
    ) ||
    null
  );
}

function findCustomerLoose(customers, value) {
  const query = String(value || "").trim().toLowerCase();
  const queryDigits = toEnglishDigits(query);

  if (!query) return null;

  const matches = customers.filter((customer) => {
    const name = String(customer.name || "").toLowerCase();
    const phone = toEnglishDigits(customer.phone || "");

    return name.includes(query) || phone.includes(queryDigits);
  });

  return matches.length === 1 ? matches[0] : null;
}

function normalizeInvoiceSettings(raw) {
  const company = raw?.company || {};
  const invoice = raw?.invoice || {};
  const colors = raw?.palette || raw?.colors || {};
  const tax = raw?.tax || {};
  const visibility = raw?.visibility || raw?.visibleFields || raw?.sections || {};

  return {
    ...DEFAULT_INVOICE_SETTINGS,
    ...raw,

    companyName:
      raw?.companyName ||
      raw?.storeName ||
      raw?.sellerName ||
      raw?.shopName ||
      company?.name ||
      DEFAULT_INVOICE_SETTINGS.companyName,

    companySubtitle:
      raw?.companySubtitle ||
      raw?.companySlogan ||
      raw?.subtitle ||
      raw?.tagline ||
      company?.tagline ||
      company?.subtitle ||
      DEFAULT_INVOICE_SETTINGS.companySubtitle,

    address:
      raw?.address ||
      raw?.sellerAddress ||
      raw?.companyAddress ||
      company?.address ||
      DEFAULT_INVOICE_SETTINGS.address,

    phones:
      raw?.phones ||
      raw?.phone ||
      raw?.sellerPhone ||
      raw?.companyPhone ||
      company?.phones ||
      DEFAULT_INVOICE_SETTINGS.phones,

    website:
      raw?.website ||
      raw?.site ||
      raw?.companyWebsite ||
      company?.website ||
      DEFAULT_INVOICE_SETTINGS.website,

    email:
      raw?.email ||
      raw?.companyEmail ||
      company?.email ||
      DEFAULT_INVOICE_SETTINGS.email,

    economicCode:
      raw?.economicCode ||
      raw?.taxId ||
      raw?.companyEconomicCode ||
      company?.economicCode ||
      DEFAULT_INVOICE_SETTINGS.economicCode,

    invoiceTitle:
      raw?.invoiceTitle ||
      invoice?.title ||
      DEFAULT_INVOICE_SETTINGS.invoiceTitle,

    invoiceDescription:
      raw?.invoiceDescription ||
      raw?.description ||
      raw?.note ||
      raw?.invoiceNote ||
      invoice?.note ||
      DEFAULT_INVOICE_SETTINGS.invoiceDescription,

    validityText:
      raw?.validityText ||
      raw?.validity ||
      raw?.invoiceValidityText ||
      invoice?.validityText ||
      DEFAULT_INVOICE_SETTINGS.validityText,

    footerText:
      raw?.footerText ||
      raw?.footer ||
      raw?.invoiceFooter ||
      invoice?.footerText ||
      DEFAULT_INVOICE_SETTINGS.footerText,

    logoUrl:
      raw?.logoUrl ||
      raw?.logo ||
      raw?.logoPreview ||
      raw?.logoDataUrl ||
      company?.logoUrl ||
      company?.logo ||
      "",

    primaryColor:
      raw?.primaryColor ||
      colors?.primary ||
      colors?.main ||
      DEFAULT_INVOICE_SETTINGS.primaryColor,

    accentColor:
      raw?.accentColor ||
      colors?.accent ||
      colors?.highlight ||
      DEFAULT_INVOICE_SETTINGS.accentColor,

    tableHeaderColor:
      raw?.tableHeaderColor ||
      raw?.headerColor ||
      colors?.tableHead ||
      colors?.tableHeader ||
      colors?.primary ||
      raw?.primaryColor ||
      DEFAULT_INVOICE_SETTINGS.tableHeaderColor,

    rowColor:
      raw?.rowColor ||
      colors?.surface ||
      colors?.row ||
      colors?.tableRow ||
      DEFAULT_INVOICE_SETTINGS.rowColor,

    borderColor:
      raw?.borderColor ||
      colors?.border ||
      DEFAULT_INVOICE_SETTINGS.borderColor,

    textColor:
      raw?.textColor ||
      colors?.text ||
      DEFAULT_INVOICE_SETTINGS.textColor,

    mutedTextColor:
      raw?.mutedTextColor ||
      colors?.muted ||
      DEFAULT_INVOICE_SETTINGS.mutedTextColor,

    dangerColor:
      raw?.dangerColor ||
      colors?.danger ||
      DEFAULT_INVOICE_SETTINGS.dangerColor ||
      "#B91C1C",

    showLogo:
      visibility?.showLogo ??
      visibility?.logo ??
      raw?.showLogo ??
      DEFAULT_INVOICE_SETTINGS.showLogo,

    showCompanyName:
      visibility?.showCompanyName ??
      visibility?.companyName ??
      raw?.showCompanyName ??
      DEFAULT_INVOICE_SETTINGS.showCompanyName,

    showCompanySubtitle:
      visibility?.showTagline ??
      visibility?.showCompanySubtitle ??
      visibility?.companySubtitle ??
      visibility?.companySlogan ??
      raw?.showCompanySubtitle ??
      DEFAULT_INVOICE_SETTINGS.showCompanySubtitle,

    showAddress:
      visibility?.showAddress ??
      visibility?.address ??
      raw?.showAddress ??
      DEFAULT_INVOICE_SETTINGS.showAddress,

    showPhones:
      visibility?.showPhones ??
      visibility?.phones ??
      raw?.showPhones ??
      DEFAULT_INVOICE_SETTINGS.showPhones,

    showWebsite:
      visibility?.showWebsite ??
      visibility?.website ??
      raw?.showWebsite ??
      DEFAULT_INVOICE_SETTINGS.showWebsite,

    showEmail:
      visibility?.showEmail ??
      visibility?.email ??
      raw?.showEmail ??
      DEFAULT_INVOICE_SETTINGS.showEmail,

    showEconomicCode:
      visibility?.showEconomicCode ??
      visibility?.economicCode ??
      raw?.showEconomicCode ??
      DEFAULT_INVOICE_SETTINGS.showEconomicCode,

    showBuyerSignature:
      visibility?.showBuyerSignature ??
      visibility?.buyerSignature ??
      raw?.showBuyerSignature ??
      DEFAULT_INVOICE_SETTINGS.showBuyerSignature,

    showSellerSignature:
      visibility?.showSellerSignature ??
      visibility?.sellerSignature ??
      raw?.showSellerSignature ??
      DEFAULT_INVOICE_SETTINGS.showSellerSignature,

    showFooter:
      visibility?.showFooter ??
      visibility?.footer ??
      raw?.showFooter ??
      DEFAULT_INVOICE_SETTINGS.showFooter,

    taxEnabledByDefault:
      tax?.enabledByDefault ?? raw?.taxEnabledByDefault ?? false,

    defaultTaxRate:
      tax?.defaultRate ?? raw?.defaultTaxRate ?? 0,
  };
}

function loadInvoiceSettings() {
  return normalizeInvoiceSettings(loadStoredInvoiceSettings());
}

function createDefaultForm() {
  const invoiceSettings = loadInvoiceSettings();

  return {
    ...DEFAULT_FORM_BASE,
    invoiceDescription:
      invoiceSettings.invoiceDescription ||
      DEFAULT_INVOICE_SETTINGS.invoiceDescription,
  };
}

function normalizeRow(row) {
  const method = row?.quantityMethod || "تعداد";
  const rawQuantity =
    row?.quantityValueRaw ||
    row?.quantityNumber ||
    extractNumber(row?.quantity) ||
    "";

  const numberQuantity = Number(rawQuantity || row?.quantityNumber || 0);
  const isCount = method === "تعداد";
  const isWeight = method === "وزن";
  const isLength = method === "طول";

  const unitPriceRaw = String(
    row?.unitPriceRaw ||
      row?.unit_price ||
      row?.unitPriceRawValue ||
      extractNumber(row?.unitPrice) ||
      0
  );

  const savedTotalRaw = Number(
    row?.totalRaw ||
      row?.total_raw ||
      row?.lineTotalRaw ||
      row?.line_total ||
      extractNumber(row?.total) ||
      0
  );

  const calculatedTotalRaw = numberQuantity * Number(unitPriceRaw || 0);
  const totalRaw = savedTotalRaw > 0 ? savedTotalRaw : calculatedTotalRaw;
  const rawDate =
    row?.dateInputValue ||
    row?.date_input_value ||
    row?.dateRaw ||
    row?.date_raw ||
    row?.date ||
    "";

  return {
    id: row?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: row?.name || row?.productName || "بدون نام",
    customer: row?.customer || "-",
    date: rawDate ? formatStoredDateForDisplay(rawDate) : "",
    dateInputValue: row?.dateInputValue || row?.date_input_value || "",
    dateRaw: rawDate,

    quantityMethod: method,
    quantityValueRaw: String(row?.quantityValueRaw || rawQuantity || ""),
    addQuantityMethod: row?.addQuantityMethod || method,
    addQuantityRaw: row?.addQuantityRaw || "",
    finalQuantityRaw: row?.finalQuantityRaw || "",

    quantityNumber: numberQuantity,
    quantity: `${toFaNumber(numberQuantity)} ${method}`,

    countDisplay: isCount ? toFaNumber(numberQuantity) : "-",
    weight: isWeight ? toFaNumber(numberQuantity) : "-",
    length: isLength ? toFaNumber(numberQuantity) : "-",

    unitPriceRaw,
    unitPrice: toCurrency(unitPriceRaw),

    totalRaw,
    total: toCurrency(totalRaw),

    specs: row?.specs || row?.notes || "-",
    notes: row?.notes || (row?.specs !== "-" ? row?.specs : "") || "",
  };
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M8 3v4M16 3v4M4 10h16"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function JalaliCalendarPicker({
  value,
  displayText,
  isOpen,
  onToggle,
  onSelect,
  view,
  onViewChange,
  pickerRef,
}) {
  const selected = getJalaliPartsFromInputDate(value);
  const today = getJalaliPartsFromInputDate(getCurrentConfiguredInputDate());
  const firstDayIndex = getJalaliWeekdayIndex(view.jy, view.jm, 1);
  const monthLength = getJalaliMonthLength(view.jy, view.jm);

  const cells = [];

  for (let i = 0; i < firstDayIndex; i += 1) {
    cells.push({
      type: "empty",
      key: `empty-${i}`,
    });
  }

  for (let day = 1; day <= monthLength; day += 1) {
    cells.push({
      type: "day",
      key: `day-${day}`,
      day,
    });
  }

  const selectDay = (day) => {
    onSelect(toInputDateFromJalali(view.jy, view.jm, day));
  };

  return (
    <div className="new-order-date-picker" ref={pickerRef}>
      <button
        type="button"
        className="new-order-date-box"
        onClick={onToggle}
      >
        <span className="new-order-date-text">{displayText}</span>
        <span className="new-order-date-icon">
          <CalendarIcon />
        </span>
      </button>

      {isOpen && (
        <div className="new-order-jalali-calendar">
          <div className="new-order-jalali-calendar__head">
            <button
              type="button"
              onClick={() => onViewChange(getPreviousJalaliMonth(view))}
            >
              ماه قبل
            </button>

            <strong>
              {PERSIAN_MONTHS[view.jm - 1]} {toPersianDigits(view.jy)}
            </strong>

            <button
              type="button"
              onClick={() => onViewChange(getNextJalaliMonth(view))}
            >
              ماه بعد
            </button>
          </div>

          <div className="new-order-jalali-calendar__weekdays">
            {PERSIAN_WEEKDAYS.map((dayName) => (
              <span key={dayName}>{dayName}</span>
            ))}
          </div>

          <div className="new-order-jalali-calendar__days">
            {cells.map((cell) => {
              if (cell.type === "empty") {
                return <span key={cell.key} className="is-empty" />;
              }

              const isSelected =
                selected.jy === view.jy &&
                selected.jm === view.jm &&
                selected.jd === cell.day;

              const isToday =
                today.jy === view.jy &&
                today.jm === view.jm &&
                today.jd === cell.day;

              return (
                <button
                  type="button"
                  key={cell.key}
                  className={`${isSelected ? "is-selected" : ""} ${
                    isToday ? "is-today" : ""
                  }`}
                  onClick={() => selectDay(cell.day)}
                >
                  {toPersianDigits(cell.day)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function buildInvoiceElement({ order, settings }) {
  const subtotal = Number(order.totalRaw || 0);
  const prepayment = Number(order.prepaymentRaw || 0);
  const taxRate = Number(settings.defaultTaxRate || 0);
  const taxAmount = settings.taxEnabledByDefault ? subtotal * (taxRate / 100) : 0;
  const payableTotal = subtotal + taxAmount;
  const remaining = Math.max(0, payableTotal - prepayment);

  const primary = settings.primaryColor || "#182641";
  const accent = settings.accentColor || "#CBB135";
  const tableHeader = settings.tableHeaderColor || primary;
  const border = settings.borderColor || "#D7DCE5";
  const muted = settings.mutedTextColor || "#64748B";
  const text = settings.textColor || "#111827";
  const rowColor = settings.rowColor || "#EEF2F7";
  const invoiceDescription =
    order.invoiceDescription || settings.invoiceDescription || "";

  const wrapper = document.createElement("div");

  wrapper.style.position = "fixed";
  wrapper.style.left = "-10000px";
  wrapper.style.top = "0";
  wrapper.style.width = "148mm";
  wrapper.style.height = "210mm";
  wrapper.style.background = "#ffffff";
  wrapper.style.zIndex = "-1";
  wrapper.style.direction = "rtl";
  wrapper.style.fontFamily = "Vazirmatn, Tahoma, Arial, sans-serif";

  const rowsHtml = order.items
    .map((item, index) => {
      return `
        <tr>
          <td>${toFaNumber(index + 1)}</td>
          <td class="desc-cell">
            <strong>${item.name || "-"}</strong>
            ${
              item.specs && item.specs !== "-"
                ? `<span>${item.specs}</span>`
                : ""
            }
          </td>
          <td>${item.countDisplay || "-"}</td>
          <td>${item.weight || "-"}</td>
          <td>${item.length || "-"}</td>
          <td>${toCurrency(item.unitPriceRaw || extractNumber(item.unitPrice) || 0)}</td>
          <td>${toCurrency(item.totalRaw || extractNumber(item.total) || 0)}</td>
        </tr>
      `;
    })
    .join("");

  wrapper.innerHTML = `
    <div class="invoice-a5">
      <div class="invoice-header">
        <div class="invoice-header__right">
          ${
            settings.showCompanyName
              ? `<div class="company-name">${settings.companyName || ""}</div>`
              : ""
          }
          ${
            settings.showCompanySubtitle
              ? `<div class="company-subtitle">${
                  settings.companySubtitle || ""
                }</div>`
              : ""
          }
        </div>

        <div class="invoice-logo">
          ${
            settings.showLogo && settings.logoUrl
              ? `<img src="${settings.logoUrl}" alt="logo" />`
              : settings.showLogo
                ? "لوگو"
                : ""
          }
        </div>

        <div class="invoice-header__left">
          <strong class="invoice-title-main">${settings.invoiceTitle || "فاکتور فروش"}</strong>
          <div>تاریخ: ${formatStoredDateForDisplay(order.dateInputValue || order.date)}</div>
          <div>شماره: ${order.code}</div>
        </div>
      </div>

      <div class="company-info-line">
        ${settings.showAddress ? `<span>${settings.address || ""}</span>` : ""}
        ${settings.showPhones ? `<span>${settings.phones || ""}</span>` : ""}
        ${settings.showWebsite ? `<span>${settings.website || ""}</span>` : ""}
        ${settings.showEmail ? `<span>${settings.email || ""}</span>` : ""}
        ${
          settings.showEconomicCode
            ? `<span>کد اقتصادی: ${settings.economicCode || ""}</span>`
            : ""
        }
      </div>

      <div class="buyer-box">
        <div class="box-title">مشخصات خریدار</div>
        <div class="buyer-grid buyer-grid--simple">
          <div>نام مشتری: <strong>${order.customer || "-"}</strong></div>
          <div>شماره تماس: <strong>${order.phone || "-"}</strong></div>
        </div>
      </div>

      <table class="invoice-table">
        <thead>
          <tr>
            <th style="width: 9mm;">ردیف</th>
            <th>شرح کالا و مشخصات</th>
            <th style="width: 15mm;">تعداد</th>
            <th style="width: 15mm;">وزن</th>
            <th style="width: 15mm;">طول</th>
            <th style="width: 23mm;">فی</th>
            <th style="width: 25mm;">مبلغ</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="summary-area">
        <div class="description-box">
          <strong>توضیحات</strong>
          <p>${invoiceDescription}</p>
        </div>

        <div class="summary-box">
          <div>
            <span>جمع اقلام</span>
            <strong>${toCurrency(subtotal)}</strong>
          </div>
          ${
            taxAmount > 0
              ? `<div>
                  <span>مالیات ${toFaNumber(taxRate)}٪</span>
                  <strong>${toCurrency(taxAmount)}</strong>
                </div>`
              : ""
          }
          <div>
            <span>پیش پرداخت</span>
            <strong>${toCurrency(prepayment)}</strong>
          </div>
          <div class="summary-final">
            <span>مانده حساب</span>
            <strong>${toCurrency(remaining)}</strong>
          </div>
        </div>
      </div>

      <div class="validity-text">${settings.validityText || ""}</div>

      <div class="signature-area">
        ${
          settings.showBuyerSignature
            ? `<div><span>امضای خریدار</span></div>`
            : `<div></div>`
        }
        ${
          settings.showSellerSignature
            ? `<div><span>امضای فروشنده</span></div>`
            : `<div></div>`
        }
      </div>

      ${
        settings.showFooter
          ? `<div class="invoice-footer">${settings.footerText || ""}</div>`
          : ""
      }
    </div>

    <style>
      .invoice-a5 {
        width: 148mm;
        height: 210mm;
        background: #ffffff;
        color: ${text};
        padding: 8mm;
        overflow: hidden;
        direction: rtl;
        font-family: Vazirmatn, Tahoma, Arial, sans-serif;
        box-sizing: border-box;
      }

      .invoice-a5 * {
        box-sizing: border-box;
      }

      .invoice-header {
        height: 35mm;
        background: ${primary};
        display: grid;
        grid-template-columns: 1fr 23mm 1fr;
        align-items: center;
        padding: 6mm 7mm;
        color: #ffffff;
      }

      .company-name {
        font-size: 18px;
        line-height: 1.4;
        font-weight: 900;
        color: ${accent};
      }

      .company-subtitle {
        margin-top: 2mm;
        font-size: 9px;
        font-weight: 800;
        color: #ffffff;
      }

      .invoice-logo {
        width: 18mm;
        height: 18mm;
        border: 1px dashed rgba(255,255,255,0.65);
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 8px;
        font-weight: 800;
        margin: 0 auto;
        overflow: hidden;
      }

      .invoice-logo img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }

      .invoice-header__left {
        text-align: left;
        font-size: 8px;
        line-height: 1.8;
        font-weight: 900;
        color: #ffffff;
      }

      .company-info-line {
        height: 10mm;
        border: 1px solid ${border};
        background: #F8FAFC;
        margin-top: 4mm;
        padding: 0 4mm;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5mm;
        color: ${muted};
        font-size: 7px;
        font-weight: 800;
        white-space: nowrap;
        overflow: hidden;
      }

      .buyer-box {
        min-height: 16mm;
        border: 1px solid ${border};
        margin-top: 4mm;
        padding: 3mm 4mm;
      }

      .box-title {
        color: ${primary};
        font-size: 10px;
        font-weight: 900;
        margin-bottom: 3mm;
      }

      .buyer-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2mm 5mm;
        color: ${muted};
        font-size: 8px;
        font-weight: 700;
      }

      .buyer-grid strong {
        color: ${text};
        font-weight: 900;
      }

      .invoice-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin-top: 4mm;
        font-size: 7.2px;
      }

      .invoice-table th {
        height: 8.5mm;
        border: 1px solid ${border};
        background: ${tableHeader};
        color: ${accent};
        text-align: center;
        font-weight: 900;
      }

      .invoice-table td {
        height: 10.5mm;
        border: 1px solid ${border};
        text-align: center;
        vertical-align: middle;
        padding: 1mm;
        font-weight: 800;
        color: ${text};
      }

      .invoice-table tbody tr:nth-child(even) td {
        background: ${rowColor};
      }

      .desc-cell {
        text-align: right !important;
      }

      .desc-cell strong {
        display: block;
        font-size: 7.3px;
        font-weight: 900;
      }

      .desc-cell span {
        display: block;
        margin-top: 1mm;
        font-size: 6.4px;
        line-height: 1.5;
        color: ${muted};
        font-weight: 700;
      }

      .summary-area {
        margin-top: 4mm;
        display: grid;
        grid-template-columns: 1fr 48mm;
        gap: 5mm;
        align-items: start;
      }

      .description-box {
        min-height: 23mm;
        border: 1px solid ${border};
        padding: 3mm;
        color: ${muted};
        font-size: 8px;
        font-weight: 700;
        line-height: 1.8;
      }

      .description-box strong {
        display: block;
        color: ${text};
        font-weight: 900;
        margin-bottom: 1mm;
      }

      .description-box p {
        margin: 0;
      }

      .summary-box {
        border: 1px solid ${border};
        font-size: 8px;
        font-weight: 900;
      }

      .summary-box div {
        min-height: 8mm;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 3mm;
        border-bottom: 1px solid ${border};
      }

      .summary-box div:last-child {
        border-bottom: none;
      }

      .summary-final {
        background: ${accent};
        color: ${text};
      }

      .validity-text {
        margin-top: 4mm;
        text-align: center;
        color: #dc2626;
        font-size: 8px;
        font-weight: 900;
      }

      .signature-area {
        margin-top: 6mm;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8mm;
        color: ${muted};
        font-size: 8px;
        font-weight: 800;
        text-align: center;
      }

      .signature-area div {
        border-top: 1px solid ${border};
        padding-top: 2mm;
        min-height: 8mm;
      }

      .invoice-footer {
        margin-top: 4mm;
        border-top: 1px solid ${border};
        padding-top: 2.5mm;
        color: ${muted};
        text-align: center;
        font-size: 6.8px;
        line-height: 1.7;
        font-weight: 700;
      }
    </style>
  `;

  return wrapper;
}

async function createInvoicePdf({ order, settings }) {
  const invoiceElement = buildInvoiceElement({ order, settings });
  document.body.appendChild(invoiceElement);

  const target = invoiceElement.querySelector(".invoice-a5");

  const canvas = await html2canvas(target, {
    scale: 2.6,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    windowWidth: target.scrollWidth,
    windowHeight: target.scrollHeight,
  });

  document.body.removeChild(invoiceElement);

  const imageData = canvas.toDataURL("image/jpeg", 1);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5",
    compress: true,
  });

  pdf.addImage(imageData, "JPEG", 0, 0, 148, 210);

  return pdf;
}

export default function NewOrder() {
  useCurrencyVersion();
  const dateSettingsVersion = useDateSettingsVersion();

  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams();
  const datePickerRef = useRef(null);

  const isEditOrderMode = Boolean(orderId);
  const cameFromDashboard = location.state?.fromDashboard === true;

  const [form, setForm] = useState(() => createDefaultForm());
  const [rows, setRows] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [orderDate, setOrderDate] = useState(() => getCurrentConfiguredInputDate());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarView, setCalendarView] = useState(() =>
    getJalaliPartsFromInputDate(getCurrentConfiguredInputDate())
  );
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [editingOrder, setEditingOrder] = useState(null);

  const goBackAfterOrderAction = () => {
    if (cameFromDashboard) {
      navigate("/dashboard");
      return;
    }

    navigate("/orders");
  };

  useEffect(() => {
    if (!calendarOpen) return;

    const handleOutsideClick = (event) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target)
      ) {
        setCalendarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [calendarOpen]);

  useEffect(() => {
    setCalendarView(getJalaliPartsFromInputDate(orderDate));
  }, [orderDate]);

  useEffect(() => {
    const refreshProducts = async () => {
      try {
        const data = await fetchProducts();
        const normalized = normalizeProducts(data);
        setProducts(normalized.length > 0 ? normalized : loadProductsFromStorage());
      } catch {
        setProducts(loadProductsFromStorage());
      }
    };

    refreshProducts();
    window.addEventListener("focus", refreshProducts);
    window.addEventListener("order-assistant-products-updated", refreshProducts);

    return () => {
      window.removeEventListener("focus", refreshProducts);
      window.removeEventListener(
        "order-assistant-products-updated",
        refreshProducts
      );
    };
  }, []);

  useEffect(() => {
    const refreshCustomers = async () => {
      try {
        const data = await fetchCustomers();
        setCustomers(normalizeCustomers(data));
      } catch {
        setCustomers(loadCustomersFromStorage());
      }
    };

    refreshCustomers();
    window.addEventListener("focus", refreshCustomers);
    window.addEventListener(
      "order-assistant-customers-updated",
      refreshCustomers
    );

    return () => {
      window.removeEventListener("focus", refreshCustomers);
      window.removeEventListener(
        "order-assistant-customers-updated",
        refreshCustomers
      );
    };
  }, []);

  useEffect(() => {
    if (isEditOrderMode || rows.length > 0) return;

    setOrderDate(getCurrentConfiguredInputDate());
    setCalendarView(getJalaliPartsFromInputDate(getCurrentConfiguredInputDate()));
  }, [dateSettingsVersion, isEditOrderMode, rows.length]);

  useEffect(() => {
    if (!orderId) return;

    const loadOrderForEdit = async () => {
      try {
        const foundOrder = await fetchOrder(orderId);

        const normalizedRows = Array.isArray(foundOrder.items)
          ? foundOrder.items.map((row) =>
              normalizeRow({
                ...row,
                customer: foundOrder.customer || row.customer || "-",
                date: row.date || foundOrder.date || "",
                dateInputValue: row.dateInputValue || row.date_input_value || foundOrder.dateInputValue || foundOrder.date_input_value || "",
                dateRaw: row.dateRaw || row.date_raw || row.date || foundOrder.date || "",
              })
            )
          : [];

        const invoiceSettings = loadInvoiceSettings();

        setEditingOrder(foundOrder);

        setForm({
          ...createDefaultForm(),
          customerName: foundOrder.customer || "",
          customerPhone: foundOrder.phone || "",
          customerQuality: foundOrder.customerQuality || "عادی",
          orderStatus: normalizeStatusForForm(
            foundOrder.status || foundOrder.orderStatus || foundOrder.statusLabel
          ),
          prepayment: String(
            foundOrder.prepaymentRaw || extractNumber(foundOrder.prepayment) || ""
          ),
          invoiceDescription:
            foundOrder.invoiceDescription ||
            invoiceSettings.invoiceDescription ||
            DEFAULT_INVOICE_SETTINGS.invoiceDescription,
        });

        setRows(normalizedRows);
        setOrderDate(foundOrder.dateInputValue || foundOrder.date_input_value || getCurrentConfiguredInputDate());
        setSelectedIndex(null);
        setEditingIndex(null);
      } catch {
        alert("سفارش مورد نظر پیدا نشد.");
        navigate("/orders");
      }
    };

    loadOrderForEdit();
  }, [orderId, navigate]);

  const selectedDateText = useMemo(() => {
    return formatDateTimeForDisplay(orderDate);
  }, [orderDate, dateSettingsVersion]);

  const isEditing = editingIndex !== null;

  const totalAmount = useMemo(() => {
    return rows.reduce((sum, row) => sum + Number(row.totalRaw || 0), 0);
  }, [rows]);

  const prepaymentAmount = Number(form.prepayment || 0);
  const remainingAmount = Math.max(0, totalAmount - prepaymentAmount);

  const productNames = useMemo(() => {
    const unique = new Set(products.map((item) => item.name).filter(Boolean));
    return Array.from(unique);
  }, [products]);

  const customerNames = useMemo(() => {
    const unique = new Set(customers.map((item) => item.name).filter(Boolean));
    return Array.from(unique);
  }, [customers]);

  const customerPhones = useMemo(() => {
    const unique = new Set(customers.map((item) => item.phone).filter(Boolean));
    return Array.from(unique);
  }, [customers]);

  const applyCustomerToForm = (customer) => {
    if (!customer) return;

    setForm((prev) => ({
      ...prev,
      customerName: customer.name || prev.customerName,
      customerPhone: customer.phone || prev.customerPhone,
      customerQuality: customer.quality || prev.customerQuality || "عادی",
    }));
  };

  const tryAutoSelectCustomer = (fieldKey) => {
    const value =
      fieldKey === "customerPhone" ? form.customerPhone : form.customerName;

    const exactMatch = findCustomerExact(customers, value);
    const looseMatch = exactMatch || findCustomerLoose(customers, value);

    if (looseMatch) {
      applyCustomerToForm(looseMatch);
    }
  };

  const updateField = (key, value) => {
    setForm((prev) => {
      if (key === "quantityMethod") {
        return {
          ...prev,
          quantityMethod: value,
          addQuantityMethod: value,
        };
      }

      if (key === "productName") {
        const foundProduct = products.find((item) => item.name === value);

        return {
          ...prev,
          productName: value,
          unitPrice:
            foundProduct?.unitPrice && !prev.unitPrice
              ? foundProduct.unitPrice
              : prev.unitPrice,
        };
      }

      if (key === "customerName") {
        const foundCustomer = findCustomerExact(customers, value);

        if (foundCustomer) {
          return {
            ...prev,
            customerName: foundCustomer.name || value,
            customerPhone: foundCustomer.phone || prev.customerPhone,
            customerQuality: foundCustomer.quality || prev.customerQuality,
          };
        }

        return {
          ...prev,
          customerName: value,
        };
      }

      if (key === "customerPhone") {
        const foundCustomer = findCustomerExact(customers, value);

        if (foundCustomer) {
          return {
            ...prev,
            customerName: foundCustomer.name || prev.customerName,
            customerPhone: foundCustomer.phone || value,
            customerQuality: foundCustomer.quality || prev.customerQuality,
          };
        }

        return {
          ...prev,
          customerPhone: value,
        };
      }

      return {
        ...prev,
        [key]: value,
      };
    });
  };

  const clearItemFieldsOnly = () => {
    setForm((prev) => ({
      ...prev,
      productName: "",
      quantityMethod: "تعداد",
      quantityValue: "",
      addQuantityMethod: "تعداد",
      addQuantity: "",
      finalQuantity: "",
      unitPrice: "",
      notes: "",
    }));
  };

  const resetWholePage = () => {
    setForm(createDefaultForm());
    setRows([]);
    setSelectedIndex(null);
    setEditingIndex(null);
    setEditingOrder(null);
    setOrderDate(getCurrentConfiguredInputDate());

    if (isEditOrderMode) {
      navigate("/orders/new", {
        state: cameFromDashboard ? { fromDashboard: true } : undefined,
      });
    }
  };

  const buildItemFromForm = () => {
    const baseQuantity = Number(form.quantityValue || 0);
    const addedQuantity = Number(form.addQuantity || 0);
    const finalQuantity = Number(form.finalQuantity || 0);

    const quantityNumber = finalQuantity || baseQuantity + addedQuantity;
    const unitPriceNumber = Number(form.unitPrice || 0);
    const totalRaw = quantityNumber * unitPriceNumber;

    const isCount = form.quantityMethod === "تعداد";
    const isWeight = form.quantityMethod === "وزن";
    const isLength = form.quantityMethod === "طول";

    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,

      name: form.productName || "بدون نام",
      customer: form.customerName || "-",
      date: selectedDateText,
      dateInputValue: orderDate,
      dateRaw: orderDate,

      quantityMethod: form.quantityMethod,
      quantityValueRaw: form.quantityValue,
      addQuantityMethod: form.addQuantityMethod,
      addQuantityRaw: form.addQuantity,
      finalQuantityRaw: form.finalQuantity,

      quantityNumber,
      quantity: `${toFaNumber(quantityNumber)} ${form.quantityMethod}`,

      countDisplay: isCount ? toFaNumber(quantityNumber) : "-",
      weight: isWeight ? toFaNumber(quantityNumber) : "-",
      length: isLength ? toFaNumber(quantityNumber) : "-",

      unitPriceRaw: form.unitPrice,
      unitPrice: toCurrency(unitPriceNumber),

      total: toCurrency(totalRaw),
      totalRaw,

      specs: form.notes || "-",
      notes: form.notes || "",
    };
  };

  const validateItem = () => {
    if (!form.customerName.trim()) {
      alert("نام مشتری را وارد کنید.");
      return false;
    }

    if (!form.productName.trim()) {
      alert("نام محصول را وارد کنید.");
      return false;
    }

    if (!form.quantityValue && !form.addQuantity && !form.finalQuantity) {
      alert("مقدار سفارش را وارد کنید.");
      return false;
    }

    if (!form.unitPrice) {
      alert("قیمت واحد را وارد کنید.");
      return false;
    }

    return true;
  };

  const addRow = () => {
    if (!validateItem()) return;

    const item = buildItemFromForm();

    setRows((prev) => [...prev, item]);
    clearItemFieldsOnly();
    setSelectedIndex(null);
    setEditingIndex(null);
  };

  const startEditRow = (indexArg = selectedIndex) => {
    if (indexArg === null || indexArg === undefined || !rows[indexArg]) return;

    const item = rows[indexArg];

    setForm((prev) => ({
      ...prev,
      productName: item.name || "",
      quantityMethod: item.quantityMethod || "تعداد",
      quantityValue: item.quantityValueRaw || extractNumber(item.quantity),
      addQuantityMethod: item.addQuantityMethod || item.quantityMethod || "تعداد",
      addQuantity: item.addQuantityRaw || "",
      finalQuantity: item.finalQuantityRaw || "",
      unitPrice: item.unitPriceRaw || extractNumber(item.unitPrice),
      notes: item.notes || "",
    }));

    setSelectedIndex(indexArg);
    setEditingIndex(indexArg);
  };

  const saveEditRow = () => {
    if (editingIndex === null) return;
    if (!validateItem()) return;

    const updatedItem = {
      ...buildItemFromForm(),
      id: rows[editingIndex]?.id || `${Date.now()}`,
    };

    setRows((prev) =>
      prev.map((row, index) => (index === editingIndex ? updatedItem : row))
    );

    clearItemFieldsOnly();
    setSelectedIndex(null);
    setEditingIndex(null);
  };

  const cancelEditRow = () => {
    clearItemFieldsOnly();
    setSelectedIndex(null);
    setEditingIndex(null);
  };

  const deleteRow = () => {
    if (selectedIndex === null) return;

    setRows((prev) => prev.filter((_, index) => index !== selectedIndex));
    setSelectedIndex(null);
    setEditingIndex(null);
    clearItemFieldsOnly();
  };

  const createOrderPayload = () => {
    const orders = loadOrders();
    const statusForTable = normalizePersianStatus(form.orderStatus || "ثبت‌شده");
    const invoiceSettings = loadInvoiceSettings();

    return {
      uid: editingOrder?.uid || Date.now(),
      code: editingOrder?.code || makeOrderCode(orders.length),
      customer: form.customerName || "بدون نام",
      phone: form.customerPhone,
      customerQuality: form.customerQuality,

      items: rows.map((row) => ({
        ...row,
        customer: form.customerName || row.customer || "-",
      })),

      status: statusForTable,
      orderStatus: statusForTable,
      statusLabel: statusForTable,

      date: selectedDateText,
      dateInputValue: orderDate,

      invoiceDescription:
        form.invoiceDescription ||
        invoiceSettings.invoiceDescription ||
        DEFAULT_INVOICE_SETTINGS.invoiceDescription,

      total: toCurrency(totalAmount),
      totalRaw: totalAmount,
      prepayment: toCurrency(prepaymentAmount),
      prepaymentRaw: prepaymentAmount,
      remaining: toCurrency(remainingAmount),
      remainingRaw: remainingAmount,
    };
  };

  const saveOrder = async () => {
    if (!form.customerName.trim()) {
      alert("نام مشتری را وارد کنید.");
      return;
    }

    if (rows.length === 0) {
      alert("حداقل یک ردیف سفارش اضافه کنید.");
      return;
    }

    const payload = createOrderPayload();

    try {
      const savedOrder = isEditOrderMode
        ? await updateOrderApi(orderId, payload)
        : await createOrderApi(payload);

      setEditingOrder(savedOrder);
      window.dispatchEvent(
        new CustomEvent("order-assistant-orders-updated", {
          detail: savedOrder,
        })
      );
      alert(isEditOrderMode ? "تغییرات سفارش ذخیره شد." : "سفارش با موفقیت ثبت شد.");
    } catch {
      alert("خطا در ذخیره سفارش در سرور");
    }
  };

  const printInvoice = async () => {
    if (!form.customerName.trim()) {
      alert("نام مشتری را وارد کنید.");
      return;
    }

    if (rows.length === 0) {
      alert("ابتدا حداقل یک ردیف به سفارش اضافه کنید.");
      return;
    }

    const settings = loadInvoiceSettings();
    const order = createOrderPayload();

    try {
      const pdf = await createInvoicePdf({ order, settings });

      const safeCustomerName = String(order.customer || "customer")
        .replace(/[\\/:*?"<>|]/g, "-")
        .trim();

      pdf.save(`invoice-${order.code}-${safeCustomerName}.pdf`);
    } catch (error) {
      console.error(error);
      alert("خطا در ساخت PDF فاکتور.");
    }
  };

  return (
    <div className="new-order-page">
      <div className="new-order-card">
        <header className="new-order-page-header">
          <div className="new-order-page-header__title">
            <h1>{isEditOrderMode ? "ویرایش سفارش" : "ثبت سفارش جدید"}</h1>
          </div>

          <div className="new-order-page-header__actions">
            <button
              type="button"
              className="new-order-back-btn"
              onClick={goBackAfterOrderAction}
            >
              بازگشت
            </button>

            <JalaliCalendarPicker
              value={orderDate}
              displayText={selectedDateText}
              isOpen={calendarOpen}
              onToggle={() => setCalendarOpen((open) => !open)}
              onSelect={(selectedDate) => {
                setOrderDate(selectedDate);
                setCalendarOpen(false);
              }}
              view={calendarView}
              onViewChange={setCalendarView}
              pickerRef={datePickerRef}
            />
          </div>
        </header>

        <div className="new-order-content">
          <section className="new-order-section">
            <h2>مشخصات مشتری</h2>

            <div className="new-order-divider" />

            <div className="new-order-grid new-order-grid--4">
              <label className="new-order-field">
                <span>نام</span>
                <input
                  list="new-order-customers"
                  value={form.customerName}
                  onChange={(event) =>
                    updateField("customerName", event.target.value)
                  }
                  onBlur={() => tryAutoSelectCustomer("customerName")}
                  placeholder="جستجو یا انتخاب مشتری"
                />

                <datalist id="new-order-customers">
                  {customerNames.map((customerName) => (
                    <option value={customerName} key={customerName} />
                  ))}
                </datalist>
              </label>

              <label className="new-order-field">
                <span>شماره تماس</span>
                <input
                  list="new-order-customer-phones"
                  value={form.customerPhone}
                  onChange={(event) =>
                    updateField("customerPhone", event.target.value)
                  }
                  onBlur={() => tryAutoSelectCustomer("customerPhone")}
                  placeholder="جستجو یا انتخاب شماره مشتری"
                />

                <datalist id="new-order-customer-phones">
                  {customerPhones.map((phone) => (
                    <option value={phone} key={phone} />
                  ))}
                </datalist>
              </label>

              <label className="new-order-field">
                <span>وضعیت سفارش</span>
                <select
                  value={form.orderStatus}
                  onChange={(event) =>
                    updateField("orderStatus", event.target.value)
                  }
                >
                  <option value="ثبت‌شده">ثبت‌شده</option>
                  <option value="پرداخت شده">پرداخت شده</option>
                  <option value="در انتظار پرداخت">در انتظار پرداخت</option>
                  <option value="لغو شده">لغو شده</option>
                </select>
              </label>

              <label className="new-order-field">
                <span>کیفیت مشتری</span>
                <select
                  value={form.customerQuality}
                  onChange={(event) =>
                    updateField("customerQuality", event.target.value)
                  }
                >
                  <option>عادی</option>
                  <option>خوب</option>
                  <option>ویژه</option>
                  <option>بدحساب</option>
                </select>
              </label>
            </div>
          </section>

          <section className="new-order-section">
            <h2>سفارش</h2>

            <div className="new-order-divider" />

            <div className="new-order-grid new-order-grid--5">
              <label className="new-order-field">
                <span>نام محصول</span>
                <input
                  list="new-order-products"
                  value={form.productName}
                  onChange={(event) =>
                    updateField("productName", event.target.value)
                  }
                  placeholder="جستجو یا انتخاب محصول"
                />

                <datalist id="new-order-products">
                  {productNames.map((product) => (
                    <option value={product} key={product} />
                  ))}
                </datalist>
              </label>

              <label className="new-order-field">
                <span>نحوه تعیین مقدار</span>
                <select
                  value={form.quantityMethod}
                  onChange={(event) =>
                    updateField("quantityMethod", event.target.value)
                  }
                >
                  <option>تعداد</option>
                  <option>وزن</option>
                  <option>طول</option>
                </select>
              </label>

              <label className="new-order-field">
                <span>مقدار {form.quantityMethod}</span>
                <input
                  type="number"
                  value={form.quantityValue}
                  onChange={(event) =>
                    updateField("quantityValue", event.target.value)
                  }
                />
              </label>

              <label className="new-order-field">
                <span>افزودن مقدار جدید</span>
                <select
                  value={form.addQuantityMethod}
                  onChange={(event) =>
                    updateField("addQuantityMethod", event.target.value)
                  }
                >
                  <option>تعداد</option>
                  <option>وزن</option>
                  <option>طول</option>
                </select>
              </label>

              <label className="new-order-field">
                <span>مقدار</span>
                <input
                  type="number"
                  value={form.addQuantity}
                  onChange={(event) =>
                    updateField("addQuantity", event.target.value)
                  }
                />
              </label>
            </div>
          </section>

          <section className="new-order-section new-order-section--price">
            <h2>محاسبه قیمت</h2>

            <div className="new-order-divider" />

            <div className="new-order-grid new-order-grid--4">
              <label className="new-order-field">
                <span>مبنای قیمت</span>
                <input
                  value={form.quantityMethod}
                  readOnly
                  className="new-order-readonly-input"
                />
              </label>

              <label className="new-order-field">
                <span>قیمت واحد</span>
                <input
                  type="number"
                  value={form.unitPrice}
                  onChange={(event) =>
                    updateField("unitPrice", event.target.value)
                  }
                />
              </label>

              <label className="new-order-field">
                <span>پیش پرداخت</span>
                <input
                  type="number"
                  value={form.prepayment}
                  onChange={(event) =>
                    updateField("prepayment", event.target.value)
                  }
                />
              </label>

              <label className="new-order-field">
                <span>توضیحات تکمیلی</span>
                <input
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                />
              </label>
            </div>

            <label className="new-order-field new-order-field--invoice-description">
              <span>توضیحات فاکتور</span>
              <textarea
                value={form.invoiceDescription}
                onChange={(event) =>
                  updateField("invoiceDescription", event.target.value)
                }
                placeholder="توضیحات فاکتور را وارد کنید"
              />
            </label>

            <div className="new-order-add-row-wrap">
              {!isEditing ? (
                <button
                  type="button"
                  className="new-order-add-row-btn"
                  onClick={addRow}
                >
                  افزودن به فاکتور
                </button>
              ) : (
                <div className="new-order-edit-actions">
                  <button
                    type="button"
                    className="new-order-save-edit-btn"
                    onClick={saveEditRow}
                  >
                    ذخیره تغییرات
                  </button>

                  <button
                    type="button"
                    className="new-order-cancel-edit-btn"
                    onClick={cancelEditRow}
                  >
                    لغو ویرایش
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="new-order-table-section">
            <div className="new-order-table-wrap">
              <table className="new-order-table">
                <thead>
                  <tr>
                    <th>نام محصول</th>
                    <th>نام مشتری</th>
                    <th>تاریخ</th>
                    <th>تعداد</th>
                    <th>وزن</th>
                    <th>طول</th>
                    <th>مشخصات</th>
                    <th>قیمت واحد</th>
                    <th>جمع ردیف</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="new-order-empty-row">
                        هنوز ردیفی به فاکتور اضافه نشده است.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr
                        key={row.id || `${row.name}-${index}`}
                        className={selectedIndex === index ? "is-selected" : ""}
                        onClick={() => setSelectedIndex(index)}
                        onDoubleClick={() => startEditRow(index)}
                      >
                        <td>{row.name}</td>
                        <td>{row.customer || "-"}</td>
                        <td>{formatStoredDateForDisplay(row.dateInputValue || row.dateRaw || row.date)}</td>
                        <td>{row.countDisplay || "-"}</td>
                        <td>{row.weight || "-"}</td>
                        <td>{row.length || "-"}</td>
                        <td>{row.specs || "-"}</td>
                        <td>{formatCurrencyValue(row.unitPriceRaw || row.unitPrice || 0)}</td>
                        <td>{formatCurrencyValue(row.totalRaw || row.total || 0)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <footer className="new-order-bottom-bar">
          <div className="new-order-bottom-actions">
            <button type="button" onClick={printInvoice}>
              چاپ فاکتور
            </button>

            <button type="button" onClick={saveOrder}>
              {isEditOrderMode ? "ذخیره سفارش" : "ثبت سفارش"}
            </button>

            <button type="button" onClick={deleteRow}>
              حذف ردیف
            </button>

            <button type="button" onClick={() => startEditRow()}>
              ویرایش ردیف
            </button>

            <button type="button" onClick={resetWholePage}>
              سفارش جدید
            </button>
          </div>

          <div className="new-order-total">
            <span>جمع کل:</span>
            <strong>{toCurrency(totalAmount)}</strong>
          </div>
        </footer>
      </div>
    </div>
  );
}