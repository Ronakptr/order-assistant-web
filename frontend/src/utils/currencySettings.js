import { useEffect, useMemo, useState } from "react";
import {
  getCompanyScopedItem,
  migrateLegacyCompanyScopedItem,
  setCompanyScopedItem,
} from "./companyScopedStorage";

export const CURRENCY_STORAGE_KEY = "order_assistant_currency";

export const WORLD_CURRENCIES = [
  { code: "IRR", name: "ریال ایران", symbol: "﷼" },
  { code: "IRT", name: "تومان ایران", symbol: "تومان" },
  { code: "USD", name: "دلار آمریکا", symbol: "$" },
  { code: "EUR", name: "یورو", symbol: "€" },
  { code: "GBP", name: "پوند بریتانیا", symbol: "£" },
  { code: "AED", name: "درهم امارات", symbol: "د.إ" },
  { code: "TRY", name: "لیر ترکیه", symbol: "₺" },
  { code: "CAD", name: "دلار کانادا", symbol: "$" },
  { code: "AUD", name: "دلار استرالیا", symbol: "$" },
  { code: "JPY", name: "ین ژاپن", symbol: "¥" },
  { code: "CNY", name: "یوان چین", symbol: "¥" },
  { code: "CHF", name: "فرانک سوئیس", symbol: "CHF" },
  { code: "SEK", name: "کرون سوئد", symbol: "kr" },
  { code: "NOK", name: "کرون نروژ", symbol: "kr" },
  { code: "DKK", name: "کرون دانمارک", symbol: "kr" },
  { code: "RUB", name: "روبل روسیه", symbol: "₽" },
  { code: "INR", name: "روپیه هند", symbol: "₹" },
  { code: "PKR", name: "روپیه پاکستان", symbol: "₨" },
  { code: "AFN", name: "افغانی افغانستان", symbol: "؋" },
  { code: "IQD", name: "دینار عراق", symbol: "ع.د" },
  { code: "SAR", name: "ریال عربستان", symbol: "﷼" },
  { code: "QAR", name: "ریال قطر", symbol: "﷼" },
  { code: "KWD", name: "دینار کویت", symbol: "د.ك" },
  { code: "BHD", name: "دینار بحرین", symbol: "ب.د" },
  { code: "OMR", name: "ریال عمان", symbol: "﷼" },
  { code: "JOD", name: "دینار اردن", symbol: "د.ا" },
  { code: "EGP", name: "پوند مصر", symbol: "£" },
  { code: "AZN", name: "منات آذربایجان", symbol: "₼" },
  { code: "AMD", name: "درام ارمنستان", symbol: "֏" },
  { code: "GEL", name: "لاری گرجستان", symbol: "₾" },
];

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizeMoneyNumber(value) {
  if (value === null || value === undefined || value === "") return 0;

  const normalized = String(value)
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/,/g, "")
    .replace(/،/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();

  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

export function getCurrencyByCode(code) {
  return (
    WORLD_CURRENCIES.find((currency) => currency.code === code) ||
    WORLD_CURRENCIES.find((currency) => currency.code === "IRT")
  );
}

export function loadCurrencyCode() {
  const raw =
    getCompanyScopedItem(CURRENCY_STORAGE_KEY) ||
    migrateLegacyCompanyScopedItem(CURRENCY_STORAGE_KEY) ||
    "IRT";

  return getCurrencyByCode(raw)?.code || "IRT";
}

export function saveCurrencyCode(currencyCode) {
  const safeCode = getCurrencyByCode(currencyCode)?.code || "IRT";
  setCompanyScopedItem(CURRENCY_STORAGE_KEY, safeCode);

  window.dispatchEvent(
    new CustomEvent("order-assistant-currency-updated", {
      detail: {
        currency: safeCode,
        currencyCode: safeCode,
        currencyInfo: getCurrencyByCode(safeCode),
      },
    })
  );

  return safeCode;
}

export function formatCurrency(value, currencyCode = loadCurrencyCode()) {
  const currency = getCurrencyByCode(currencyCode);
  const number = Math.round(normalizeMoneyNumber(value));

  return `${number.toLocaleString("fa-IR")} ${currency.symbol}`;
}

export function useCurrencyVersion() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setVersion((current) => current + 1);

    window.addEventListener("order-assistant-currency-updated", refresh);
    window.addEventListener("oa-auth-changed", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("order-assistant-currency-updated", refresh);
      window.removeEventListener("oa-auth-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return version;
}

export function useCurrencyFormatter() {
  const version = useCurrencyVersion();

  return useMemo(() => {
    const currencyCode = loadCurrencyCode();
    const currencyInfo = getCurrencyByCode(currencyCode);

    return {
      version,
      currencyCode,
      currencyInfo,
      formatCurrency: (value) => formatCurrency(value, currencyCode),
    };
  }, [version]);
}
