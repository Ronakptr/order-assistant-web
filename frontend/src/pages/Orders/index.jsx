import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Orders.css";
import { fetchOrders, deleteOrder as deleteOrderApi } from "../../api/orders";
import {
  formatCurrency as formatCurrencyValue,
  useCurrencyVersion,
} from "../../utils/currencySettings";
import {
  formatAppDateOrText,
  useDateSettingsVersion,
} from "../../utils/appDate";

const STORAGE_KEY = "order_assistant_orders";

const DEFAULT_ORDERS = [
  {
    uid: 1,
    code: "ORD-0001",
    customer: "رضا پناهی دوست",
    status: "پرداخت شده",
    date: "۱۴۰۴/۰۸/۰۱ - ۱۲:۳۰",
    total: "۲۵,۵۰۰,۰۰۰ تومان",
    items: [],
  },
  {
    uid: 2,
    code: "ORD-0002",
    customer: "سارا احمدی",
    status: "در انتظار پرداخت",
    date: "۱۴۰۴/۰۸/۰۲ - ۱۰:۱۵",
    total: "۱۸,۰۰۰,۰۰۰ تومان",
    items: [],
  },
  {
    uid: 3,
    code: "ORD-0003",
    customer: "مهدی نوری",
    status: "لغو شده",
    date: "۱۴۰۴/۰۸/۰۳ - ۱۶:۴۵",
    total: "۹,۷۰۰,۰۰۰ تومان",
    items: [],
  },
  {
    uid: 4,
    code: "ORD-0004",
    customer: "نمونه ثبت‌شده",
    status: "ثبت شده",
    date: "۱۴۰۴/۰۸/۰۴ - ۰۹:۳۰",
    total: "۱۲,۰۰۰,۰۰۰ تومان",
    items: [],
  },
];

function normalizePersianText(value) {
  return String(value || "")
    .replace(/[{}]/g, "")
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStatus(status) {
  const value = normalizePersianText(status);

  if (!value) return "ثبت‌شده";

  if (value === "paid") return "پرداخت شده";
  if (value === "pending") return "در انتظار پرداخت";
  if (value === "cancelled" || value === "canceled") return "لغو شده";
  if (value === "registered") return "ثبت‌شده";

  if (value.includes("انتظار")) return "در انتظار پرداخت";
  if (value.includes("لغو")) return "لغو شده";
  if (value.includes("ثبت")) return "ثبت‌شده";
  if (value.includes("پرداخت")) return "پرداخت شده";
  if (value.includes("تسویه")) return "پرداخت شده";
  if (value.includes("تکمیل")) return "پرداخت شده";
  if (value.includes("انجام")) return "پرداخت شده";

  return value;
}

function formatOrderDateForDisplay(order) {
  const rawDate =
    order?.dateInputValue ||
    order?.date_input_value ||
    order?.dateRaw ||
    order?.date_raw ||
    order?.date ||
    order?.createdAt ||
    order?.created_at ||
    order?.order_date ||
    "";

  return rawDate ? formatAppDateOrText(rawDate) : "-";
}

function getStatusConfig(status) {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "پرداخت شده") {
    return {
      className: "paid",
      label: "پرداخت شده",
    };
  }

  if (normalizedStatus === "در انتظار پرداخت") {
    return {
      className: "pending",
      label: "در انتظار پرداخت",
    };
  }

  if (normalizedStatus === "لغو شده") {
    return {
      className: "cancelled",
      label: "لغو شده",
    };
  }

  if (normalizedStatus === "ثبت‌شده") {
    return {
      className: "registered",
      label: "ثبت‌شده",
    };
  }

  return {
    className: "registered",
    label: normalizedStatus || "ثبت‌شده",
  };
}

function normalizeOrder(order, index) {
  const code =
    order?.code ||
    order?.orderCode ||
    order?.order_code ||
    order?.id ||
    order?.uid ||
    `ORD-${String(index + 1).padStart(4, "0")}`;

  return {
    ...order,
    uid: order?.uid || order?.id || code,
    code,
    customer:
      order?.customer ||
      order?.customerName ||
      order?.customer_name ||
      order?.clientName ||
      order?.client_name ||
      order?.name ||
      "بدون نام",
    status: normalizeStatus(order?.status || order?.orderStatus || order?.order_status),
    date: order?.date || order?.createdAt || order?.created_at || order?.order_date || "-",
    dateInputValue: order?.dateInputValue || order?.date_input_value || "",
    dateRaw:
      order?.dateInputValue ||
      order?.date_input_value ||
      order?.date ||
      order?.createdAt ||
      order?.created_at ||
      order?.order_date ||
      "",
    totalRaw:
      order?.totalRaw ??
      order?.total_raw ??
      order?.totalPrice ??
      order?.total_price ??
      order?.amount ??
      order?.total_amount ??
      order?.total ??
      0,
    total: formatCurrencyValue(
      order?.totalRaw ??
        order?.total_raw ??
        order?.totalPrice ??
        order?.total_price ??
        order?.amount ??
        order?.total_amount ??
        order?.total ??
        0
    ),
    items: Array.isArray(order?.items) ? order.items : [],
  };
}

function loadOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ORDERS));
      return DEFAULT_ORDERS.map(normalizeOrder);
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return DEFAULT_ORDERS.map(normalizeOrder);
    }

    return parsed.map(normalizeOrder);
  } catch {
    return DEFAULT_ORDERS.map(normalizeOrder);
  }
}

function saveOrdersToStorage(orders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));

  window.dispatchEvent(
    new CustomEvent("order-assistant-orders-updated", {
      detail: orders,
    })
  );
}

function SearchIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7.5" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13.7 5.3 18.7 10.3" />
      <path d="M4.5 19.5h4.2L19.2 9a2.35 2.35 0 0 0 0-3.3l-.9-.9a2.35 2.35 0 0 0-3.3 0L4.5 15.3v4.2Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}

function SortDot({ active, direction }) {
  return (
    <span
      className={`orders-sort-dot${active ? " is-active" : ""}`}
      aria-hidden="true"
    >
      {active ? (direction === "asc" ? "↑" : "↓") : "◇"}
    </span>
  );
}

function StatusBadge({ status }) {
  const config = getStatusConfig(status);

  return (
    <span
      className={`order-status-badge order-status-badge--${config.className}`}
    >
      {config.label}
    </span>
  );
}

function ItemsPopup({ order, onClose }) {
  if (!order) return null;

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="orders-popup-backdrop" onClick={onClose}>
      <div
        className="orders-items-popup"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="orders-items-popup__header">
          <div>
            <h3>اقلام سفارش</h3>
            <p>
              {order.code} - {order.customer}
            </p>
          </div>

          <button
            type="button"
            className="orders-items-popup__close"
            onClick={onClose}
            aria-label="بستن"
          >
            ×
          </button>
        </div>

        <div className="orders-items-popup__body">
          {items.length === 0 ? (
            <div className="orders-items-popup__empty">
              کالایی برای این سفارش ثبت نشده است.
            </div>
          ) : (
            items.map((item, index) => (
              <div className="orders-popup-item" key={item.id || index}>
                <span className="orders-popup-item__number">{index + 1}</span>

                <div className="orders-popup-item__content">
                  <strong>{item.name || item.productName || item.product_name || "-"}</strong>
                  <span>
                    مقدار:{" "}
                    {item.quantity ||
                      item.countDisplay ||
                      item.count_display ||
                      item.weight ||
                      item.length ||
                      "-"}
                  </span>
                </div>

                <div className="orders-popup-item__price">
                  <span>
                    {formatCurrencyValue(
                      item.unitPriceRaw ??
                        item.unit_price_raw ??
                        item.unit_price ??
                        item.unitPrice ??
                        0
                    )}
                  </span>
                  <strong>
                    {formatCurrencyValue(
                      item.totalRaw ??
                        item.total_raw ??
                        item.total_price ??
                        item.line_total ??
                        item.total ??
                        0
                    )}
                  </strong>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteOrderConfirmModal({ order, onCancel, onConfirm }) {
  if (!order) return null;

  return (
    <div className="orders-confirm-overlay" onClick={onCancel}>
      <div
        className="orders-confirm-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="orders-confirm-icon">
          <TrashIcon />
        </div>

        <p className="orders-confirm-text">
          آیا از حذف سفارش{" "}
          <strong>{order.code || order.customer || "انتخاب‌شده"}</strong>{" "}
          اطمینان دارید؟
        </p>

        <div className="orders-confirm-actions">
          <button
            type="button"
            className="orders-confirm-btn orders-confirm-btn--cancel"
            onClick={onCancel}
          >
            انصراف
          </button>

          <button
            type="button"
            className="orders-confirm-btn orders-confirm-btn--danger"
            onClick={onConfirm}
          >
            بله، حذف شود
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  useCurrencyVersion();
  const dateSettingsVersion = useDateSettingsVersion();

  const navigate = useNavigate();
  const location = useLocation();

  const dashboardStatusFilter =
    new URLSearchParams(location.search).get("status") ||
    location.state?.dashboardStatusFilter ||
    "";

  const normalizedDashboardStatusFilter = normalizeStatus(dashboardStatusFilter);

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openActionOrderId, setOpenActionOrderId] = useState(null);
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState(null);

  const [sortKey, setSortKey] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  const columns = [
    { key: "code", label: "کد سفارش" },
    { key: "customer", label: "نام مشتری" },
    { key: "items", label: "اقلام سفارش" },
    { key: "status", label: "وضعیت سفارش" },
    { key: "date", label: "تاریخ سفارش" },
    { key: "total", label: "جمع کل" },
  ];

  const refreshOrders = async () => {
    try {
      const data = await fetchOrders();
      setOrders(Array.isArray(data) ? data.map(normalizeOrder) : []);
    } catch {
      alert("خطا در دریافت سفارش‌ها از سرور");
    }
  };

  useEffect(() => {
    refreshOrders();

    const handleFocus = () => refreshOrders();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshOrders();
      }
    };

    const handleStorage = () => refreshOrders();

    const handleOrdersUpdate = () => refreshOrders();

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("order-assistant-orders-updated", handleOrdersUpdate);
    window.addEventListener("order-assistant-date-settings-updated", handleOrdersUpdate);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        "order-assistant-orders-updated",
        handleOrdersUpdate
      );
      window.removeEventListener(
        "order-assistant-date-settings-updated",
        handleOrdersUpdate
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const closeActionsMenu = () => {
      setOpenActionOrderId(null);
    };

    document.addEventListener("click", closeActionsMenu);

    return () => {
      document.removeEventListener("click", closeActionsMenu);
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [dashboardStatusFilter]);

  const clearDashboardStatusFilter = () => {
    navigate("/orders", { replace: true });
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }

    setPage(1);
  };

  const filteredOrders = useMemo(() => {
    const query = normalizePersianText(search).toLowerCase();

    const result = orders.filter((order) => {
      if (
        dashboardStatusFilter &&
        normalizeStatus(order.status) !== normalizedDashboardStatusFilter
      ) {
        return false;
      }

      if (!query) return true;

      return [
        order.code,
        order.customer,
        order.status,
        order.date,
        order.total,
      ].some((value) =>
        normalizePersianText(value).toLowerCase().includes(query)
      );
    });

    if (!sortKey) return result;

    return [...result].sort((first, second) => {
      let firstValue;
      let secondValue;

      if (sortKey === "items") {
        firstValue = Array.isArray(first.items) ? first.items.length : 0;
        secondValue = Array.isArray(second.items) ? second.items.length : 0;
      } else if (sortKey === "status") {
        firstValue = normalizeStatus(first.status);
        secondValue = normalizeStatus(second.status);
      } else {
        firstValue = first[sortKey] ?? "";
        secondValue = second[sortKey] ?? "";
      }

      const comparison = String(firstValue).localeCompare(
        String(secondValue),
        "fa",
        {
          numeric: true,
        }
      );

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [
    orders,
    search,
    sortKey,
    sortDirection,
    dashboardStatusFilter,
    normalizedDashboardStatusFilter,
    dateSettingsVersion,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / rowsPerPage));

  const currentPage = Math.min(page, totalPages);

  const displayedOrders = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredOrders.slice(start, start + rowsPerPage);
  }, [filteredOrders, currentPage, rowsPerPage]);

  const openOrderEditor = (order) => {
    const orderId = order.uid || order.code;

    if (!orderId) {
      alert("شناسه سفارش پیدا نشد.");
      return;
    }

    setOpenActionOrderId(null);
    navigate(`/orders/edit/${encodeURIComponent(orderId)}`);
  };

  const requestDeleteOrder = (order) => {
    setOpenActionOrderId(null);
    setDeleteConfirmOrder(order);
  };

  const confirmDeleteOrder = async () => {
    if (!deleteConfirmOrder) return;

    try {
      const orderKey = deleteConfirmOrder.uid || deleteConfirmOrder.code;
      await deleteOrderApi(orderKey);
      setSelectedOrder(null);
      setOpenActionOrderId(null);
      setDeleteConfirmOrder(null);
      await refreshOrders();
    } catch {
      alert("خطا در حذف سفارش از سرور");
    }
  };

  return (
    <div className="orders-page orders-page-v2">
      <header className="orders-header">
        <h1 className="orders-title">مدیریت سفارش ها</h1>

        <div className="orders-header__actions">
          <button
            type="button"
            className="add-order-btn"
            onClick={() => navigate("/orders/new")}
          >
            <PlusIcon />
            <span>سفارش جدید</span>
          </button>

          <label className="orders-search">
            <span className="orders-search__icon">
              <SearchIcon />
            </span>

            <input
              type="search"
              value={search}
              placeholder="جستجو..."
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
      </header>

      {dashboardStatusFilter && (
        <div className="orders-dashboard-filter">
          <span>
            فیلتر وضعیت از داشبورد:{" "}
            <strong>{normalizedDashboardStatusFilter}</strong>
          </span>

          <button type="button" onClick={clearDashboardStatusFilter}>
            حذف فیلتر
          </button>
        </div>
      )}

      <section className="orders-table-card">
        <div className="orders-table-scroll">
          <table className="orders-table">
            <colgroup>
              <col className="orders-col-edit" />
              <col className="orders-col-code" />
              <col className="orders-col-customer" />
              <col className="orders-col-items" />
              <col className="orders-col-status" />
              <col className="orders-col-date" />
              <col className="orders-col-total" />
            </colgroup>

            <thead>
              <tr>
                <th className="orders-th orders-th--edit" />

                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="orders-th orders-th--sortable"
                    onClick={() => handleSort(column.key)}
                  >
                    <span className="orders-th__content">
                      <SortDot
                        active={sortKey === column.key}
                        direction={sortDirection}
                      />
                      <span>{column.label}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {displayedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="orders-empty">
                    سفارشی برای نمایش وجود ندارد.
                  </td>
                </tr>
              ) : (
                displayedOrders.map((order) => {
                  const actionId = String(order.uid || order.code);

                  return (
                    <tr
                      key={order.uid || order.code}
                      className="orders-row"
                      onDoubleClick={() => openOrderEditor(order)}
                    >
                      <td className="orders-td orders-td--edit">
                        <div
                          className="order-action-cell"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="order-edit-btn"
                            title="عملیات سفارش"
                            aria-label="عملیات سفارش"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenActionOrderId((current) =>
                                current === actionId ? null : actionId
                              );
                            }}
                          >
                            <EditIcon />
                          </button>

                          {openActionOrderId === actionId && (
                            <div className="order-actions-menu">
                              <button
                                type="button"
                                className="order-actions-menu__item"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openOrderEditor(order);
                                }}
                              >
                                <EditIcon />
                                <span>ویرایش سفارش</span>
                              </button>

                              <button
                                type="button"
                                className="order-actions-menu__item order-actions-menu__item--danger"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  requestDeleteOrder(order);
                                }}
                              >
                                <TrashIcon />
                                <span>حذف سفارش</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="orders-td orders-code">{order.code}</td>

                      <td className="orders-td">{order.customer || "-"}</td>

                      <td className="orders-td orders-td--items">
                        <button
                          type="button"
                          className="orders-items-button"
                          title="نمایش اقلام سفارش"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedOrder(order);
                            setOpenActionOrderId(null);
                          }}
                        >
                          ...
                        </button>
                      </td>

                      <td className="orders-td orders-td--status">
                        <StatusBadge status={order.status} />
                      </td>

                      <td className="orders-td">{formatOrderDateForDisplay(order)}</td>

                      <td className="orders-td orders-total">
                        {order.total || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="orders-pagination">
        <div className="pagination-summary">
          <span>
            نمایش صفحه {currentPage} از {totalPages}
          </span>

          <span className="pagination-summary__total">
            تعداد کل: {filteredOrders.length}
          </span>
        </div>

        <div className="pagination-actions">
          <label className="rows-per-page">
            <span>تعداد در صفحه:</span>

            <select
              value={rowsPerPage}
              onChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(1);
              }}
            >
              <option value={5}>۵</option>
              <option value={8}>۸</option>
              <option value={10}>۱۰</option>
              <option value={15}>۱۵</option>
            </select>
          </label>

          <button
            type="button"
            className="pagination-button"
            disabled={currentPage === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            قبلی
          </button>

          <button
            type="button"
            className="pagination-button pagination-button--primary"
            disabled={currentPage === totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
          >
            بعدی
          </button>
        </div>
      </footer>

      <ItemsPopup order={selectedOrder} onClose={() => setSelectedOrder(null)} />

      <DeleteOrderConfirmModal
        order={deleteConfirmOrder}
        onCancel={() => setDeleteConfirmOrder(null)}
        onConfirm={confirmDeleteOrder}
      />

      <style>{`
        .orders-page-v2 {
          width: 100% !important;
          min-height: 100% !important;
          padding: 30px 30px 24px !important;
          background: transparent !important;
          color: var(--text-main, #111827) !important;
          direction: rtl !important;
          box-sizing: border-box !important;
        }

        .orders-page-v2,
        .orders-page-v2 * {
          box-sizing: border-box !important;
        }

        .orders-page-v2 button,
        .orders-page-v2 input,
        .orders-page-v2 select {
          font-family: "Vazirmatn", Tahoma, Arial, sans-serif !important;
        }

        .orders-page-v2 .orders-header {
          width: 100% !important;
          min-height: 44px !important;
          margin-bottom: 20px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 18px !important;
        }

        .orders-page-v2 .orders-title {
          margin: 0 !important;
          color: var(--text-title, #111827) !important;
          font-size: 20px !important;
          font-weight: 800 !important;
          line-height: 1.4 !important;
          text-align: right !important;
        }

        .orders-page-v2 .orders-header__actions {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          direction: ltr !important;
        }

        .orders-dashboard-filter {
          width: 100% !important;
          min-height: 44px !important;
          margin: 0 0 14px !important;
          padding: 9px 14px !important;
          border: 1px solid #e4e7ff !important;
          border-radius: 13px !important;
          background: #f7f5ff !important;
          color: #250299 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 12px !important;
          font-size: 12.5px !important;
          font-weight: 800 !important;
        }

        .orders-dashboard-filter strong {
          font-weight: 900 !important;
        }

        .orders-dashboard-filter button {
          height: 30px !important;
          border: none !important;
          border-radius: 9px !important;
          background: #250299 !important;
          color: #ffffff !important;
          padding: 0 12px !important;
          font-size: 11.5px !important;
          font-weight: 900 !important;
          cursor: pointer !important;
        }

        .orders-page-v2 .add-order-btn {
          width: 146px !important;
          height: 44px !important;
          padding: 0 17px !important;
          border: none !important;
          border-radius: 9px !important;
          background: var(--color-primary, #250299) !important;
          color: #ffffff !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 9px !important;
          direction: rtl !important;
          font-size: 13px !important;
          font-weight: 800 !important;
          line-height: 1 !important;
          cursor: pointer !important;
          box-shadow: none !important;
        }

        .orders-page-v2 .orders-search {
          width: 226px !important;
          height: 44px !important;
          position: relative !important;
          display: block !important;
        }

        .orders-page-v2 .orders-search input {
          width: 100% !important;
          height: 100% !important;
          padding: 0 42px 0 14px !important;
          border: 1px solid var(--border-color, #e4e7ff) !important;
          border-radius: 9px !important;
          outline: none !important;
          background: var(--input-bg, #ffffff) !important;
          color: var(--input-text, #111827) !important;
          direction: rtl !important;
          text-align: right !important;
          font-size: 12.5px !important;
          font-weight: 500 !important;
        }

        .orders-page-v2 .orders-search input::placeholder {
          color: #a5a9d8 !important;
          opacity: 1 !important;
        }

        .orders-page-v2 .orders-search__icon {
          position: absolute !important;
          top: 50% !important;
          right: 14px !important;
          transform: translateY(-50%) !important;
          color: #8c91d9 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          pointer-events: none !important;
        }

        .orders-page-v2 .orders-table-card {
          width: 100% !important;
          background: var(--card-bg, #ffffff) !important;
          border: 1px solid var(--border-color, #e4e7ff) !important;
          border-radius: 16px !important;
          overflow: visible !important;
          box-shadow: none !important;
        }

        .orders-page-v2 .orders-table-scroll {
          width: 100% !important;
          overflow-x: auto !important;
          overflow-y: visible !important;
          background: var(--card-bg, #ffffff) !important;
          border-radius: 16px !important;
        }

        .orders-page-v2 .orders-table {
          width: 100% !important;
          min-width: 970px !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
          border-spacing: 0 !important;
          direction: rtl !important;
          background: var(--card-bg, #ffffff) !important;
        }

        .orders-page-v2 .orders-col-edit {
          width: 58px !important;
        }

        .orders-page-v2 .orders-col-code {
          width: 145px !important;
        }

        .orders-page-v2 .orders-col-customer {
          width: 205px !important;
        }

        .orders-page-v2 .orders-col-items {
          width: 135px !important;
        }

        .orders-page-v2 .orders-col-status {
          width: 185px !important;
        }

        .orders-page-v2 .orders-col-date {
          width: 215px !important;
        }

        .orders-page-v2 .orders-col-total {
          width: 180px !important;
        }

        .orders-page-v2 .orders-table thead {
          position: relative !important;
          background: var(--card-bg, #ffffff) !important;
        }

        .orders-page-v2 .orders-th {
          height: 50px !important;
          padding: 0 12px !important;
          border: none !important;
          border-bottom: 1px solid var(--border-color, #e4e7ff) !important;
          background: var(--card-bg, #ffffff) !important;
          color: #9ca0dc !important;
          text-align: center !important;
          vertical-align: middle !important;
          white-space: nowrap !important;
          font-size: 12px !important;
          font-weight: 500 !important;
        }

        .orders-page-v2 .orders-th--sortable {
          cursor: pointer !important;
          user-select: none !important;
        }

        .orders-page-v2 .orders-th--sortable:hover {
          color: var(--color-primary, #250299) !important;
          font-weight: 700 !important;
        }

        .orders-page-v2 .orders-th__content {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
        }

        .orders-page-v2 .orders-sort-dot {
          width: 9px !important;
          color: #d2d4eb !important;
          font-size: 9px !important;
          font-weight: 400 !important;
          line-height: 1 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .orders-page-v2 .orders-sort-dot.is-active {
          color: var(--color-primary, #250299) !important;
          font-size: 11px !important;
          font-weight: 800 !important;
        }

        .orders-page-v2 .orders-row {
          height: 61px !important;
          background: transparent !important;
        }

        .orders-page-v2 .orders-row:hover {
          background: rgba(37, 2, 153, 0.018) !important;
        }

        .orders-page-v2 .orders-row:not(:last-child) .orders-td {
          border-bottom: 1px solid var(--border-color, #e4e7ff) !important;
        }

        .orders-page-v2 .orders-td {
          height: 61px !important;
          padding: 0 12px !important;
          border: none !important;
          color: var(--text-main, #111827) !important;
          text-align: center !important;
          vertical-align: middle !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          font-size: 12.6px !important;
          font-weight: 600 !important;
        }

        .orders-page-v2 .orders-code {
          color: var(--color-primary, #250299) !important;
          direction: ltr !important;
          font-weight: 800 !important;
        }

        .orders-page-v2 .orders-total {
          font-weight: 700 !important;
        }

        .orders-page-v2 .orders-td--edit,
        .orders-page-v2 .orders-td--items,
        .orders-page-v2 .orders-td--status {
          overflow: visible !important;
        }

        .orders-page-v2 .order-action-cell {
          position: relative !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .orders-page-v2 .order-edit-btn {
          width: 28px !important;
          height: 28px !important;
          padding: 0 !important;
          border: none !important;
          border-radius: 5px !important;
          background: transparent !important;
          color: #848de5 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
        }

        .orders-page-v2 .order-edit-btn:hover {
          color: var(--color-primary, #250299) !important;
          background: rgba(37, 2, 153, 0.06) !important;
        }

        .orders-page-v2 .order-actions-menu {
          position: absolute !important;
          top: 34px !important;
          right: 0 !important;
          z-index: 200 !important;
          width: 154px !important;
          padding: 6px !important;
          border: 1px solid var(--border-color, #e4e7ff) !important;
          border-radius: 12px !important;
          background: var(--card-bg, #ffffff) !important;
          box-shadow: 0 14px 34px rgba(37, 2, 153, 0.14) !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 4px !important;
        }

        .orders-page-v2 .order-actions-menu__item {
          width: 100% !important;
          height: 34px !important;
          padding: 0 10px !important;
          border: none !important;
          border-radius: 8px !important;
          background: transparent !important;
          color: var(--text-main, #111827) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-start !important;
          gap: 7px !important;
          direction: rtl !important;
          font-size: 12px !important;
          font-weight: 800 !important;
          cursor: pointer !important;
          text-align: right !important;
        }

        .orders-page-v2 .order-actions-menu__item:hover {
          background: #f1efff !important;
          color: var(--color-primary, #250299) !important;
        }

        .orders-page-v2 .order-actions-menu__item--danger {
          color: #dc2626 !important;
        }

        .orders-page-v2 .order-actions-menu__item--danger:hover {
          background: #fee2e2 !important;
          color: #dc2626 !important;
        }

        .orders-page-v2 .orders-items-button {
          min-width: 36px !important;
          height: 28px !important;
          padding: 0 8px 7px !important;
          border: none !important;
          border-radius: 7px !important;
          background: transparent !important;
          color: #858bd5 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 20px !important;
          font-weight: 900 !important;
          letter-spacing: 2px !important;
          line-height: 1 !important;
          cursor: pointer !important;
        }

        .orders-page-v2 .orders-items-button:hover {
          color: var(--color-primary, #250299) !important;
          background: rgba(37, 2, 153, 0.05) !important;
        }

        .orders-page-v2 .order-status-badge {
          min-width: 108px !important;
          height: 34px !important;
          padding: 0 18px !important;
          border-width: 2px !important;
          border-style: solid !important;
          border-radius: 999px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          white-space: nowrap !important;
          font-size: 12.5px !important;
          font-weight: 600 !important;
          line-height: 1 !important;
          opacity: 1 !important;
          visibility: visible !important;
          cursor: default !important;
          pointer-events: none !important;
          user-select: none !important;
        }

        .orders-page-v2 .order-status-badge--paid {
          color: #16a34a !important;
          background: #dcfce7 !important;
          border-color: #16a34a !important;
        }

        .orders-page-v2 .order-status-badge--pending {
          color: #f97316 !important;
          background: #fff7ed !important;
          border-color: #f97316 !important;
        }

        .orders-page-v2 .order-status-badge--cancelled {
          color: #dc2626 !important;
          background: #fee2e2 !important;
          border-color: #dc2626 !important;
        }

        .orders-page-v2 .order-status-badge--registered {
          color: #250299 !important;
          background: #f1efff !important;
          border-color: #250299 !important;
        }

        .orders-page-v2 .orders-pagination {
          width: 100% !important;
          min-height: 68px !important;
          margin-top: 16px !important;
          padding: 12px 16px !important;
          border: 1px solid var(--border-color, #e4e7ff) !important;
          border-radius: 15px !important;
          background: var(--card-bg, #ffffff) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 14px !important;
          box-shadow: none !important;
        }

        .orders-page-v2 .pagination-summary {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          color: var(--text-main, #111827) !important;
          font-size: 12.5px !important;
          font-weight: 700 !important;
        }

        .orders-page-v2 .pagination-summary__total {
          color: var(--text-soft, #7b7fc4) !important;
        }

        .orders-page-v2 .pagination-actions {
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
        }

        .orders-page-v2 .rows-per-page {
          display: inline-flex !important;
          align-items: center !important;
          gap: 7px !important;
          color: var(--text-soft, #7b7fc4) !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          white-space: nowrap !important;
        }

        .orders-page-v2 .rows-per-page select {
          width: 72px !important;
          height: 38px !important;
          padding: 0 9px !important;
          border: 1px solid var(--border-color, #e4e7ff) !important;
          border-radius: 9px !important;
          outline: none !important;
          background: var(--input-bg, #ffffff) !important;
          color: var(--input-text, #111827) !important;
          font-size: 12.5px !important;
          font-weight: 700 !important;
        }

        .orders-page-v2 .pagination-button {
          min-width: 82px !important;
          height: 38px !important;
          padding: 0 15px !important;
          border: none !important;
          border-radius: 9px !important;
          background: #e5e7eb !important;
          color: #8c919f !important;
          font-size: 12.5px !important;
          font-weight: 700 !important;
          cursor: pointer !important;
        }

        .orders-page-v2 .pagination-button--primary:not(:disabled) {
          background: var(--color-primary, #250299) !important;
          color: #ffffff !important;
        }

        .orders-page-v2 .pagination-button:disabled {
          opacity: 0.72 !important;
          cursor: not-allowed !important;
        }

        .orders-popup-backdrop,
        .orders-confirm-overlay {
          position: fixed !important;
          inset: 0 !important;
          z-index: 1200 !important;
          padding: 24px !important;
          background: rgba(15, 23, 42, 0.36) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .orders-items-popup {
          width: min(600px, 100%) !important;
          max-height: 82vh !important;
          border: 1px solid var(--border-color, #e4e7ff) !important;
          border-radius: 17px !important;
          background: var(--card-bg, #ffffff) !important;
          box-shadow: 0 20px 55px rgba(15, 23, 42, 0.2) !important;
          overflow: hidden !important;
          direction: rtl !important;
        }

        .orders-items-popup__header {
          min-height: 75px !important;
          padding: 17px 20px !important;
          border-bottom: 1px solid var(--border-color, #e4e7ff) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
        }

        .orders-items-popup__header h3 {
          margin: 0 !important;
          color: var(--text-title, #111827) !important;
          font-size: 17px !important;
          font-weight: 800 !important;
        }

        .orders-items-popup__header p {
          margin: 5px 0 0 !important;
          color: var(--text-soft, #7b7fc4) !important;
          font-size: 12px !important;
        }

        .orders-items-popup__close {
          width: 34px !important;
          height: 34px !important;
          padding: 0 !important;
          border: none !important;
          border-radius: 8px !important;
          background: #f1efff !important;
          color: var(--color-primary, #250299) !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 24px !important;
          cursor: pointer !important;
        }

        .orders-items-popup__body {
          max-height: 500px !important;
          padding: 15px 17px !important;
          overflow-y: auto !important;
        }

        .orders-items-popup__empty {
          min-height: 130px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: var(--text-soft, #7b7fc4) !important;
          font-size: 13px !important;
        }

        .orders-popup-item {
          min-height: 72px !important;
          padding: 11px 13px !important;
          border: 1px solid var(--border-color, #e4e7ff) !important;
          border-radius: 13px !important;
          display: grid !important;
          grid-template-columns: 34px minmax(0, 1fr) auto !important;
          align-items: center !important;
          gap: 11px !important;
        }

        .orders-popup-item + .orders-popup-item {
          margin-top: 9px !important;
        }

        .orders-popup-item__number {
          width: 31px !important;
          height: 31px !important;
          border-radius: 50% !important;
          background: #f1efff !important;
          color: var(--color-primary, #250299) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 12px !important;
          font-weight: 800 !important;
        }

        .orders-popup-item__content,
        .orders-popup-item__price {
          min-width: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 4px !important;
        }

        .orders-popup-item__content strong,
        .orders-popup-item__price strong {
          color: var(--text-title, #111827) !important;
          font-size: 12.5px !important;
          font-weight: 800 !important;
        }

        .orders-popup-item__content span,
        .orders-popup-item__price span {
          color: var(--text-soft, #7b7fc4) !important;
          font-size: 11.5px !important;
        }

        .orders-confirm-modal {
          width: 354px !important;
          max-width: 100% !important;
          padding: 34px 30px 26px !important;
          border-radius: 18px !important;
          background: var(--card-bg, #ffffff) !important;
          border: 1px solid var(--border-color, #e4e7ff) !important;
          box-shadow: 0 24px 60px rgba(17, 24, 39, 0.22) !important;
          direction: rtl !important;
          text-align: center !important;
        }

        .orders-confirm-icon {
          width: 68px !important;
          height: 68px !important;
          margin: 0 auto 20px !important;
          border-radius: 50% !important;
          background: #fee2e2 !important;
          color: #dc2626 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .orders-confirm-icon svg {
          width: 20px !important;
          height: 20px !important;
        }

        .orders-confirm-text {
          margin: 0 !important;
          color: var(--text-main, #111827) !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          line-height: 2 !important;
        }

        .orders-confirm-text strong {
          color: var(--color-primary, #250299) !important;
          font-weight: 900 !important;
        }

        .orders-confirm-actions {
          margin-top: 22px !important;
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 12px !important;
          direction: rtl !important;
        }

        .orders-confirm-btn {
          height: 48px !important;
          border: none !important;
          border-radius: 10px !important;
          font-size: 13px !important;
          font-weight: 900 !important;
          cursor: pointer !important;
        }

        .orders-confirm-btn--danger {
          background: #e11d27 !important;
          color: #ffffff !important;
        }

        .orders-confirm-btn--cancel {
          background: #f1efff !important;
          color: var(--color-primary, #250299) !important;
        }

        .orders-confirm-btn:hover {
          opacity: 0.92 !important;
        }

        html[data-theme="dark"] .orders-page-v2 .orders-table-card,
        html[data-theme="dark"] .orders-page-v2 .orders-table-scroll,
        html[data-theme="dark"] .orders-page-v2 .orders-table,
        html[data-theme="dark"] .orders-page-v2 .orders-th,
        html[data-theme="dark"] .orders-page-v2 .orders-pagination,
        html[data-theme="dark"] .orders-items-popup,
        html[data-theme="dark"] .orders-confirm-modal,
        html[data-theme="dark"] .orders-page-v2 .order-actions-menu {
          background: var(--card-bg, #262626) !important;
          border-color: var(--border-color, #3d3d3d) !important;
        }

        html[data-theme="dark"] .orders-page-v2 .orders-row:not(:last-child) .orders-td,
        html[data-theme="dark"] .orders-page-v2 .orders-th {
          border-color: var(--border-color, #3d3d3d) !important;
        }

        html[data-theme="dark"] .orders-page-v2 .orders-search input,
        html[data-theme="dark"] .orders-page-v2 .rows-per-page select {
          background: var(--input-bg, #2c2c2c) !important;
          color: var(--input-text, #ffffff) !important;
        }

        html[data-theme="dark"] .orders-page-v2 .order-actions-menu__item,
        html[data-theme="dark"] .orders-confirm-text {
          color: var(--text-main, #f5f5f5) !important;
        }

        html[data-theme="dark"] .orders-page-v2 .order-actions-menu__item:hover {
          background: rgba(255, 255, 255, 0.06) !important;
        }

        html[data-theme="dark"] .orders-dashboard-filter {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: var(--border-color, #3d3d3d) !important;
          color: #d8d2ff !important;
        }

        @media (max-width: 760px) {
          .orders-page-v2 .orders-header {
            align-items: stretch !important;
            flex-direction: column !important;
          }

          .orders-page-v2 .orders-header__actions {
            width: 100% !important;
            direction: rtl !important;
          }

          .orders-page-v2 .orders-search {
            flex: 1 !important;
            width: auto !important;
          }

          .orders-dashboard-filter {
            align-items: stretch !important;
            flex-direction: column !important;
          }

          .orders-page-v2 .orders-pagination {
            align-items: stretch !important;
            flex-direction: column !important;
          }

          .orders-page-v2 .pagination-actions {
            width: 100% !important;
            flex-wrap: wrap !important;
          }
        }
      `}</style>
    </div>
  );
}