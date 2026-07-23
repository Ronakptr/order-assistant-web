import * as XLSX from "xlsx";
import api from "./client";
import { fetchCustomers, createCustomer } from "./customers";
import { fetchProducts, createProduct } from "./products";
import { fetchOrders, createOrder } from "./orders";

export const ACCOUNTING_PROVIDERS = {
  asan: "آسان",
  soren: "سورن",
};

export const ASAN_CUSTOMER_HEADERS = [
  "گروه",
  "کد",
  "نام",
  "نام خانوادگی",
  "شرکت",
  "نوع شخص",
  "ملیت",
  "تلفن همراه",
  "تلفن",
  "آدرس",
  "توضیحات",
  "کد اقتصادی",
  "شناسه ملی",
  "کدپستی",
  "کد شعبه",
];

export const ASAN_PRODUCT_HEADERS = [
  "گروه",
  "زیرگروه",
  "نام کالا",
  "سریال",
  "بارکد",
  "واحد",
  "قیمت خرید",
  "قیمت فروش",
  "موجودی اولیه",
  "توضیحات",
  "بارکد دوم",
  "تخفیف خرید",
  "تخفیف فروش",
  "شناسه مالیاتی",
  "درصد مالیات",
];

export const ASAN_ORDER_HEADERS = [
  "شماره فاکتور",
  "شناسه شخص",
  "تاریخ",
  "تخفیف فاکتور",
  "مالیات فاکتور",
  "توضیحات فاکتور",
  "نام کالا",
  "توضیحات کالا",
  "تعداد/ مقدار",
  "قیمت واحد",
  "تخفیف کالا",
  "مالیات کالا",
];

export const SOREN_SHEETS = {
  customers: "output",
  products: "reportXLSX",
  orders: "forush",
};

export const SOREN_CUSTOMER_HEADERS = [
  "توضیحات",
  "آدرس",
  "کدپستی",
  "شماره اقتصادی",
  "شناسه ملی",
  "تلفن همراه",
  "تلفن",
  "کدحساب",
  "نام",
  "کد",
];

export const SOREN_PRODUCT_HEADERS = [
  "کد مالیاتی",
  "کد واحد مالیاتی",
  "کد کالا",
  "کد گروه",
  "نام کالا",
  "قیمت فروش",
  "قیمت خرید",
  "واحد کالا",
];

export const SOREN_ORDER_HEADERS = ["kalacode", "value", "price", "kharidar", "factno"];

export function defaultAccountingSettings() {
  return {
    provider: "",
    asan: {
      enabled: false,
      customer_id_start: 1001,
      product_id_start: 1001,
      order_prefix: "S",
      default_customer_group: "مشتری ها",
      default_customer_type: "حقیقی",
      default_customer_nationality: "ایرانی",
      default_product_group: "متفرقه",
      default_product_subgroup: "متفرقه",
      default_purchase_price: 0,
      default_initial_stock: 0,
      default_invoice_discount: 0,
      default_invoice_tax: 0,
      default_item_discount: 0,
      default_item_tax: 0,
      default_product_purchase_discount: 0,
      default_product_sales_discount: 0,
      default_product_tax_rate: 0,
      product_id_column: "serial_and_barcode",
      mark_orders_after_export: true,
    },
    soren: {
      enabled: false,
      customer_id_start: 1,
      product_id_start: 1,
      order_prefix: "",
      customer_id_width: 6,
      product_id_width: 10,
      default_customer_account_prefix: "102001",
      default_product_group_code: "001",
      default_tax_code: "",
      default_tax_unit_code: "",
      default_unit_code: "01",
      mark_orders_after_export: true,
    },
  };
}

function deepMerge(base, override) {
  const result = { ...base };

  Object.entries(override || {}).forEach(([key, value]) => {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  });

  return result;
}

