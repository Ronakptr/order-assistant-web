import { useEffect, useState } from "react";
import {
  WORLD_CURRENCIES,
  loadCurrencyCode,
  saveCurrencyCode,
} from "../../../../utils/currencySettings";
import "./CurrencySettings.css";

export default function CurrencySettings() {
  const [currency, setCurrency] = useState(loadCurrencyCode);

  useEffect(() => {
    saveCurrencyCode(currency);
  }, [currency]);

  useEffect(() => {
    const handleAuthChanged = () => {
      setCurrency(loadCurrencyCode());
    };

    window.addEventListener("oa-auth-changed", handleAuthChanged);
    window.addEventListener("storage", handleAuthChanged);

    return () => {
      window.removeEventListener("oa-auth-changed", handleAuthChanged);
      window.removeEventListener("storage", handleAuthChanged);
    };
  }, []);

  const selectedCurrency = WORLD_CURRENCIES.find(
    (item) => item.code === currency
  );

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
                onChange={(event) => setCurrency(event.target.value)}
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
