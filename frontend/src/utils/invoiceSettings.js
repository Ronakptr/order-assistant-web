import {
  getCompanyScopedItem,
  migrateLegacyCompanyScopedItem,
  removeCompanyScopedItem,
  setCompanyScopedItem,
} from "./companyScopedStorage";

export const INVOICE_PALETTES = {
  navy_gold: {
    name: "سرمه‌ای / طلایی",
    primary: "#182641",
    accent: "#CBB135",
    surface: "#F8FAFC",
    tableHead: "#EEF2F7",
    border: "#D7DCE5",
    text: "#111827",
    muted: "#64748B",
    danger: "#B91C1C",
  },

  industrial_green: {
    name: "سبز صنعتی",
    primary: "#164E3B",
    accent: "#A3B18A",
    surface: "#F3F7F2",
    tableHead: "#E8EFE6",
    border: "#CBD8C7",
    text: "#10231B",
    muted: "#667A6B",
    danger: "#B91C1C",
  },

  modern_blue: {
    name: "آبی مدرن",
    primary: "#153E75",
    accent: "#38BDF8",
    surface: "#F0F7FF",
    tableHead: "#E2F0FF",
    border: "#C7D8EF",
    text: "#111827",
    muted: "#64748B",
    danger: "#B91C1C",
  },

  rose_cream: {
    name: "رزگلد / کرم",
    primary: "#6B3F35",
    accent: "#D4A373",
    surface: "#FFF8F0",
    tableHead: "#F8E9D9",
    border: "#E8D4C0",
    text: "#1F1714",
    muted: "#8B7468",
    danger: "#B91C1C",
  },

  formal_gray: {
    name: "خاکستری رسمی",
    primary: "#2F343B",
    accent: "#A8A29E",
    surface: "#FAFAFA",
    tableHead: "#F1F1F2",
    border: "#D4D4D8",
    text: "#18181B",
    muted: "#71717A",
    danger: "#B91C1C",
  },
};

export const DEFAULT_INVOICE_SETTINGS = {
  company: {
    name: "فارس برش",
    tagline: "آهن‌آلات و برشکاری",
    address: "شیراز، بلوار امیرکبیر",
    phones: "09177151440 / 09170123033",
    website: "www.Farsboresh.ir",
    email: "info@farsboresh.ir",
    economicCode: "۱۱۴-۸۸۲-۴۴۱",
    logoUrl: "",
  },

  palette: INVOICE_PALETTES.navy_gold,

  visibility: {
    showLogo: true,
    showCompanyName: true,
    showTagline: true,
    showAddress: true,
    showPhones: true,
    showWebsite: true,
    showEmail: false,
    showEconomicCode: false,
    showBuyerSignature: true,
    showSellerSignature: true,
    showFooter: true,
  },

  tax: {
    enabledByDefault: true,
    defaultRate: 9,
  },

  invoice: {
    title: "فاکتور فروش",
    pageSize: "A5",
    orientation: "portrait",
    note: "لطفاً قبل از بارگیری، مشخصات کالا را با سفارش کنترل شود.",
    validityText: "اعتبار فاکتور تا 24 ساعت می‌باشد.",
    footerText:
      "آهن آلات و برشکاری فارس برش، عرضه کننده انواع آهن آلات ساختمانی و تولید کننده انواع والپست، تسمه‌های قالب بندی، میلگرد بستر و گیره و قلاب و برش و CNC انواع ورق.",
  },
};

const STORAGE_KEY = "order-assistant-invoice-settings";

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (!isObject(base)) return override ?? base;
  if (!isObject(override)) return { ...base };

  const result = { ...base };

  Object.keys(override).forEach((key) => {
    if (isObject(result[key]) && isObject(override[key])) {
      result[key] = deepMerge(result[key], override[key]);
    } else {
      result[key] = override[key];
    }
  });

  return result;
}

export function loadInvoiceSettings() {
  try {
    const raw =
      getCompanyScopedItem(STORAGE_KEY) ||
      migrateLegacyCompanyScopedItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_INVOICE_SETTINGS };

    return deepMerge(DEFAULT_INVOICE_SETTINGS, JSON.parse(raw));
  } catch {
    return { ...DEFAULT_INVOICE_SETTINGS };
  }
}

export function saveInvoiceSettings(settings) {
  const merged = deepMerge(DEFAULT_INVOICE_SETTINGS, settings);
  setCompanyScopedItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

export function resetInvoiceSettings() {
  removeCompanyScopedItem(STORAGE_KEY);
  return { ...DEFAULT_INVOICE_SETTINGS };
}