export function normalizeAccountingSettings(settings = {}) {
  const merged = deepMerge(defaultAccountingSettings(), settings || {});
  const provider = ["asan", "soren"].includes(String(merged.provider || "").toLowerCase())
    ? String(merged.provider || "").toLowerCase()
    : "";

  merged.provider = provider;

  if (provider === "asan" && merged.asan.enabled) {
    merged.soren.enabled = false;
  }

  if (provider === "soren" && merged.soren.enabled) {
    merged.asan.enabled = false;
  }

  return merged;
}

export async function fetchAccountingSettings() {
  const response = await api.get("/settings/accounting");
  return normalizeAccountingSettings(response.data || {});
}

export async function saveAccountingSettings(settings) {
  const response = await api.put("/settings/accounting", normalizeAccountingSettings(settings));
  window.dispatchEvent(new CustomEvent("order-assistant-accounting-settings-updated"));
  return normalizeAccountingSettings(response.data || settings);
}

export async function allocateAccountingIds(entity = "all", provider = "") {
  const response = await api.post("/accounting/allocate-ids", { entity, provider });
  window.dispatchEvent(new CustomEvent("order-assistant-accounting-ids-updated"));
  return response.data;
}

export async function markOrdersExported(provider = "", orderIds = null) {
  const response = await api.post("/accounting/mark-exported", {
    provider,
    order_ids: orderIds,
    exported: true,
  });
  return response.data;
}

function safeNumber(value) {
  if (value === null || value === undefined || value === "") return 0;

  const normalized = String(value)
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit))
    .replace(/,/g, "")
    .replace(/،/g, "")
    .replace(/[^0-9.-]/g, "");

  const number = Number(normalized);

  return Number.isFinite(number) ? number : 0;
}

function cleanId(value) {
  if (value === null || value === undefined) return "";

  const text = String(value)
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit))
    .replace(/,/g, "")
    .replace(/،/g, "")
    .replace(/\u200c/g, "")
    .trim();

  if (/^\d+\.0+$/.test(text)) return text.split(".")[0];

  return text;
}

function writeWorkbook(fileName, sheets) {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ name, rows, headers }) => {
    const safeRows = Array.isArray(rows) && rows.length ? rows : [Object.fromEntries(headers.map((h) => [h, ""]))];
    const worksheet = XLSX.utils.json_to_sheet(safeRows, { header: headers });

    worksheet["!cols"] = headers.map((header) => ({ wch: Math.min(Math.max(String(header).length + 8, 12), 34) }));
    worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };

    XLSX.utils.book_append_sheet(workbook, worksheet, name || "Sheet1");
  });

  XLSX.writeFile(workbook, fileName);
}

function getProvider(settings) {
  return settings?.provider || (settings?.soren?.enabled ? "soren" : settings?.asan?.enabled ? "asan" : "asan");
}

function getActiveProviderSettings(settings) {
  const provider = getProvider(settings);
  return settings?.[provider] || {};
}

function customerAccountingId(customer) {
  return cleanId(customer?.accounting_id || customer?.accountingId || customer?.customer_code || customer?.customerCode || customer?.code || customer?.id);
}

function productAccountingId(product) {
  return cleanId(product?.accounting_id || product?.accountingId || product?.product_code || product?.productCode || product?.code || product?.id);
}

function orderAccountingId(order, settings) {
  const active = getActiveProviderSettings(settings);
  const prefix = String(active.order_prefix || "");
  return cleanId(order?.accounting_id || order?.accountingId || (prefix ? `${prefix}${order?.uid || order?.id || order?.code}` : order?.code || order?.uid || order?.id));
}

