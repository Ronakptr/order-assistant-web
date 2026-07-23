import { useState } from "react";
import "./CurrencySettings.css";

const WORLD_CURRENCIES = [
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
  { code: "ILS", name: "شکل اسرائیل", symbol: "₪" },
  { code: "EGP", name: "پوند مصر", symbol: "£" },
  { code: "ZAR", name: "رند آفریقای جنوبی", symbol: "R" },
  { code: "BRL", name: "رئال برزیل", symbol: "R$" },
  { code: "MXN", name: "پزوی مکزیک", symbol: "$" },
  { code: "ARS", name: "پزوی آرژانتین", symbol: "$" },
  { code: "CLP", name: "پزوی شیلی", symbol: "$" },
  { code: "COP", name: "پزوی کلمبیا", symbol: "$" },
  { code: "NZD", name: "دلار نیوزیلند", symbol: "$" },
  { code: "SGD", name: "دلار سنگاپور", symbol: "$" },
  { code: "HKD", name: "دلار هنگ‌کنگ", symbol: "$" },
  { code: "KRW", name: "وون کره جنوبی", symbol: "₩" },
  { code: "THB", name: "بات تایلند", symbol: "฿" },
  { code: "MYR", name: "رینگیت مالزی", symbol: "RM" },
  { code: "IDR", name: "روپیه اندونزی", symbol: "Rp" },
  { code: "PHP", name: "پزوی فیلیپین", symbol: "₱" },
  { code: "VND", name: "دانگ ویتنام", symbol: "₫" },
  { code: "TWD", name: "دلار تایوان", symbol: "$" },
  { code: "PLN", name: "زلوتی لهستان", symbol: "zł" },
  { code: "CZK", name: "کرون چک", symbol: "Kč" },
  { code: "HUF", name: "فورینت مجارستان", symbol: "Ft" },
  { code: "RON", name: "لئوی رومانی", symbol: "lei" },
  { code: "BGN", name: "لف بلغارستان", symbol: "лв" },
  { code: "UAH", name: "هریونیا اوکراین", symbol: "₴" },
  { code: "GEL", name: "لاری گرجستان", symbol: "₾" },
  { code: "AMD", name: "درام ارمنستان", symbol: "֏" },
  { code: "AZN", name: "منات آذربایجان", symbol: "₼" },
  { code: "KZT", name: "تنگه قزاقستان", symbol: "₸" },
  { code: "UZS", name: "سوم ازبکستان", symbol: "soʻm" },
  { code: "TMT", name: "منات ترکمنستان", symbol: "m" },
  { code: "MAD", name: "درهم مراکش", symbol: "د.م." },
  { code: "TND", name: "دینار تونس", symbol: "د.ت" },
  { code: "DZD", name: "دینار الجزایر", symbol: "د.ج" },
  { code: "LYD", name: "دینار لیبی", symbol: "ل.د" },
  { code: "NGN", name: "نایرای نیجریه", symbol: "₦" },
  { code: "KES", name: "شیلینگ کنیا", symbol: "KSh" },
  { code: "ETB", name: "بیر اتیوپی", symbol: "Br" },
  { code: "GHS", name: "سدی غنا", symbol: "₵" },
];

export default function CurrencySettings() {
  const [currency, setCurrency] = useState("IRT");

  const selectedCurrency = WORLD_CURRENCIES.find((item) => item.code === currency);

  return (
    <div className="currency-settings">
      <div className="currency-settings__card">
        <div className="currency-settings__content">
          <div className="currency-setting-row">
            <label className="currency-setting-label">واحد پول</label>

            <div className="currency-select-wrap">
              <select
                className="currency-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {WORLD_CURRENCIES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name} - {item.code}
                  </option>
                ))}
              </select>

              <span className="currency-select-arrow">⌄</span>
            </div>

            {selectedCurrency && (
              <div className="currency-preview">
                <span className="currency-preview__label">نمونه نمایش:</span>
                <span className="currency-preview__value">
                  ۱۲۳,۴۵۶ {selectedCurrency.symbol}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}