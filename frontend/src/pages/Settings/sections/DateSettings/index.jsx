import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_DATE_SETTINGS,
  formatAppDate,
  formatAppDateTime,
  getCurrentInputDate,
  getDateSettings,
  getJalaliMonthLength,
  getJalaliPartsFromInputDate,
  getTodayInputDate,
  saveDateSettings,
  toEnglishDigits,
  toInputDateFromJalali,
  toPersianDigits,
} from "../../../../utils/appDate";
import "./DateSettings.css";

const DATE_FORMATS = [
  {
    value: "yyyy/mm/dd",
    label: "سال / ماه / روز",
  },
  {
    value: "yyyy-mm-dd",
    label: "سال - ماه - روز",
  },
  {
    value: "dd/mm/yyyy",
    label: "روز / ماه / سال",
  },
];

function normalizeManualJalali(inputDate) {
  const jalali = getJalaliPartsFromInputDate(inputDate || getCurrentInputDate());

  return {
    jy: String(jalali.jy),
    jm: String(jalali.jm),
    jd: String(jalali.jd),
  };
}

export default function DateSettings() {
  const [settings, setSettings] = useState(() => getDateSettings());
  const [saved, setSaved] = useState(false);
  const [manualJalali, setManualJalali] = useState(() =>
    normalizeManualJalali(getDateSettings().manualDateInput)
  );
  const [manualError, setManualError] = useState("");

  useEffect(() => {
    const handleDateSettingsUpdate = (event) => {
      const nextSettings = {
        ...DEFAULT_DATE_SETTINGS,
        ...(event.detail || getDateSettings()),
      };

      setSettings(nextSettings);
      setManualJalali(normalizeManualJalali(nextSettings.manualDateInput));
    };

    window.addEventListener(
      "order-assistant-date-settings-updated",
      handleDateSettingsUpdate
    );
    window.addEventListener("oa-auth-changed", handleDateSettingsUpdate);
    window.addEventListener("storage", handleDateSettingsUpdate);

    return () => {
      window.removeEventListener(
        "order-assistant-date-settings-updated",
        handleDateSettingsUpdate
      );
      window.removeEventListener("oa-auth-changed", handleDateSettingsUpdate);
      window.removeEventListener("storage", handleDateSettingsUpdate);
    };
  }, []);

  const previewDate = useMemo(() => {
    return formatAppDate(null, settings);
  }, [settings]);

  const previewDateTime = useMemo(() => {
    return formatAppDateTime(null, settings);
  }, [settings]);

  const currentFormat =
    settings.calendarType === "gregorian"
      ? settings.gregorianFormat
      : settings.jalaliFormat;

  const updateSettings = (nextSettings) => {
    const savedSettings = saveDateSettings({
      ...settings,
      ...nextSettings,
    });

    setSettings(savedSettings);
    setManualJalali(normalizeManualJalali(savedSettings.manualDateInput));
    setManualError("");
    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 1200);
  };

  const updateManualJalaliField = (field, value) => {
    const englishValue = toEnglishDigits(value).replace(/[^\d]/g, "");

    setManualJalali((previous) => ({
      ...previous,
      [field]: englishValue,
    }));

    setManualError("");
  };

  const applyManualJalaliDate = () => {
    const jy = Number(toEnglishDigits(manualJalali.jy));
    const jm = Number(toEnglishDigits(manualJalali.jm));
    const jd = Number(toEnglishDigits(manualJalali.jd));

    if (!jy || !jm || !jd) {
      setManualError("تاریخ دستی را کامل وارد کنید.");
      return;
    }

    if (jm < 1 || jm > 12) {
      setManualError("ماه شمسی باید بین ۱ تا ۱۲ باشد.");
      return;
    }

    const maxDay = getJalaliMonthLength(jy, jm);

    if (jd < 1 || jd > maxDay) {
      setManualError(
        `روز این ماه باید بین ۱ تا ${toPersianDigits(maxDay)} باشد.`
      );
      return;
    }

    updateSettings({
      useManualDate: true,
      manualDateInput: toInputDateFromJalali(jy, jm, jd),
    });
  };

  const resetManualDateToToday = () => {
    updateSettings({
      useManualDate: false,
      manualDateInput: getTodayInputDate(),
    });
  };

  return (
    <section className="date-settings-page" data-date-sync-ignore="true">
      <header className="date-settings-header">
        <div className="date-settings-heading">
          <h1>تنظیمات تاریخ</h1>
          <p>نوع تقویم، فرمت تاریخ، ساعت و تاریخ دستی کل برنامه</p>
        </div>

        <div className="date-settings-preview-pill">
          <span>پیش‌نمایش</span>
          <strong>{previewDateTime}</strong>
        </div>

        {saved && <div className="date-settings-saved">ذخیره شد</div>}
      </header>

      <div className="date-settings-grid">
        <section className="date-settings-card">
          <div className="date-settings-card-head">
            <h2>نوع تقویم</h2>
          </div>

          <div className="date-settings-segment">
            <button
              type="button"
              className={settings.calendarType === "jalali" ? "is-active" : ""}
              onClick={() => updateSettings({ calendarType: "jalali" })}
            >
              شمسی
            </button>

            <button
              type="button"
              className={
                settings.calendarType === "gregorian" ? "is-active" : ""
              }
              onClick={() => updateSettings({ calendarType: "gregorian" })}
            >
              میلادی
            </button>
          </div>

          <p className="date-settings-help">
            این گزینه روی تاریخ‌های برنامه و فاکتور چاپی اعمال می‌شود.
          </p>
        </section>

        <section className="date-settings-card">
          <div className="date-settings-card-head">
            <h2>فرمت نمایش</h2>
          </div>

          <div className="date-settings-format-row">
            {DATE_FORMATS.map((format) => (
              <button
                key={format.value}
                type="button"
                className={currentFormat === format.value ? "is-active" : ""}
                onClick={() => {
                  if (settings.calendarType === "gregorian") {
                    updateSettings({ gregorianFormat: format.value });
                  } else {
                    updateSettings({ jalaliFormat: format.value });
                  }
                }}
              >
                {format.label}
              </button>
            ))}
          </div>
        </section>

        <section className="date-settings-card date-settings-card--manual">
          <div className="date-settings-card-head date-settings-card-head--inline">
            <h2>تاریخ دستی</h2>

            <button
              type="button"
              className={`date-settings-switch ${
                settings.useManualDate ? "is-on" : ""
              }`}
              onClick={() =>
                updateSettings({
                  useManualDate: !settings.useManualDate,
                  manualDateInput:
                    settings.manualDateInput || getTodayInputDate(),
                })
              }
            >
              <span />
            </button>
          </div>

          {settings.calendarType === "gregorian" ? (
            <label className="date-settings-manual-field">
              <span>تاریخ میلادی</span>
              <input
                type="date"
                value={settings.manualDateInput || getTodayInputDate()}
                onChange={(event) =>
                  updateSettings({
                    useManualDate: true,
                    manualDateInput: event.target.value,
                  })
                }
              />
            </label>
          ) : (
            <>
              <div className="date-settings-jalali-fields">
                <label>
                  <span>سال</span>
                  <input
                    value={toPersianDigits(manualJalali.jy)}
                    onChange={(event) =>
                      updateManualJalaliField("jy", event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>ماه</span>
                  <input
                    value={toPersianDigits(manualJalali.jm)}
                    onChange={(event) =>
                      updateManualJalaliField("jm", event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>روز</span>
                  <input
                    value={toPersianDigits(manualJalali.jd)}
                    onChange={(event) =>
                      updateManualJalaliField("jd", event.target.value)
                    }
                  />
                </label>
              </div>

              {manualError && (
                <div className="date-settings-error">{manualError}</div>
              )}
            </>
          )}

          <div className="date-settings-actions-row">
            <button type="button" onClick={applyManualJalaliDate}>
              اعمال تاریخ
            </button>

            <button type="button" onClick={resetManualDateToToday}>
              امروز سیستم
            </button>
          </div>
        </section>

        <section className="date-settings-card">
          <div className="date-settings-card-head date-settings-card-head--inline">
            <h2>نمایش ساعت</h2>

            <button
              type="button"
              className={`date-settings-switch ${
                settings.showTime ? "is-on" : ""
              }`}
              onClick={() =>
                updateSettings({
                  showTime: !settings.showTime,
                })
              }
            >
              <span />
            </button>
          </div>

          <p className="date-settings-help">
            اگر غیرفعال شود، ساعت کنار تاریخ در برنامه و فاکتور چاپی حذف
            می‌شود.
          </p>

          <div className="date-settings-mini-preview">
            <span>نمونه نمایش</span>
            <strong>{previewDate}</strong>
          </div>
        </section>
      </div>
    </section>
  );
}