export function buildAsanCustomerRows(customers, settings) {
  const cfg = settings?.asan || defaultAccountingSettings().asan;

  return customers.map((customer) => ({
    "گروه": cfg.default_customer_group,
    "کد": customerAccountingId(customer),
    "نام": customer?.name || "",
    "نام خانوادگی": "",
    "شرکت": "",
    "نوع شخص": cfg.default_customer_type,
    "ملیت": cfg.default_customer_nationality,
    "تلفن همراه": customer?.phone || customer?.mobile || "",
    "تلفن": customer?.phone || "",
    "آدرس": customer?.address || "",
    "توضیحات": customer?.description || "",
    "کد اقتصادی": customer?.economicCode || customer?.economic_code || "",
    "شناسه ملی": customer?.nationalId || customer?.national_id || "",
    "کدپستی": customer?.postalCode || customer?.postal_code || "",
    "کد شعبه": "",
  }));
}

export function buildAsanProductRows(products, settings) {
  const cfg = settings?.asan || defaultAccountingSettings().asan;

  return products.map((product) => ({
    "گروه": cfg.default_product_group,
    "زیرگروه": cfg.default_product_subgroup,
    "نام کالا": product?.name || "",
    "سریال": productAccountingId(product),
    "بارکد": productAccountingId(product),
    "واحد": product?.unit || "عدد",
    "قیمت خرید": safeNumber(product?.factory_purchase_price || product?.base_price || cfg.default_purchase_price),
    "قیمت فروش": safeNumber(product?.sale_price || product?.default_sale_price || product?.price || product?.unit_price),
    "موجودی اولیه": safeNumber(product?.remaining_stock || product?.stock_quantity || cfg.default_initial_stock),
    "توضیحات": product?.description || "",
    "بارکد دوم": "",
    "تخفیف خرید": safeNumber(cfg.default_product_purchase_discount),
    "تخفیف فروش": safeNumber(cfg.default_product_sales_discount),
    "شناسه مالیاتی": "",
    "درصد مالیات": safeNumber(cfg.default_product_tax_rate),
  }));
}

export function buildAsanOrderRows(orders, settings) {
  const cfg = settings?.asan || defaultAccountingSettings().asan;
  const rows = [];

  orders.forEach((order) => {
    const invoiceId = orderAccountingId(order, settings);
    const customerId = cleanId(order?.customerAccountingId || order?.customer_id || order?.customerCode || order?.phone || order?.customer || "");
    const items = Array.isArray(order?.items) && order.items.length ? order.items : [{}];

    items.forEach((item) => {
      rows.push({
        "شماره فاکتور": invoiceId,
        "شناسه شخص": customerId,
        "تاریخ": order?.date || order?.dateInputValue || "",
        "تخفیف فاکتور": safeNumber(cfg.default_invoice_discount),
        "مالیات فاکتور": safeNumber(cfg.default_invoice_tax),
        "توضیحات فاکتور": order?.invoiceDescription || "",
        "نام کالا": item?.name || "",
        "توضیحات کالا": item?.notes || item?.specs || "",
        "تعداد/ مقدار": safeNumber(item?.quantityNumber || item?.quantityValueRaw || item?.finalQuantityRaw || 0),
        "قیمت واحد": safeNumber(item?.unitPriceRaw || item?.unit_price || item?.unitPrice || 0),
        "تخفیف کالا": safeNumber(cfg.default_item_discount),
        "مالیات کالا": safeNumber(cfg.default_item_tax),
      });
    });
  });

  return rows;
}

export function buildSorenCustomerRows(customers, settings) {
  const cfg = settings?.soren || defaultAccountingSettings().soren;

  return customers.map((customer) => ({
    "توضیحات": customer?.description || "",
    "آدرس": customer?.address || "",
    "کدپستی": customer?.postalCode || customer?.postal_code || "",
    "شماره اقتصادی": customer?.economicCode || customer?.economic_code || "",
    "شناسه ملی": customer?.nationalId || customer?.national_id || "",
    "تلفن همراه": customer?.phone || customer?.mobile || "",
    "تلفن": customer?.phone || "",
    "کدحساب": `${cfg.default_customer_account_prefix}${customerAccountingId(customer)}`,
    "نام": customer?.name || "",
    "کد": customerAccountingId(customer),
  }));
}

