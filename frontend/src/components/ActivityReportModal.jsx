import { useEffect, useMemo, useRef, useState } from "react";

function toPersianDigits(value) {
  return String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit]);
}

function toEnglishDigits(value) {
  return String(value || "")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function normalizeSearchText(value) {
  return toEnglishDigits(value)
    .trim()
    .toLowerCase()
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک");
}

function formatNumber(value) {
  if (value === null || value === undefined) return "";
  return Number(value).toLocaleString("fa-IR");
}

function div(a, b) {
  return ~~(a / b);
}

function jalCal(jy) {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
    2192, 2262, 2324, 2394, 2456, 3178,
  ];

  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jm = 0;
  let jump = 0;

  for (let i = 1; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;

    if (jy < jm) {
      break;
    }

    leapJ += div(jump, 33) * 8 + div(jump % 33, 4);
    jp = jm;
  }

  let n = jy - jp;

  leapJ += div(n, 33) * 8 + div((n % 33) + 3, 4);

  if (jump % 33 === 4 && jump - n === 4) {
    leapJ += 1;
  }

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) {
    n = n - jump + div(jump + 4, 33) * 33;
  }

  let leap = (((n + 1) % 33) - 1) % 4;

  if (leap === -1) {
    leap = 4;
  }

  return {
    leap,
    gy,
    march,
  };
}

function g2d(gy, gm, gd) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * ((gm + 9) % 12) + 2, 5) +
    gd -
    34840408;

  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;

  return d;
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631;

  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;

  const i = div(j % 1461, 4) * 5 + 308;
  const gd = div(i % 153, 5) + 1;
  const gm = (div(i, 153) % 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);

  return {
    gy,
    gm,
    gd,
  };
}

function j2d(jy, jm, jd) {
  const r = jalCal(jy);

  return (
    g2d(r.gy, 3, r.march) +
    (jm - 1) * 31 -
    div(jm, 7) * (jm - 7) +
    jd -
    1
  );
}

function d2j(jdn) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  let jm;
  let jd;

  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = (k % 31) + 1;

      return {
        jy,
        jm,
        jd,
      };
    }

    k -= 186;
  } else {
    jy -= 1;
    k += 179;

    if (r.leap === 1) {
      k += 1;
    }
  }

  jm = 7 + div(k, 30);
  jd = (k % 30) + 1;

  return {
    jy,
    jm,
    jd,
  };
}

function jalaliToGregorian(jy, jm, jd) {
  return d2g(j2d(jy, jm, jd));
}

function gregorianToJalali(gy, gm, gd) {
  return d2j(g2d(gy, gm, gd));
}

function getTodayJalali() {
  const now = new Date();

  return gregorianToJalali(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate()
  );
}

function getJalaliMonthLength(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;

  return jalCal(jy).leap === 0 ? 30 : 29;
}

