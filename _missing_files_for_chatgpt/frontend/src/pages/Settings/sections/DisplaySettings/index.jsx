import { useState } from "react";
import { useTheme } from "../../../../context/ThemeContext";
import "./DisplaySettings.css";

export default function DisplaySettings() {
  const [fontSize, setFontSize] = useState(24);
  const [numberFormat, setNumberFormat] = useState("fa");
  const { theme, setTheme } = useTheme();

  const increaseFontSize = () => {
    setFontSize((prev) => Math.min(Number(prev) + 1, 40));
  };

  const decreaseFontSize = () => {
    setFontSize((prev) => Math.max(Number(prev) - 1, 10));
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
                onChange={(e) => setFontSize(e.target.value)}
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
                onClick={() => setNumberFormat("fa")}
              >
                فارسی
              </button>

              <button
                type="button"
                className={`segmented-control__btn ${
                  numberFormat === "en" ? "active" : ""
                }`}
                onClick={() => setNumberFormat("en")}
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