export function buildSorenProductRows(products, settings) {
  const cfg = settings?.soren || defaultAccountingSettings().soren;

  return products.map((product) => ({
    "کد مالیاتی": cfg.default_tax_code || "",
    "کد واحد مالیاتی": cfg.default_tax_unit_code || "",
    "کد کالا": productAccountingId(product),
    "کد گروه": cfg.default_product_group_code,
    "نام کالا": product?.name || "",
    "قیمت فروش": safeNumber(product?.sale_price || product?.default_sale_price || product?.price || product?.unit_price),
    "قیمت خرید": safeNumber(product?.factory_purchase_price || product?.base_price || 0),
    "واحد کالا": cfg.default_unit_code || product?.unit || "01",
  }));
}

export function buildSorenOrderRows(orders, settings) {
  const rows = [];

  orders.forEach((order) => {
    const factno = orderAccountingId(order, settings);
    const kharidar = cleanId(order?.customerAccountingId || order?.customer_id || order?.customerCode || order?.phone || order?.customer || "");
    const items = Array.isArray(order?.items) && order.items.length ? order.items : [{}];

    items.forEach((item) => {
      rows.push({
        kalacode: cleanId(item?.accountingId || item?.accounting_id || item?.productCode || item?.id || item?.name || ""),
        value: safeNumber(item?.quantityNumber || item?.quantityValueRaw || item?.finalQuantityRaw || 0),
        price: safeNumber(item?.unitPriceRaw || item?.unit_price || item?.unitPrice || 0),
        kharidar,
        factno,
      });
    });
  });

  return rows;
}

export async function exportAccountingFile(entity, settings, templateOnly = false) {
  const provider = getProvider(settings);
  const suffix = templateOnly ? "template" : "export";
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  let rows = [];
  let headers = [];
  let sheetName = "Sheet1";

  if (entity === "customers") {
    const data = templateOnly ? [] : await fetchCustomers();
    rows = provider === "soren" ? buildSorenCustomerRows(data, settings) : buildAsanCustomerRows(data, settings);
    headers = provider === "soren" ? SOREN_CUSTOMER_HEADERS : ASAN_CUSTOMER_HEADERS;
    sheetName = provider === "soren" ? SOREN_SHEETS.customers : "Customers";
  }

  if (entity === "products") {
    const data = templateOnly ? [] : await fetchProducts({ activeOnly: false });
    rows = provider === "soren" ? buildSorenProductRows(data, settings) : buildAsanProductRows(data, settings);
    headers = provider === "soren" ? SOREN_PRODUCT_HEADERS : ASAN_PRODUCT_HEADERS;
    sheetName = provider === "soren" ? SOREN_SHEETS.products : "Products";
  }

  if (entity === "orders") {
    const data = templateOnly ? [] : await fetchOrders();
    rows = provider === "soren" ? buildSorenOrderRows(data, settings) : buildAsanOrderRows(data, settings);
    headers = provider === "soren" ? SOREN_ORDER_HEADERS : ASAN_ORDER_HEADERS;
    sheetName = provider === "soren" ? SOREN_SHEETS.orders : "Orders";

    const active = getActiveProviderSettings(settings);
    if (!templateOnly && active.mark_orders_after_export) {
      markOrdersExported(provider, data.map((order) => order?.uid || order?.id || order?.code).filter(Boolean)).catch(() => null);
    }
  }

  writeWorkbook(`oa_${provider}_${entity}_${suffix}_${datePart}.xlsx`, [{ name: sheetName, rows, headers }]);

  return { provider, entity, count: rows.length };
}

function readFirstSheetRows(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("خطا در خواندن فایل اکسل"));
    reader.readAsArrayBuffer(file);
  });
}

function pick(row, names) {
  for (const name of names) {
    if (row?.[name] !== undefined && row?.[name] !== null && String(row[name]).trim() !== "") {
      return row[name];
    }
  }

  return "";
}