function getJalaliDateKey(value) {
  if (!value) return "";

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const jalali = gregorianToJalali(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );

    return `${jalali.jy}/${String(jalali.jm).padStart(2, "0")}/${String(
      jalali.jd
    ).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

function formatJalaliDateLabel(dateKey) {
  if (!dateKey) return "";

  const [jy, jm, jd] = dateKey.split("/");

  return `${toPersianDigits(jy)}/${toPersianDigits(jm)}/${toPersianDigits(jd)}`;
}

function formatLogDateTime(value) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

function getLogActorName(log) {
  return (
    log.targetUsername ||
    log.actorUsername ||
    log.userName ||
    log.username ||
    log.name ||
    "-"
  );
}

function getLogRole(log) {
  return (
    log.targetRole ||
    log.actorRole ||
    log.userRole ||
    log.role ||
    log.metadata?.role ||
    "-"
  );
}

function getLogId(log) {
  return log.entityId || log.targetUserId || log.actorUserId || "-";
}

function getActivityTypeLabel(type) {
  const labels = {
    general: "عمومی",
    login: "ورود",
    logout: "خروج",
    user_create: "ثبت کاربر",
    user_update: "ویرایش کاربر",
    user_delete: "حذف کاربر",
    password_change: "تغییر رمز",
    order_create: "ثبت سفارش",
    order_update: "ویرایش سفارش",
    order_delete: "حذف سفارش",
    sale: "فروش",
    product_create: "ثبت محصول",
    product_update: "ویرایش محصول",
    product_delete: "حذف محصول",
    message_create: "ثبت پیام",
    message_send: "ارسال پیام",
    settings_update: "تغییر تنظیمات",
  };

  return labels[type] || "فعالیت";
}

function JalaliCalendarInput({ value, onChange, onClear }) {
  const today = useMemo(() => getTodayJalali(), []);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(today.jy);
  const [viewMonth, setViewMonth] = useState(today.jm);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!value) return;

    const [jy, jm] = value.split("/").map(Number);

    if (jy && jm) {
      setViewYear(jy);
      setViewMonth(jm);
    }
  }, [value]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const selectedParts = useMemo(() => {
    if (!value) return null;

    const [jy, jm, jd] = value.split("/").map(Number);

    return {
      jy,
      jm,
      jd,
    };
  }, [value]);

  const monthNames = [
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

  const weekDays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

  const days = useMemo(() => {
    const monthLength = getJalaliMonthLength(viewYear, viewMonth);
    const firstGregorian = jalaliToGregorian(viewYear, viewMonth, 1);
    const firstDate = new Date(
      firstGregorian.gy,
      firstGregorian.gm - 1,
      firstGregorian.gd
    );

    const firstDay = firstDate.getDay();
    const offset = firstDay === 6 ? 0 : firstDay + 1;
    const items = [];

    for (let i = 0; i < offset; i += 1) {
      items.push(null);
    }

    for (let day = 1; day <= monthLength; day += 1) {
      items.push(day);
    }

    return items;
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((year) => year - 1);
      setViewMonth(12);
      return;
    }

    setViewMonth((month) => month - 1);
  };

  const goNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((year) => year + 1);
      setViewMonth(1);
      return;
    }

    setViewMonth((month) => month + 1);
  };

  const selectDay = (day) => {
    const nextValue = `${viewYear}/${String(viewMonth).padStart(
      2,
      "0"
    )}/${String(day).padStart(2, "0")}`;

    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div className="activity-date-picker" ref={pickerRef}>
      <button
        type="button"
        className="activity-date-picker__button"
        onClick={() => setOpen((previous) => !previous)}
      >
        <span>{value ? formatJalaliDateLabel(value) : "انتخاب روز"}</span>

        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {open && (
        <div className="activity-calendar-popover">
          <div className="activity-calendar-head">
            <button type="button" onClick={goPrevMonth}>
              ‹
            </button>

            <strong>
              {monthNames[viewMonth - 1]} {toPersianDigits(viewYear)}
            </strong>

            <button type="button" onClick={goNextMonth}>
              ›
            </button>
          </div>

          <div className="activity-calendar-weekdays">
            {weekDays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="activity-calendar-days">
            {days.map((day, index) => {
              if (!day) {
                return <span key={`empty-${index}`} />;
              }

              const isSelected =
                selectedParts &&
                selectedParts.jy === viewYear &&
                selectedParts.jm === viewMonth &&
                selectedParts.jd === day;

              const isToday =
                today.jy === viewYear &&
                today.jm === viewMonth &&
                today.jd === day;

              return (
                <button
                  key={`${viewYear}-${viewMonth}-${day}`}
                  type="button"
                  className={[
                    "activity-calendar-day",
                    isSelected ? "is-selected" : "",
                    isToday ? "is-today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => selectDay(day)}
                >
                  {toPersianDigits(day)}
                </button>
              );
            })}
          </div>

          {value && (
            <button
              type="button"
              className="activity-calendar-clear"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
            >
              حذف فیلتر تاریخ
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ActivityReportModal({
  title = "گزارش فعالیت تمامی کاربران",
  logs = [],
  onClose,
}) {
  const [selectedDate, setSelectedDate] = useState("");

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      return !selectedDate || getJalaliDateKey(log.createdAt) === selectedDate;
    });
  }, [logs, selectedDate]);

  return (
    <div className="activity-modal-overlay" onMouseDown={onClose}>
      <div
        className="activity-modal-box"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="activity-modal-close"
          onClick={onClose}
          aria-label="بستن"
        >
          ×
        </button>

        <div className="activity-modal-header">
          <div className="activity-modal-title-wrap">
            <h2>{title}</h2>
            <span>تعداد فعالیت‌ها: {formatNumber(filteredLogs.length)}</span>
          </div>

          <div className="activity-modal-date-side">
            <label className="activity-modal-field">
              <span>انتخاب روز</span>
              <JalaliCalendarInput
                value={selectedDate}
                onChange={setSelectedDate}
                onClear={() => setSelectedDate("")}
              />
            </label>

            {selectedDate && (
              <button
                type="button"
                className="activity-modal-clear"
                onClick={() => setSelectedDate("")}
              >
                نمایش همه
              </button>
            )}
          </div>
        </div>

        <div className="activity-table-wrap">
          <table className="activity-table">
            <thead>
              <tr>
                <th className="activity-col-index">ردیف</th>
                <th className="activity-col-date">تاریخ و ساعت</th>
                <th className="activity-col-type">نوع فعالیت</th>
                <th className="activity-col-user">کاربر</th>
                <th className="activity-col-role">نقش</th>
                <th className="activity-col-id">شناسه</th>
                <th className="activity-col-description">توضیحات</th>
              </tr>
            </thead>

            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="activity-table-empty">
                    فعالیتی برای نمایش وجود ندارد.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => (
                  <tr key={log.id || `${log.createdAt}-${index}`}>
                    <td>{formatNumber(index + 1)}</td>
                    <td>{formatLogDateTime(log.createdAt)}</td>
                    <td>{getActivityTypeLabel(log.type)}</td>
                    <td>{getLogActorName(log)}</td>
                    <td>{getLogRole(log)}</td>
                    <td>{getLogId(log)}</td>
                    <td className="activity-description-cell">
                      {log.description || log.title || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .activity-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1200;
          background: rgba(17, 24, 39, 0.38);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          direction: rtl;
          font-family: Vazirmatn, Tahoma, Arial, sans-serif;
        }

        .activity-modal-box {
          position: relative;
          width: min(1030px, 94vw);
          max-height: 78vh;
          background: #ffffff;
          border: 1px solid #e4e7ff;
          border-radius: 16px;
          box-shadow: 0 8px 40px rgba(37, 2, 153, 0.15);
          padding: 28px 28px 24px;
          overflow: visible;
        }

        .activity-modal-close {
          position: absolute;
          top: 20px;
          left: 22px;
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          color: #7b7fc4;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
        }

        .activity-modal-close:hover {
          color: #250299;
        }

        .activity-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 16px;
          padding-left: 42px;
        }

        .activity-modal-title-wrap {
          text-align: right;
        }

        .activity-modal-title-wrap h2 {
          margin: 0;
          color: #250299;
          font-size: 17px;
          font-weight: 800;
        }

        .activity-modal-title-wrap span {
          display: inline-block;
          margin-top: 6px;
          color: #7b7fc4;
          font-size: 12px;
          font-weight: 700;
        }

        .activity-modal-date-side {
          width: 230px;
          display: flex;
          align-items: flex-end;
          gap: 8px;
          justify-content: flex-start;
          margin-right: auto;
        }

        .activity-modal-field {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: #1a1a2e;
          font-size: 12px;
          font-weight: 700;
          text-align: right;
        }

        .activity-modal-clear {
          height: 40px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid #e4e7ff;
          background: #f0f0ff;
          color: #250299;
          font-family: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .activity-date-picker {
          position: relative;
          width: 100%;
        }

        .activity-date-picker__button {
          width: 100%;
          height: 40px;
          border: 1px solid #e4e7ff;
          border-radius: 10px;
          background: #ffffff;
          color: #1a1a2e;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          padding: 0 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .activity-date-picker__button svg {
          color: #7b7fc4;
          flex-shrink: 0;
        }

        .activity-calendar-popover {
          position: absolute;
          top: 48px;
          left: 0;
          z-index: 30;
          width: 280px;
          background: #ffffff;
          border: 1px solid #e4e7ff;
          border-radius: 14px;
          box-shadow: 0 16px 40px rgba(37, 2, 153, 0.16);
          padding: 12px;
        }

        .activity-calendar-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          direction: ltr;
        }

        .activity-calendar-head button {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          border: 1px solid #e4e7ff;
          background: #ffffff;
          color: #250299;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
        }

        .activity-calendar-head strong {
          color: #250299;
          font-size: 13px;
          font-weight: 800;
        }

        .activity-calendar-weekdays,
        .activity-calendar-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }

        .activity-calendar-weekdays {
          margin-bottom: 6px;
        }

        .activity-calendar-weekdays span {
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7b7fc4;
          font-size: 11px;
          font-weight: 800;
        }

        .activity-calendar-day {
          height: 32px;
          border: 1px solid #eef0ff;
          border-radius: 9px;
          background: #ffffff;
          color: #1a1a2e;
          font-family: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .activity-calendar-day.is-today {
          background: #f0edff;
          border-color: #d9d0ff;
          color: #250299;
        }

        .activity-calendar-day.is-selected {
          background: #250299;
          border-color: #250299;
          color: #ffffff;
        }

        .activity-calendar-clear {
          width: 100%;
          height: 34px;
          margin-top: 10px;
          border: 1px solid #e4e7ff;
          border-radius: 10px;
          background: #f0f0ff;
          color: #250299;
          font-family: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .activity-table-wrap {
          border: 1px solid #e4e7ff;
          border-radius: 14px;
          overflow: auto;
          max-height: 44vh;
          background: #ffffff;
        }

        .activity-table {
          width: 100%;
          min-width: 930px;
          border-collapse: collapse;
          direction: rtl;
          table-layout: fixed;
          font-size: 12px;
        }

        .activity-table th {
          background: #f5f6ff;
          color: #250299;
          font-size: 12px;
          font-weight: 800;
          text-align: center;
          padding: 12px 10px;
          border-bottom: 1px solid #e4e7ff;
          white-space: nowrap;
        }

        .activity-table td {
          color: #1a1a2e;
          font-size: 12px;
          font-weight: 600;
          text-align: center;
          padding: 12px 10px;
          border-bottom: 1px solid #eef0ff;
          vertical-align: top;
        }

        .activity-table tr:last-child td {
          border-bottom: none;
        }

        .activity-col-index {
          width: 58px;
        }

        .activity-col-date {
          width: 150px;
        }

        .activity-col-type {
          width: 120px;
        }

        .activity-col-user {
          width: 130px;
        }

        .activity-col-role {
          width: 100px;
        }

        .activity-col-id {
          width: 100px;
        }

        .activity-col-description {
          width: auto;
          min-width: 270px;
        }

        .activity-description-cell {
          text-align: right !important;
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: unset !important;
          line-height: 1.9;
          color: #111827 !important;
          font-weight: 700 !important;
        }

        .activity-table-empty {
          color: #7b7fc4 !important;
          padding: 28px 10px !important;
          font-weight: 700 !important;
          text-align: center !important;
        }

        html[data-theme="dark"] .activity-modal-box,
        html[data-theme="dark"] .activity-date-picker__button,
        html[data-theme="dark"] .activity-calendar-popover,
        html[data-theme="dark"] .activity-table-wrap {
          background: var(--card-bg, #262626);
          border-color: var(--border-color, #3d3d3d);
        }

        html[data-theme="dark"] .activity-modal-title-wrap h2,
        html[data-theme="dark"] .activity-modal-field,
        html[data-theme="dark"] .activity-table td,
        html[data-theme="dark"] .activity-date-picker__button,
        html[data-theme="dark"] .activity-calendar-day {
          color: var(--text-main, #f5f5f5);
        }

        html[data-theme="dark"] .activity-calendar-day {
          background: var(--input-bg, #2c2c2c);
          color: var(--input-text, #ffffff);
          border-color: var(--border-color, #3d3d3d);
        }

        html[data-theme="dark"] .activity-table th,
        html[data-theme="dark"] .activity-modal-clear,
        html[data-theme="dark"] .activity-calendar-clear {
          background: var(--input-bg, #2c2c2c);
          border-color: var(--border-color, #3d3d3d);
        }

        @media (max-width: 900px) {
          .activity-modal-header {
            flex-direction: column;
            padding-left: 42px;
          }

          .activity-modal-date-side {
            width: 100%;
            margin-right: 0;
          }

          .activity-modal-clear {
            width: auto;
          }
        }
      `}</style>
    </div>
  );
}