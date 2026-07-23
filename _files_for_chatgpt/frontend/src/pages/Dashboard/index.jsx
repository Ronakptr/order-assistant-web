import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import ActivityReportModal from "../../components/ActivityReportModal";
import { getActivityLogs } from "../../utils/activityLog";
import { fetchDashboardSummary } from "../../api/dashboard";
import { getStoredUser, isAdminRole } from "../../api/auth";
import "../Products/Products.css";
import "./Dashboard.css";

const PERIODS = [
  { key: "weekly", label: "هفتگی" },
  { key: "monthly", label: "ماهانه" },
  { key: "yearly", label: "سالانه" },
];

const READ_ALERTS_STORAGE_KEY = "oa_dashboard_read_alert_ids";

const ORDER_STATUS_DEFINITIONS = [
  { key: "paid", status: "پرداخت شده", color: "#22c55e" },
  { key: "pending", status: "در انتظار پرداخت", color: "#f59e0b" },
  { key: "cancelled", status: "لغو شده", color: "#ef4444" },
];

const TOP_PRODUCT_COLORS = [
  "#250299",
  "#6d28d9",
  "#2563eb",
  "#0891b2",
  "#16a34a",
  "#f59e0b",
];

const EMPTY_SUMMARY = {
  stats: {
    total_orders: 0,
    period_orders: 0,
    today_orders: 0,
    open_orders: 0,
    completed_orders: 0,
    cancelled_orders: 0,
    canceled_orders: 0,
    total_customers: 0,
    total_products: 0,
    total_messages: 0,
    today_messages: 0,
    low_stock_products: 0,
    out_of_stock_products: 0,
    total_amount: 0,
    period_amount: 0,
    today_amount: 0,
    paid_amount: 0,
    open_amount: 0,
    average_order_amount: 0,
    month_order_amount: 0,
    subscription_days_remaining: null,
    days_remaining: null,
    remaining_days: null,
    growth: {},
  },
  charts: {
    orders_by_day: [],
    orders_by_status: [],
    top_products: [],
  },
  recent: {
    recent_orders: [],
    recent_messages: [],
    recent_customers: [],
  },
  alerts: [],
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "۰";

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return String(value);

  return numberValue.toLocaleString("fa-IR");
}

function formatCurrency(value) {
  return `${formatNumber(Math.round(toNumber(value)))} تومان`;
}