export async function importAccountingFile(entity, file, settings) {
  const rows = await readFirstSheetRows(file);
  const provider = getProvider(settings);
  let imported = 0;

  if (entity === "customers") {
    for (const row of rows) {
      const name = pick(row, ["نام", "نام مشتری", "نام شخص", "شرکت"]);
      if (!name) continue;

      await createCustomer({
        name: String(name),
        phone: String(pick(row, ["تلفن همراه", "تلفن", "موبایل"])),
        customer_code: cleanId(pick(row, ["کد", "شناسه شخص", "کد مشتری"])),
        oa_internal_code: "",
        accounting_id: cleanId(pick(row, ["کد", "کدحساب", "شناسه شخص", "کد مشتری"])),
        accounting_software: ACCOUNTING_PROVIDERS[provider],
        quality: "عادی",
        source_type: "وارد شده از نرم افزار حسابداری",
        description: String(pick(row, ["توضیحات", "شرح"])),
        is_active: true,
      });
      imported += 1;
    }
  }

  if (entity === "products") {
    for (const row of rows) {
      const name = pick(row, ["نام کالا", "نام محصول", "کالا"]);
      if (!name) continue;

      await createProduct({
        product_code: cleanId(pick(row, ["کد کالا", "سریال", "بارکد", "کد"])),
        name: String(name),
        accounting_id: cleanId(pick(row, ["کد کالا", "سریال", "بارکد", "کد"])),
        accounting_software: ACCOUNTING_PROVIDERS[provider],
        unit: String(pick(row, ["واحد", "واحد کالا"]) || "عدد"),
        sale_price: String(pick(row, ["قیمت فروش", "قیمت"])),
        factory_purchase_price: String(pick(row, ["قیمت خرید"])),
        remaining_stock: String(pick(row, ["موجودی اولیه", "موجودی"])),
        description: String(pick(row, ["توضیحات", "شرح"])),
        is_active: true,
      });
      imported += 1;
    }
  }

  if (entity === "orders") {
    const grouped = new Map();

    rows.forEach((row) => {
      const code = cleanId(pick(row, ["شماره فاکتور", "factno", "کد سفارش", "شماره سفارش"])) || `IMP-${grouped.size + 1}`;
      if (!grouped.has(code)) {
        grouped.set(code, {
          code,
          customer: String(pick(row, ["نام مشتری", "کد مشتری", "شناسه شخص", "kharidar"]) || "وارد شده از حسابداری"),
          phone: "",
          status: "ثبت شده",
          date: String(pick(row, ["تاریخ", "تاریخ فاکتور"])),
          invoiceDescription: String(pick(row, ["توضیحات فاکتور", "شرح فاکتور"])),
          totalRaw: 0,
          total: "0",
          prepaymentRaw: 0,
          remainingRaw: 0,
          items: [],
        });
      }

      const order = grouped.get(code);
      const quantity = safeNumber(pick(row, ["تعداد/ مقدار", "value", "تعداد", "مقدار"]));
      const unitPrice = safeNumber(pick(row, ["قیمت واحد", "price", "قیمت"]));
      const total = quantity * unitPrice;
      order.totalRaw += total;
      order.remainingRaw += total;
      order.items.push({
        id: `${code}-${order.items.length + 1}`,
        name: String(pick(row, ["نام کالا", "کالا", "kalacode"]) || "کالای وارد شده"),
        quantityMethod: "تعداد",
        quantityValueRaw: String(quantity),
        quantityNumber: quantity,
        quantity: String(quantity),
        unitPriceRaw: String(unitPrice),
        unitPrice: String(unitPrice),
        totalRaw: total,
        total: String(total),
        notes: String(pick(row, ["توضیحات کالا", "شرح کالا"])),
      });
    });

    for (const order of grouped.values()) {
      order.total = String(order.totalRaw);
      order.remaining = String(order.remainingRaw);
      await createOrder(order);
      imported += 1;
    }
  }

  window.dispatchEvent(new CustomEvent("order-assistant-accounting-imported"));

  return { provider, entity, imported };
}
