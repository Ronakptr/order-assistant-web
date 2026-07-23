import { useEffect, useState } from "react";
import { useTheme } from "../../../../context/ThemeContext";
import {
  getCompanyScopedItem,
  migrateLegacyCompanyScopedItem,
  setCompanyScopedItem,
} from "../../../../utils/companyScopedStorage";
import "./DisplaySettings.css";

const DISPLAY_SETTINGS_STORAGE_KEY = "order_assistant_display_settings";

const DEFAULT_DISPLAY_SETTINGS = {
  fontSize: 24,
  numberFormat: "fa",
};

function normalizeDisplaySettings(settings) {
  const fontSize = Number(settings?.fontSize ?? DEFAULT_DISPLAY_SETTINGS.fontSize);
  const numberFormat = settings?.numberFormat === "en" ? "en" : "fa";

  return {
    fontSize: Number.isFinite(fontSize)
      ? Math.max(10, Math.min(40, fontSize))
      : DEFAULT_DISPLAY_SETTINGS.fontSize,
    numberFormat,
  };
}

function loadDisplaySettings() {
  try {
    const raw =
      getCompanyScopedItem(DISPLAY_SETTINGS_STORAGE_KEY) ||
      migrateLegacyCompanyScopedItem(DISPLAY_SETTINGS_STORAGE_KEY);

    return normalizeDisplaySettings(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeDisplaySettings(DEFAULT_DISPLAY_SETTINGS);
  }
}

function saveDisplaySettings(settings) {
  const normalized = normalizeDisplaySettings(settings);

  setCompanyScopedItem(
    DISPLAY_SETTINGS_STORAGE_KEY,
    JSON.stringify(normalized)
  );

  document.documentElement.dataset.numberFormat = normalized.numberFormat;
  document.documentElement.style.setProperty(
    "--oa-user-font-size",
    `${normalized.fontSize}px`
  );

  window.dispatchEvent(
    new CustomEvent("order-assistant-display-settings-updated", {
      detail: normalized,
    })
  );

  return normalized;
}

export default function DisplaySettings() {
  const [displaySettings, setDisplaySettings] = useState(loadDisplaySettings);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    saveDisplaySettings(displaySettings);
  }, [displaySettings]);

  useEffect(() => {
    const handleAuthChanged = () => {
      setDisplaySettings(loadDisplaySettings());
    };

    window.addEventListener("oa-auth-changed", handleAuthChanged);
    window.addEventListener("storage", handleAuthChanged);

    return () => {
      window.removeEventListener("oa-auth-changed", handleAuthChanged);
      window.removeEventListener("storage", handleAuthChanged);
    };
  }, []);

  const fontSize = displaySettings.fontSize;
  const numberFormat = displaySettings.numberFormat;

  const updateDisplaySettings = (patch) => {
    setDisplaySettings((previous) =>
      normalizeDisplaySettings({
        ...previous,
        ...patch,
      })
    );
  };

  const increaseFontSize = () => {
    updateDisplaySettings({ fontSize: Number(fontSize) + 1 });
  };

  const decreaseFontSize = () => {
    updateDisplaySettings({ fontSize: Number(fontSize) - 1 });
  };

  return (
    <div className="display-settings">
      <div className="display-settings__card">
        <div className="display-settings__content">
          <div className="setting-row">
            <label className="setting-label">سایز فونت</label>

            <div className="font-size-control">
              <div className="font-size-stepper">
                <button
                  type="button"
                  className="font-size-stepper__btn"
                  onClick={increaseFontSize}
                  aria-label="افزایش سایز فونت"
                >
                  ˄
                </button>

                <button
                  type="button"
                  className="font-size-stepper__btn"
                  onClick={decreaseFontSize}
                  aria-label="کاهش سایز فونت"
                >
                  ˅
                </button>
              </div>

              <input
                type="number"
                min="10"
                max="40"
                value={fontSize}
                onChange={(event) =>
                  updateDisplaySettings({ fontSize: event.target.value })
                }
                className="setting-number-input"
              />
            </div>
          </div>

          <div className="setting-row">
            <label className="setting-label">نمایش اعداد</label>

            <div className="segmented-control">
              <button
                type="button"
                className={`segmented-control__btn ${
                  numberFormat === "fa" ? "active" : ""
                }`}
                onClick={() => updateDisplaySettings({ numberFormat: "fa" })}
              >
                فارسی
              </button>

              <button
                type="button"
                className={`segmented-control__btn ${
                  numberFormat === "en" ? "active" : ""
                }`}
                onClick={() => updateDisplaySettings({ numberFormat: "en" })}
              >
                انگلیسی
              </button>
            </div>
          </div>

          <div className="setting-row">
            <label className="setting-label">تم صفحه</label>

            <div className="segmented-control">
              <button
                type="button"
                className={`segmented-control__btn ${
                  theme === "light" ? "active" : ""
                }`}
                onClick={() => setTheme("light")}
              >
                روشن
              </button>

              <button
                type="button"
                className={`segmented-control__btn ${
                  theme === "dark" ? "active" : ""
                }`}
                onClick={() => setTheme("dark")}
              >
                تیره
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