function normalizePersianText(value) {
  return String(value || "")
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOrderStatus(status) {
  const text = normalizePersianText(status).toLowerCase();

  if (text.includes("لغو") || text.includes("cancel")) {
    return "لغو شده";
  }

  if (
    text.includes("پرداخت شده") ||
    text.includes("تسویه شده") ||
    text.includes("تسویه") ||
    text.includes("تکمیل") ||
    text.includes("انجام") ||
    text.includes("paid") ||
    text.includes("settled") ||
    text.includes("completed") ||
    text.includes("complete") ||
    text.includes("done")
  ) {
    return "پرداخت شده";
  }

  return "در انتظار پرداخت";
}

function normalizeStatusClass(status) {
  const normalized = normalizeOrderStatus(status);

  if (normalized === "پرداخت شده") return "paid";
  if (normalized === "لغو شده") return "cancelled";

  return "pending";
}

function getStatusItemCount(item) {
  return toNumber(
    item?.count ??
      item?.value ??
      item?.orders ??
      item?.total ??
      item?.total_orders ??
      item?.order_count ??
      0
  );
}

function buildOrderStatusData(statusRows, stats) {
  const counts = {
    paid: 0,
    pending: 0,
    cancelled: 0,
  };

  asArray(statusRows).forEach((item) => {
    const normalizedStatus = normalizeOrderStatus(
      item.status ||
        item.name ||
        item.label ||
        item.order_status ||
        item.payment_status ||
        "در انتظار پرداخت"
    );

    const count = getStatusItemCount(item);

    if (normalizedStatus === "پرداخت شده") {
      counts.paid += count;
      return;
    }

    if (normalizedStatus === "لغو شده") {
      counts.cancelled += count;
      return;
    }

    counts.pending += count;
  });

  const paidFromStats = toNumber(stats.completed_orders || stats.paid_orders || 0);
  const cancelledFromStats = toNumber(
    stats.cancelled_orders || stats.canceled_orders || stats.cancel_orders || 0
  );
  const pendingFromStats = toNumber(
    stats.open_orders ||
      stats.pending_orders ||
      stats.unpaid_orders ||
      stats.waiting_payment_orders ||
      0
  );

  if (counts.paid === 0 && paidFromStats > 0) {
    counts.paid = paidFromStats;
  }

  if (counts.cancelled === 0 && cancelledFromStats > 0) {
    counts.cancelled = cancelledFromStats;
  }

  if (counts.pending === 0 && pendingFromStats > 0) {
    counts.pending = pendingFromStats;
  }

  const totalFromChart = counts.paid + counts.pending + counts.cancelled;

  if (totalFromChart === 0) {
    const totalOrders = toNumber(stats.period_orders || stats.total_orders || 0);
    const calculatedPending = Math.max(0, totalOrders - counts.paid - counts.cancelled);

    if (calculatedPending > 0) {
      counts.pending = calculatedPending;
    }
  }

  return ORDER_STATUS_DEFINITIONS.map((item) => ({
    ...item,
    count: counts[item.key] || 0,
  }));
}

function getSubscriptionDays(summary) {
  const stats = summary?.stats || {};
  const candidates = [
    stats.subscription_days_remaining,
    stats.subscription_remaining_days,
    stats.days_remaining,
    stats.remaining_days,
    stats.plan_days_remaining,
    stats.license_days_remaining,
    summary?.subscription_days_remaining,
    summary?.days_remaining,
    summary?.remaining_days,
  ];

  for (const value of candidates) {
    if (value !== null && value !== undefined && value !== "") {
      const numericValue = Number(value);
      if (Number.isFinite(numericValue)) return Math.max(0, Math.round(numericValue));
    }
  }

  return null;
}

function getAlertRoute(alertType) {
  const type = String(alertType || "");

  if (
    type.includes("stock") ||
    type.includes("product") ||
    type === "low_stock" ||
    type === "out_of_stock" ||
    type === "incomplete_products"
  ) {
    return "/products";
  }

  if (
    type.includes("order") ||
    type === "open_orders" ||
    type === "old_open_order" ||
    type === "incomplete_orders"
  ) {
    return "/orders";
  }

  if (
    type.includes("message") ||
    type === "draft_messages" ||
    type === "pending_messages" ||
    type === "failed_messages"
  ) {
    return "/messages";
  }

  if (type.includes("customer") || type === "new_customers") {
    return "/customers";
  }

  return "/dashboard";
}

function getAlertActionLabel(route) {
  if (route === "/products") return "مشاهده محصولات";
  if (route === "/orders") return "مشاهده سفارش‌ها";
  if (route === "/messages") return "مشاهده پیام‌ها";
  if (route === "/customers") return "مشاهده مشتریان";

  return "مشاهده";
}

function getSeverityLabel(severity) {
  const value = String(severity || "").toLowerCase();

  if (value === "critical") return "بحرانی";
  if (value === "warning") return "هشدار";
  if (value === "success") return "مثبت";

  return "اطلاع";
}

function alertItemsToText(items = []) {
  if (!Array.isArray(items) || items.length === 0) return "";

  return items
    .map((item) => {
      if (item.product_name || item.name) {
        const name = item.product_name || item.name;
        const unit = item.unit ? ` ${item.unit}` : "";

        if (item.stock_alert_level !== undefined || item.warning_stock !== undefined) {
          const stock = item.stock_quantity ?? item.remaining_stock ?? 0;
          const alertLevel = item.stock_alert_level ?? item.warning_stock ?? 0;

          return `${name}: موجودی ${formatNumber(stock)}${unit} / حد هشدار ${formatNumber(alertLevel)}`;
        }

        if (Array.isArray(item.missing) && item.missing.length > 0) {
          return `${name}: ${item.missing.join("، ")}`;
        }

        return name;
      }

      if (item.order_code) {
        if (Array.isArray(item.missing) && item.missing.length > 0) {
          return `${item.order_code}: ${item.missing.join("، ")}`;
        }

        return `${item.order_code}${item.customer_name ? ` - ${item.customer_name}` : ""}${
          item.status ? ` (${item.status})` : ""
        }`;
      }

      if (item.customer_name) {
        return `${item.customer_name}${item.phone ? ` - ${item.phone}` : ""}`;
      }

      return Object.values(item).filter(Boolean).join(" - ");
    })
    .join("\n");
}

function getAlertStableId(alert, index) {
  return [
    alert.type || "alert",
    alert.severity || "",
    alert.entity_type || "",
    alert.entity_id || "",
    alert.product_id || "",
    alert.order_id || "",
    alert.message_id || "",
    alert.customer_id || "",
    alert.title || "",
    alert.message || "",
    index,
  ].join("|");
}

function getStoredReadAlertIds() {
  try {
    const rawValue = localStorage.getItem(READ_ALERTS_STORAGE_KEY);
    const parsedValue = JSON.parse(rawValue || "[]");

    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

function saveStoredReadAlertIds(ids) {
  localStorage.setItem(READ_ALERTS_STORAGE_KEY, JSON.stringify(ids));
}

function buildNotifications(alerts, readAlertIds = []) {
  const rows = asArray(alerts);

  if (rows.length === 0) {
    return [
      {
        id: "dashboard-ok",
        type: "empty",
        severity: "success",
        title: "مورد فوری برای پیگیری وجود ندارد",
        time: "اکنون",
        unread: false,
        message: "در حال حاضر اعلان مهمی از داده‌های سیستم ثبت نشده است.",
        actionLabel: "مشاهده داشبورد",
        route: "/dashboard",
      },
    ];
  }

  return rows.map((alert, index) => {
    const itemText = alertItemsToText(alert.items);
    const id = getAlertStableId(alert, index);
    const route = getAlertRoute(alert.type);

    return {
      id,
      type: alert.type || "alert",
      severity: alert.severity || "info",
      title: alert.title || "اعلان",
      time: "اکنون",
      unread: !readAlertIds.includes(id),
      message: `${alert.message || alert.description || ""}${itemText ? `\n\n${itemText}` : ""}`.trim(),
      actionLabel: getAlertActionLabel(route),
      route,
    };
  });
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
      <path
        d="M15 18H9m9-1V11a6 6 0 1 0-12 0v6l-2 2h16l-2-2Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function SummaryIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path d="M5 19V9M12 19V5M19 19v-7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function QuickIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path
        d="M13 2 4 14h7l-1 8 10-13h-7V2Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path
        d="M7.5 6.5h9M7.5 12h9M7.5 17.5h5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M20 5.5v13A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function SalesTrendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path d="M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M5 15.5 9 11.5l3 3L19 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 7.5H19v3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TopProductsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path
        d="M8 4h8v3a4 4 0 0 1-8 0V4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 6H5a2 2 0 0 0 2 4h1M16 6h3a2 2 0 0 1-2 4h-1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 11v4M9 20h6M10 15h4v5h-4v-5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OrderAddIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
      <path
        d="M5 6.5h14v10H8l-3 3v-13Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
      <path
        d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M4 7.5 12 12l8-4.5M12 12v9" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
      <path d="M4 19h16M7 16V9M12 16V5M17 16v-4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function SubscriptionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
      <path
        d="M7 3v3M17 3v3M4.5 9h15M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="m9 14 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GrowthBadge({ value }) {
  const number = toNumber(value);
  const isNegative = number < 0;
  const className = isNegative ? "negative" : "positive";
  const sign = isNegative ? "" : "+";

  return <span className={`dashboard-growth-badge ${className}`}>{`${sign}${formatNumber(number)}٪`}</span>;
}

function ChartTooltip({ active, payload, label, type = "amount" }) {
  if (!active || !payload || !payload.length) return null;

  const value = payload[0]?.value;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label}</div>
      <div className="chart-tooltip__value">
        {type === "amount" ? formatCurrency(value) : `${formatNumber(value)} مورد`}
      </div>
    </div>
  );
}

function NotificationItem({ item, expanded, onClick, onNavigate }) {
  return (
    <div className={`notification-item ${item.unread ? "unread" : "read"}`}>
      <button className="notification-item__summary" type="button" onClick={onClick}>
        <div className="notification-item__top">
          <div className="notification-item__sender-wrap">
            {item.unread && <span className="notification-unread-dot" />}
            <span className={`notification-severity-pill notification-severity-pill--${item.severity}`}>
              {getSeverityLabel(item.severity)}
            </span>
          </div>

          <span className="notification-item__time">{item.time}</span>
        </div>

        <div className="notification-item__title">{item.title}</div>
      </button>

      {expanded && (
        <div className="notification-item__body">
          {item.message && <p>{item.message}</p>}

          {item.route && item.route !== "/dashboard" && (
            <button type="button" className="notification-action-btn" onClick={onNavigate}>
              {item.actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const notificationRef = useRef(null);
  const notificationPanelRef = useRef(null);

  const [periodIndex, setPeriodIndex] = useState(0);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [expandedNotificationId, setExpandedNotificationId] = useState(null);
  const [activityReportOpen, setActivityReportOpen] = useState(false);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const [readAlertIds, setReadAlertIds] = useState(() => getStoredReadAlertIds());
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());

  const activePeriod = PERIODS[periodIndex];
  const canSeeActivityLogs = isAdminRole(currentUser?.role);

  const stats = summary?.stats || EMPTY_SUMMARY.stats;
  const charts = summary?.charts || EMPTY_SUMMARY.charts;
  const recent = summary?.recent || EMPTY_SUMMARY.recent;
  const growth = stats.growth || {};
  const subscriptionDays = getSubscriptionDays(summary);

  const notifications = useMemo(
    () => buildNotifications(summary?.alerts, readAlertIds),
    [summary?.alerts, readAlertIds]
  );

  const unreadCount = notifications.filter((item) => item.unread).length;

  const ordersByDay = asArray(charts.orders_by_day).map((item) => ({
    ...item,
    label: item.label || item.date || "-",
    count: toNumber(item.count),
    amount: toNumber(item.amount),
  }));

  const topProducts = asArray(charts.top_products).map((item, index) => ({
    name: item.name || item.product_name || "محصول",
    count: toNumber(item.count),
    amount: toNumber(item.amount),
    color: TOP_PRODUCT_COLORS[index % TOP_PRODUCT_COLORS.length],
  }));

  const orderStatusData = useMemo(
    () => buildOrderStatusData(charts.orders_by_status, stats),
    [charts.orders_by_status, stats]
  );

  const pieStatusData = orderStatusData.filter((item) => item.count > 0);
  const recentOrders = asArray(recent.recent_orders).slice(0, 5);

  const periodSales =
    toNumber(stats.period_amount) > 0
      ? toNumber(stats.period_amount)
      : toNumber(stats.month_order_amount) > 0
        ? toNumber(stats.month_order_amount)
        : toNumber(stats.total_amount);

  const todaySales = toNumber(stats.today_amount);
  const periodOrders = toNumber(stats.period_orders || stats.total_orders);

  const hasSalesTrendData = ordersByDay.some((item) => toNumber(item.amount) > 0);
  const hasTopProducts = topProducts.some((item) => item.count > 0 || item.amount > 0);
  const hasStatusData = pieStatusData.some((item) => item.count > 0);

  const activityLogs = useMemo(() => {
    if (!canSeeActivityLogs) return [];
    return getActivityLogs();
  }, [activityRefreshKey, canSeeActivityLogs]);

  async function loadDashboard(periodKey = "weekly") {
    setLoading(true);
    setError("");

    try {
      const data = await fetchDashboardSummary(periodKey);
      setSummary(data || EMPTY_SUMMARY);
    } catch (err) {
      console.error(err);
      setError("خطا در دریافت اطلاعات داشبورد از سرور");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard(activePeriod.key);
  }, [activePeriod.key]);

  useEffect(() => {
    function handleOutsideClick(event) {
      const clickedBell = notificationRef.current && notificationRef.current.contains(event.target);
      const clickedPanel = notificationPanelRef.current && notificationPanelRef.current.contains(event.target);

      if (!clickedBell && !clickedPanel) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const handleActivityUpdate = () => setActivityRefreshKey((previous) => previous + 1);

    window.addEventListener("order-assistant-activity-log-updated", handleActivityUpdate);

    return () => window.removeEventListener("order-assistant-activity-log-updated", handleActivityUpdate);
  }, []);

  useEffect(() => {
    function handleAuthChanged() {
      setCurrentUser(getStoredUser());
    }

    window.addEventListener("oa-auth-changed", handleAuthChanged);
    window.addEventListener("storage", handleAuthChanged);

    return () => {
      window.removeEventListener("oa-auth-changed", handleAuthChanged);
      window.removeEventListener("storage", handleAuthChanged);
    };
  }, []);

  const goPrevPeriod = () => {
    setPeriodIndex((prev) => (prev - 1 + PERIODS.length) % PERIODS.length);
  };

  const goNextPeriod = () => {
    setPeriodIndex((prev) => (prev + 1) % PERIODS.length);
  };

  const markNotificationAsRead = (id) => {
    if (!id || id === "dashboard-ok") return;

    setReadAlertIds((previous) => {
      if (previous.includes(id)) return previous;

      const next = [...previous, id];
      saveStoredReadAlertIds(next);
      return next;
    });
  };

  const handleNotificationClick = (id) => {
    markNotificationAsRead(id);
    setExpandedNotificationId((prev) => (prev === id ? null : id));
  };

  const handleNotificationNavigate = (item) => {
    markNotificationAsRead(item.id);
    setNotificationsOpen(false);

    if (item.route && item.route !== "/dashboard") {
      navigate(item.route);
    }
  };

  const openOrdersByStatus = (status) => {
    navigate(`/orders?status=${encodeURIComponent(status)}`, {
      state: { dashboardStatusFilter: status },
    });
  };

  const openActivityReport = () => {
    if (!canSeeActivityLogs) return;

    setActivityRefreshKey((previous) => previous + 1);
    setActivityReportOpen(true);
  };

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar__right">
            <h1 className="dashboard-title">داشبورد کاربری</h1>
          </div>

          <div className="dashboard-topbar__left">
            <div className="dashboard-notification-box" ref={notificationRef}>
              <button
                className="dashboard-bell-btn"
                type="button"
                onClick={() => setNotificationsOpen((prev) => !prev)}
                aria-label="اعلان‌ها"
              >
                <BellIcon />
                {unreadCount > 0 && <span className="dashboard-bell-count">{formatNumber(unreadCount)}</span>}
              </button>
            </div>

            <div className="subscription-pill" title="روزهای باقی‌مانده از اشتراک">
              <span className="subscription-pill__icon">
                <SubscriptionIcon />
              </span>
              <span className="subscription-pill__label">اشتراک</span>
              <strong>{subscriptionDays === null ? "نامشخص" : `${formatNumber(subscriptionDays)} روز`}</strong>
            </div>

            <div className="dashboard-period-switcher">
              <button type="button" className="period-btn" onClick={goPrevPeriod} aria-label="بازه قبلی">
                ‹
              </button>
              <div className="period-label">{activePeriod.label}</div>
              <button type="button" className="period-btn" onClick={goNextPeriod} aria-label="بازه بعدی">
                ›
              </button>
            </div>
          </div>
        </header>

        {notificationsOpen && (
          <div className="dashboard-notification-popup" ref={notificationPanelRef}>
            <div className="notification-popup__header">
              <strong>اعلان‌ها</strong>
              <span>{unreadCount > 0 ? `${formatNumber(unreadCount)} خوانده‌نشده` : "همه خوانده شده‌اند"}</span>
            </div>

            <div className="notification-popup__list">
              <div className="notification-section">
                {notifications.map((item) => (
                  <NotificationItem
                    key={item.id}
                    item={item}
                    expanded={expandedNotificationId === item.id}
                    onClick={() => handleNotificationClick(item.id)}
                    onNavigate={() => handleNotificationNavigate(item)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <div className="dashboard-card dashboard-error-card">{error}</div>}

        <section className="dashboard-grid">
          <article className="dashboard-card order-status-card">
            <div className="dashboard-card__head">
              <span className="dashboard-icon-badge">
                <StatusIcon />
              </span>
              <h2>وضعیت سفارشات</h2>
            </div>

            <div className="order-status-content">
              <div className="order-status-pie">
                {hasStatusData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieStatusData}
                        dataKey="count"
                        nameKey="status"
                        innerRadius={31}
                        outerRadius={50}
                        paddingAngle={4}
                        cornerRadius={7}
                        onClick={(entry) => openOrdersByStatus(entry.status)}
                      >
                        {pieStatusData.map((entry) => (
                          <Cell key={entry.status} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip type="count" />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="order-status-empty">بدون سفارش</div>
                )}
              </div>

              <div className="order-status-legend">
                {orderStatusData.map((item) => (
                  <button
                    type="button"
                    key={item.status}
                    className={`order-status-row order-status-row--${normalizeStatusClass(item.status)}`}
                    onClick={() => openOrdersByStatus(item.status)}
                  >
                    <span className="order-status-dot" style={{ backgroundColor: item.color }} />
                    <span className="order-status-label">{item.status}</span>
                    <strong>{formatNumber(item.count)}</strong>
                  </button>
                ))}
              </div>
            </div>
          </article>

          <article className="dashboard-card quick-access-card">
            <div className="dashboard-card__head">
              <span className="dashboard-icon-badge">
                <QuickIcon />
              </span>
              <h2>دسترسی سریع</h2>
            </div>

            <div className="quick-access-grid">
              <button
                type="button"
                className="quick-tile"
                onClick={() =>
                  navigate("/orders/new", {
                    state: { fromDashboard: true, returnTo: "/dashboard" },
                  })
                }
              >
                <span className="quick-tile__icon">
                  <OrderAddIcon />
                </span>
                <strong>سفارش جدید</strong>
              </button>

              <button
                type="button"
                className="quick-tile"
                onClick={() =>
                  navigate("/messages?action=new", {
                    state: { fromDashboard: true, openNewMessage: true, action: "new" },
                  })
                }
              >
                <span className="quick-tile__icon">
                  <MessageIcon />
                </span>
                <strong>پیام جدید</strong>
              </button>

              <button
                type="button"
                className="quick-tile"
                onClick={() =>
                  navigate("/products?action=new", {
                    state: { fromDashboard: true, openNewProduct: true, action: "new" },
                  })
                }
              >
                <span className="quick-tile__icon">
                  <BoxIcon />
                </span>
                <strong>محصول جدید</strong>
              </button>

              <button
                type="button"
                className={`quick-tile ${!canSeeActivityLogs ? "quick-tile--disabled" : ""}`}
                onClick={openActivityReport}
                disabled={!canSeeActivityLogs}
                aria-disabled={!canSeeActivityLogs}
                title={
                  canSeeActivityLogs
                    ? "مشاهده گزارش فعالیت کاربران"
                    : "این بخش فقط برای مدیر فعال است"
                }
              >
                <span className="quick-tile__icon">
                  <ActivityIcon />
                </span>
                <strong>فعالیت کاربران</strong>
              </button>
            </div>
          </article>

          <article className="dashboard-card summary-card">
            <div className="dashboard-card__head">
              <span className="dashboard-icon-badge">
                <SummaryIcon />
              </span>
              <h2>خلاصه فروش</h2>
            </div>

            <div className="summary-card__main">
              <div className="summary-card__value-row">
                <div className="summary-card__value">{loading ? "..." : formatCurrency(periodSales)}</div>
                <GrowthBadge value={growth.period_amount} />
              </div>
            </div>

            <div className="summary-card__stats">
              <button type="button" className="summary-card__mini-box" onClick={() => navigate("/orders")}>
                <span className="summary-card__mini-label">سفارش‌های دوره</span>
                <strong>{loading ? "..." : formatNumber(periodOrders)}</strong>
              </button>

              <div className="summary-card__mini-box">
                <span className="summary-card__mini-label">فروش امروز</span>
                <strong>{loading ? "..." : formatCurrency(todaySales)}</strong>
              </div>
            </div>
          </article>

          <article className="dashboard-card sales-chart-card">
            <div className="dashboard-card__head sales-chart-head">
              <span className="dashboard-icon-badge">
                <SalesTrendIcon />
              </span>
              <h2>روند فروش</h2>
            </div>

            <div className="sales-chart-meta">
              <span className="chart-value-main">{loading ? "..." : formatCurrency(periodSales)}</span>
              <GrowthBadge value={growth.period_amount} />
            </div>

            <div className="sales-chart-body">
              {hasSalesTrendData ? (
                <>
                  <div className="sales-axis-y-label">مبلغ فروش</div>

                  <div className="sales-chart-main">
                    <div className="sales-chart-canvas">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={ordersByDay} margin={{ top: 6, right: 14, left: 12, bottom: 12 }}>
                          <CartesianGrid stroke="#eceeff" strokeDasharray="4 4" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tick={{ fill: "#7b7fc4", fontSize: 10 }}
                            tickMargin={7}
                            axisLine={{ stroke: "#e2e6fb" }}
                            tickLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tick={{ fill: "#7b7fc4", fontSize: 10 }}
                            tickMargin={6}
                            axisLine={false}
                            tickLine={false}
                            width={68}
                            tickFormatter={(value) => formatNumber(value)}
                          />
                          <Tooltip content={<ChartTooltip type="amount" />} />
                          <Line
                            type="monotone"
                            dataKey="amount"
                            stroke="#250299"
                            strokeWidth={3}
                            dot={{ r: 4, fill: "#250299", stroke: "#ffffff", strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: "#250299", stroke: "#ffffff", strokeWidth: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="sales-axis-x-label">دوره</div>
                  </div>
                </>
              ) : (
                <div className="chart-empty-state">داده کافی برای نمایش نمودار فروش وجود ندارد.</div>
              )}
            </div>
          </article>

          <article className="dashboard-card products-chart-card">
            <div className="dashboard-card__head products-chart-head">
              <span className="dashboard-icon-badge">
                <TopProductsIcon />
              </span>
              <h2>پرفروش‌ترین‌ها</h2>
            </div>

            <div className="products-chart-body">
              {hasTopProducts ? (
                <>
                  <div className="products-axis-y-label">تعداد</div>

                  <div className="products-bar-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProducts} margin={{ top: 6, right: 8, left: 8, bottom: 12 }}>
                        <CartesianGrid stroke="#eceeff" strokeDasharray="4 4" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "#7b7fc4", fontSize: 10 }}
                          tickMargin={7}
                          axisLine={{ stroke: "#e2e6fb" }}
                          tickLine={false}
                          interval={0}
                        />
                        <YAxis
                          tick={{ fill: "#7b7fc4", fontSize: 10 }}
                          tickMargin={6}
                          axisLine={false}
                          tickLine={false}
                          width={42}
                          tickFormatter={(value) => formatNumber(value)}
                        />
                        <Tooltip content={<ChartTooltip type="count" />} />
                        <Bar dataKey="count" radius={[9, 9, 0, 0]} barSize={25}>
                          {topProducts.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="chart-empty-state">هنوز محصول پرفروش ثبت نشده است.</div>
              )}
            </div>

            <div className="products-axis-x-label">نام محصول</div>
          </article>

          <article className="dashboard-card recent-orders-card">
            <div className="recent-orders-head">
              <h2>سفارش‌های اخیر</h2>

              <button className="outline-action-btn" type="button" onClick={() => navigate("/orders")}>
                مشاهده همه
              </button>
            </div>

            <div className="orders-table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>کد سفارش</th>
                    <th>نام مشتری</th>
                    <th>اقلام سفارش</th>
                    <th>وضعیت سفارش</th>
                    <th>تاریخ سفارش</th>
                    <th>جمع کل</th>
                  </tr>
                </thead>

                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan="6">هنوز سفارشی ثبت نشده است.</td>
                    </tr>
                  ) : (
                    recentOrders.map((row) => {
                      const rowStatus = normalizeOrderStatus(row.status);
                      const rowStatusClass = normalizeStatusClass(row.status);

                      return (
                        <tr key={row.id || row.order_code}>
                          <td className="orders-id-cell">{row.order_code || row.code || row.id}</td>
                          <td>{row.customer_name || row.customer || "-"}</td>
                          <td>{row.items_summary || row.items || "-"}</td>
                          <td>
                            <span className={`status-badge ${rowStatusClass}`}>{rowStatus || "-"}</span>
                          </td>
                          <td>{row.date || row.order_date_text || "-"}</td>
                          <td>{formatCurrency(row.total ?? row.amount ?? 0)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </div>

      {canSeeActivityLogs && activityReportOpen && (
        <ActivityReportModal
          title="گزارش فعالیت تمامی کاربران"
          logs={activityLogs}
          onClose={() => setActivityReportOpen(false)}
          showUserFilter
          showRoleFilter
        />
      )}
    </main>
  );
}