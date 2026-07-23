import { useEffect, useMemo, useState } from "react";
import {
  getCompanyScopedItem,
  migrateLegacyCompanyScopedItem,
  setCompanyScopedItem,
} from "./companyScopedStorage";

const DATE_SETTINGS_STORAGE_KEY = "order_assistant_date_settings";

export const DEFAULT_DATE_SETTINGS = {
  calendarType: "jalali",
  showTime: true,
  useManualDate: false,
  manualDateInput: "",
  gregorianFormat: "yyyy/mm/dd",
  jalaliFormat: "yyyy/mm/dd",
};

export function toEnglishDigits(value) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
}

export function toPersianDigits(value) {
  return String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit]);
}

function padTwo(value) {
  return String(value).padStart(2, "0");
}

function div(a, b) {
  return Math.floor(a / b);
}

export function gregorianToJalali(gy, gm, gd) {
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

export function jalaliToGregorian(jy, jm, jd) {
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

  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;

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

export function getTodayInputDate() {
  const now = new Date();

  return `${now.getFullYear()}-${padTwo(now.getMonth() + 1)}-${padTwo(
    now.getDate()
  )}`;
}

export function isValidInputDate(value) {
  if (!value) return false;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return false;
  }

  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
  );
}

export function getJalaliPartsFromInputDate(inputDate) {
  const safeInput = inputDate || getTodayInputDate();
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

export function toInputDateFromJalali(jy, jm, jd) {
  const gregorian = jalaliToGregorian(jy, jm, jd);

  return `${gregorian.gy}-${padTwo(gregorian.gm)}-${padTwo(gregorian.gd)}`;
}

export function isJalaliLeapYear(jy) {
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

export function getJalaliMonthLength(jy, jm) {
  if (Number(jm) <= 6) return 31;
  if (Number(jm) <= 11) return 30;
  return isJalaliLeapYear(Number(jy)) ? 30 : 29;
}

export function normalizeDateSettings(settings) {
  const merged = {
    ...DEFAULT_DATE_SETTINGS,
    ...(settings || {}),
  };

  return {
    ...merged,
    calendarType:
      merged.calendarType === "gregorian" || merged.dateType === "gregorian"
        ? "gregorian"
        : "jalali",
    showTime:
      typeof merged.showTime === "boolean"
        ? merged.showTime
        : DEFAULT_DATE_SETTINGS.showTime,
    useManualDate:
      typeof merged.useManualDate === "boolean" ? merged.useManualDate : false,
    manualDateInput: isValidInputDate(merged.manualDateInput)
      ? merged.manualDateInput
      : getTodayInputDate(),
    gregorianFormat:
      merged.gregorianFormat || DEFAULT_DATE_SETTINGS.gregorianFormat,
    jalaliFormat: merged.jalaliFormat || DEFAULT_DATE_SETTINGS.jalaliFormat,
  };
}

export function getDateSettings() {
  try {
    const raw =
      getCompanyScopedItem(DATE_SETTINGS_STORAGE_KEY) ||
      migrateLegacyCompanyScopedItem(DATE_SETTINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    return normalizeDateSettings(parsed);
  } catch {
    return normalizeDateSettings(DEFAULT_DATE_SETTINGS);
  }
}

export function saveDateSettings(settings) {
  const normalized = normalizeDateSettings(settings);

  setCompanyScopedItem(DATE_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));

  document.documentElement.dataset.calendarType = normalized.calendarType;
  document.documentElement.dataset.useManualDate = normalized.useManualDate
    ? "true"
    : "false";

  window.dispatchEvent(
    new CustomEvent("order-assistant-date-settings-updated", {
      detail: normalized,
    })
  );

  return normalized;
}

export function initializeDateSettings() {
  const settings = getDateSettings();

  document.documentElement.dataset.calendarType = settings.calendarType;
  document.documentElement.dataset.useManualDate = settings.useManualDate
    ? "true"
    : "false";

  return settings;
}

export function getCurrentInputDate(customSettings) {
  const settings = normalizeDateSettings(customSettings || getDateSettings());

  if (settings.useManualDate && isValidInputDate(settings.manualDateInput)) {
    return settings.manualDateInput;
  }

  return getTodayInputDate();
}

export function getCurrentDateObject(customSettings) {
  const settings = normalizeDateSettings(customSettings || getDateSettings());
  const now = new Date();

  if (settings.useManualDate && isValidInputDate(settings.manualDateInput)) {
    const [year, month, day] = settings.manualDateInput.split("-").map(Number);

    return new Date(
      year,
      month - 1,
      day,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds()
    );
  }

  return now;
}

function getDateObject(value, customSettings) {
  if (!value) {
    return getCurrentDateObject(customSettings);
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? getCurrentDateObject(customSettings)
      : value;
  }

  const stringValue = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    const [year, month, day] = stringValue.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? getCurrentDateObject(customSettings)
    : date;
}

function formatGregorianDate(date, format) {
  const year = date.getFullYear();
  const month = padTwo(date.getMonth() + 1);
  const day = padTwo(date.getDate());

  if (format === "dd/mm/yyyy") {
    return `${day}/${month}/${year}`;
  }

  if (format === "yyyy-mm-dd") {
    return `${year}-${month}-${day}`;
  }

  return `${year}/${month}/${day}`;
}

function formatJalaliDate(date, format) {
  const jalali = gregorianToJalali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );

  const year = jalali.jy;
  const month = padTwo(jalali.jm);
  const day = padTwo(jalali.jd);

  if (format === "dd/mm/yyyy") {
    return toPersianDigits(`${day}/${month}/${year}`);
  }

  if (format === "yyyy-mm-dd") {
    return toPersianDigits(`${year}-${month}-${day}`);
  }

  return toPersianDigits(`${year}/${month}/${day}`);
}

export function formatAppDate(value, customSettings) {
  const settings = normalizeDateSettings(customSettings || getDateSettings());
  const date = getDateObject(value, settings);

  if (settings.calendarType === "gregorian") {
    return formatGregorianDate(date, settings.gregorianFormat);
  }

  return formatJalaliDate(date, settings.jalaliFormat);
}

export function formatAppTime(value, customSettings) {
  const date = getDateObject(value, customSettings);

  return date.toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatAppDateTime(value, customSettings) {
  const settings = normalizeDateSettings(customSettings || getDateSettings());
  const date = getDateObject(value, settings);
  const datePart = formatAppDate(date, settings);

  if (!settings.showTime) {
    return datePart;
  }

  return `${datePart} - ${formatAppTime(date, settings)}`;
}

export function getCurrentAppDateTime(customSettings) {
  return formatAppDateTime(null, customSettings);
}

function visibleYmdToInputDate(year, month, day) {
  const normalizedYear = Number(toEnglishDigits(year));
  const normalizedMonth = Number(toEnglishDigits(month));
  const normalizedDay = Number(toEnglishDigits(day));

  if (!normalizedYear || !normalizedMonth || !normalizedDay) {
    return null;
  }

  if (normalizedYear >= 1700) {
    return `${normalizedYear}-${padTwo(normalizedMonth)}-${padTwo(
      normalizedDay
    )}`;
  }

  return toInputDateFromJalali(
    normalizedYear,
    normalizedMonth,
    normalizedDay
  );
}

function visibleDmyToInputDate(day, month, year) {
  const normalizedYear = Number(toEnglishDigits(year));
  const normalizedMonth = Number(toEnglishDigits(month));
  const normalizedDay = Number(toEnglishDigits(day));

  if (!normalizedYear || !normalizedMonth || !normalizedDay) {
    return null;
  }

  if (normalizedYear >= 1700) {
    return `${normalizedYear}-${padTwo(normalizedMonth)}-${padTwo(
      normalizedDay
    )}`;
  }

  return toInputDateFromJalali(
    normalizedYear,
    normalizedMonth,
    normalizedDay
  );
}

export function formatAppDateOrText(value, customSettings) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const text = String(value);

  if (value instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(text)) {
    return formatAppDateTime(value, customSettings);
  }

  return transformDateTextForApp(text, customSettings);
}

export function useDateSettingsVersion() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setVersion((current) => current + 1);

    window.addEventListener("order-assistant-date-settings-updated", refresh);
    window.addEventListener("oa-auth-changed", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("order-assistant-date-settings-updated", refresh);
      window.removeEventListener("oa-auth-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return version;
}

export function useDateFormatter() {
  const version = useDateSettingsVersion();

  return useMemo(() => {
    const settings = getDateSettings();

    return {
      version,
      settings,
      formatDate: (value) => formatAppDate(value, settings),
      formatDateTime: (value) => formatAppDateTime(value, settings),
      formatDateOrText: (value) => formatAppDateOrText(value, settings),
    };
  }, [version]);
}

export function transformDateTextForApp(text, customSettings) {
  const settings = normalizeDateSettings(customSettings || getDateSettings());
  const digit = "[0-9۰-۹٠-٩]";
  let output = String(text ?? "");

  const ymdPattern = new RegExp(
    `(^|[^A-Za-z0-9_\\-])(${digit}{4})[\\/\\-.](${digit}{1,2})[\\/\\-.](${digit}{1,2})(\\s*(?:-|–|،|,)?\\s*(${digit}{1,2}:${digit}{2}(?::${digit}{2})?))?`,
    "g"
  );

  output = output.replace(
    ymdPattern,
    (match, prefix, year, month, day, timePart, timeValue) => {
      const inputDate = visibleYmdToInputDate(year, month, day);

      if (!inputDate) return match;

      const formattedDate = formatAppDate(inputDate, settings);

      if (!settings.showTime) {
        return `${prefix}${formattedDate}`;
      }

      if (timeValue) {
        return `${prefix}${formattedDate} - ${toPersianDigits(timeValue)}`;
      }

      return `${prefix}${formattedDate}`;
    }
  );

  const dmyPattern = new RegExp(
    `(^|[^A-Za-z0-9_\\-])(${digit}{1,2})[\\/\\-.](${digit}{1,2})[\\/\\-.](${digit}{4})(\\s*(?:-|–|،|,)?\\s*(${digit}{1,2}:${digit}{2}(?::${digit}{2})?))?`,
    "g"
  );

  output = output.replace(
    dmyPattern,
    (match, prefix, day, month, year, timePart, timeValue) => {
      const inputDate = visibleDmyToInputDate(day, month, year);

      if (!inputDate) return match;

      const formattedDate = formatAppDate(inputDate, settings);

      if (!settings.showTime) {
        return `${prefix}${formattedDate}`;
      }

      if (timeValue) {
        return `${prefix}${formattedDate} - ${toPersianDigits(timeValue)}`;
      }

      return `${prefix}${formattedDate}`;
    }
  );

  return output;
}