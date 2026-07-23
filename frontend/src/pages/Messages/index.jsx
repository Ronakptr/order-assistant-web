import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Messages.css";
import { createMessage, deleteMessage, fetchMessages, updateMessage } from "../../api/messages";
import { fetchMessageSettings, templatesToRuntimeMap } from "../../api/messageSettings";
import { fetchOrders } from "../../api/orders";
import { formatAppDateOrText, getCurrentInputDate, useDateSettingsVersion } from "../../utils/appDate";

const MESSAGES_STORAGE_KEY = "order_assistant_messages";
const ORDERS_STORAGE_KEY = "order_assistant_orders";

function formatMessageDate(value) {
  return value ? formatAppDateOrText(value) : "-";
}


const STATUS_CONFIG = {
  "ارسال شده": { cls: "sent", label: "ارسال شده" },
  "پیش نویس": { cls: "draft", label: "پیش نویس" },
  "عدم ارسال": { cls: "failed", label: "عدم ارسال" },
};

const MESSAGE_TEMPLATES = {
  صورتحساب: {
    channel: "پیامک",
    buildText: ({ order, form }) => {
      const total = order?.total || "ثبت نشده";
      const code = order?.code || form.orderCode || "-";
      const customer = order?.customer || form.customer || "مشتری گرامی";

      return `${customer} عزیز
صورتحساب سفارش شما با کد ${code} آماده است.
مبلغ کل سفارش: ${total}
لطفاً جهت هماهنگی پرداخت و تحویل با واحد فروش در ارتباط باشید.`;
    },
  },

  "اطلاعات بانک نمونه 1": {
    channel: "پیامک",
    buildText: ({ order, form }) => {
      const customer = order?.customer || form.customer || "مشتری گرامی";

      return `${customer} عزیز
جهت واریز مبلغ سفارش، لطفاً از اطلاعات بانکی زیر استفاده کنید:
شماره کارت: ۶۱۰۴-۳۳۷۷-۰۰۰۰-۰۰۰۰
شماره شبا: IR00 0000 0000 0000 0000 0000 00
به نام: فارس برش`;
    },
  },

  "اطلاعات بانکی نمونه 2": {
    channel: "پیامک",
    buildText: ({ order, form }) => {
      const code = order?.code || form.orderCode || "-";

      return `اطلاعات پرداخت سفارش ${code}
بانک: ملت
شماره حساب: ۱۲۳۴۵۶۷۸۹
شماره کارت: ۶۱۰۴-۰۰۰۰-۰۰۰۰-۰۰۰۰
پس از واریز، لطفاً تصویر رسید را ارسال کنید.`;
    },
  },

  آدرس: {
    channel: "پیامک",
    buildText: () =>
      `آدرس مجموعه:
شیراز، بلوار امیرکبیر
آهن آلات و برشکاری فارس برش
لطفاً قبل از مراجعه، زمان حضور را هماهنگ بفرمایید.`,
  },

  "پیام دلخواه": {
    channel: "پیامک",
    buildText: () => "",
  },
};

const FALLBACK_MESSAGES = [
  {
    uid: 1,
    id: "MSG-0001",
    orderCode: "ORD-0001",
    invoiceCode: "ORD-0001",
    customer: "رضا پناهی دوست",
    phone: "۰۹۱۲۱۲۳۴۵۶۷",
    email: "reza@example.com",
    items: [
      {
        name: "والپست U",
        quantity: "۲ عدد",
        unitPrice: "۱۲,۰۰۰,۰۰۰ تومان",
        total: "۲۴,۰۰۰,۰۰۰ تومان",
      },
      {
        name: "گیره و قلاب",
        quantity: "۴ عدد",
        unitPrice: "۳۷۵,۰۰۰ تومان",
        total: "۱,۵۰۰,۰۰۰ تومان",
      },
    ],
    status: "ارسال شده",
    template: "صورتحساب",
    channel: "پیامک",
    date: "۱۴۰۴/۰۸/۰۱",
    preview: "صورتحساب سفارش شما آماده است.",
  },
  {
    uid: 2,
    id: "MSG-0002",
    orderCode: "ORD-0002",
    invoiceCode: "ORD-0002",
    customer: "سارا احمدی",
    phone: "۰۹۱۲۰۰۰۰۰۰۰",
    email: "sara@example.com",
    items: [
      {
        name: "میلگرد بستر",
        quantity: "۱۲۰ متر",
        unitPrice: "۱۵۰,۰۰۰ تومان",
        total: "۱۸,۰۰۰,۰۰۰ تومان",
      },
    ],
    status: "ارسال شده",
    template: "اطلاعات بانک نمونه 1",
    channel: "ایمیل",
    date: "۱۴۰۴/۰۸/۰۲",
    preview: "اطلاعات بانکی جهت واریز مبلغ سفارش.",
  },
];

const FALLBACK_ORDERS = [
  {
    uid: 1,
    code: "ORD-0001",
    customer: "رضا پناهی دوست",
    phone: "۰۹۱۲۱۲۳۴۵۶۷",
    email: "reza@example.com",
    total: "۲۵,۵۰۰,۰۰۰ تومان",
    status: "پرداخت شده",
    date: "۱۴۰۴/۰۸/۰۱ - ۱۲:۳۰",
    items: [
      {
        name: "والپست U",
        quantity: "۲ عدد",
        unitPrice: "۱۲,۰۰۰,۰۰۰ تومان",
        total: "۲۴,۰۰۰,۰۰۰ تومان",
      },
      {
        name: "گیره و قلاب",
        quantity: "۴ عدد",
        unitPrice: "۳۷۵,۰۰۰ تومان",
        total: "۱,۵۰۰,۰۰۰ تومان",
      },
    ],
  },
  {
    uid: 2,
    code: "ORD-0002",
    customer: "سارا احمدی",
    phone: "۰۹۱۲۰۰۰۰۰۰۰",
    email: "sara@example.com",
    total: "۱۸,۰۰۰,۰۰۰ تومان",
    status: "در انتظار پرداخت",
    date: "۱۴۰۴/۰۸/۰۲ - ۱۰:۱۵",
    items: [
      {
        name: "میلگرد بستر",
        quantity: "۱۲۰ متر",
        unitPrice: "۱۵۰,۰۰۰ تومان",
        total: "۱۸,۰۰۰,۰۰۰ تومان",
      },
    ],
  },
];

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeMessageStatus(status) {
  const value = normalizeText(status)
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .toLowerCase();

  if (
    value === "sent" ||
    value === "send" ||
    value.includes("ارسال شده") ||
    value.includes("sent")
  ) {
    return "ارسال شده";
  }

  if (
    value === "failed" ||
    value === "failure" ||
    value.includes("عدم") ||
    value.includes("ناموفق") ||
    value.includes("failed")
  ) {
    return "عدم ارسال";
  }

  return "پیش نویس";
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
    uid: order?.uid || order?.id || code,
    code,
    customer:
      order?.customer ||
      order?.customerName ||
      order?.customer_name ||
      order?.clientName ||
      order?.client_name ||
      order?.name ||
      "مشتری جدید",
    phone:
      order?.phone ||
      order?.customerPhone ||
      order?.customer_phone ||
      order?.mobile ||
      order?.phoneNumber ||
      "",
    email: order?.email || order?.customerEmail || order?.customer_email || order?.emailAddress || "",
    total: order?.total || order?.totalPrice || order?.total_price || order?.grandTotal || order?.total_amount || "",
    status: order?.status || order?.order_status || "",
    date: order?.date || order?.createdAt || order?.created_at || order?.order_date || "",
    items: Array.isArray(order?.items) ? order.items : [],
  };
}

function normalizeMessage(message, index) {
  const backendId = message?.uid ?? message?.id ?? message?.message_id ?? Date.now() + index;
  const messageCode =
    message?.message_code ||
    message?.messageCode ||
    message?.code ||
    (typeof message?.id === "string" && message.id.startsWith("MSG-") ? message.id : "") ||
    `MSG-${String(index + 1).padStart(4, "0")}`;

  return {
    ...message,
    uid: backendId,
    id: messageCode,
    orderCode: message?.orderCode || message?.order_code || message?.code || "",
    invoiceCode:
      message?.invoiceCode ||
      message?.invoice_code ||
      message?.fax ||
      message?.orderCode ||
      message?.order_code ||
      "",
    customer:
      message?.customer ||
      message?.customer_name ||
      message?.name ||
      "مشتری جدید",
    phone: message?.phone || message?.customer_phone || message?.mobile || "",
    email: message?.email || message?.customer_email || "",
    items: Array.isArray(message?.items) ? message.items : [],
    status: normalizeMessageStatus(message?.status),
    template: message?.template || message?.message_type || message?.type || "صورتحساب",
    channel: message?.channel || message?.send_channel || "پیامک",
    date:
      message?.date ||
      message?.createdAt ||
      message?.created_at ||
      formatAppDateOrText(getCurrentInputDate()),
    dateInputValue: message?.dateInputValue || message?.date_input_value || "",
    dateRaw:
      message?.dateInputValue ||
      message?.date_input_value ||
      message?.date ||
      message?.createdAt ||
      message?.created_at ||
      getCurrentInputDate(),
    preview: message?.preview || message?.body || message?.content || message?.message_text || "",
  };
}

function loadOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);

    if (!raw) return FALLBACK_ORDERS;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return FALLBACK_ORDERS;

    return parsed.map(normalizeOrder);
  } catch {
    return FALLBACK_ORDERS;
  }
}

function loadMessages() {
  try {
    const raw = localStorage.getItem(MESSAGES_STORAGE_KEY);

    if (!raw) {
      localStorage.setItem(
        MESSAGES_STORAGE_KEY,
        JSON.stringify(FALLBACK_MESSAGES)
      );

      return FALLBACK_MESSAGES;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return FALLBACK_MESSAGES;

    return parsed.map(normalizeMessage);
  } catch {
    return FALLBACK_MESSAGES;
  }
}

function saveMessages(messages) {
  localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));

  window.dispatchEvent(
    new CustomEvent("order-assistant-messages-updated", {
      detail: messages,
    })
  );
}

function createMessageId(messages) {
  const nextNumber = messages.length + 1;
  return `MSG-${String(nextNumber).padStart(4, "0")}`;
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13.7 5.3 18.7 10.3" />
      <path d="M4.5 19.5h4.2L19.2 9a2.35 2.35 0 0 0 0-3.3l-.9-.9a2.35 2.35 0 0 0-3.3 0L4.5 15.3v4.2Z" />
    </svg>
  );
}

function SortIcon({ active, dir }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? "sort-icon is-active" : "sort-icon"}
      aria-hidden="true"
    >
      {active && dir === "asc" && <polyline points="18 15 12 9 6 15" />}
      {active && dir === "desc" && <polyline points="6 9 12 15 18 9" />}
      {!active && (
        <>
          <polyline points="18 15 12 9 6 15" />
          <polyline points="6 17 12 23 18 17" />
        </>
      )}
    </svg>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["پیش نویس"];

  return (
    <span
      className={`msg-badge msg-badge--${cfg.cls}`}
      title="وضعیت پیام فقط از فرم ارسال/ویرایش تغییر می‌کند"
    >
      {cfg.label}
    </span>
  );
}

function RowActionsMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className={`row-actions ${open ? "is-open" : ""}`} ref={ref}>
      <button
        type="button"
        className="edit-btn"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        title="گزینه‌های پیام"
        aria-label="گزینه‌های پیام"
      >
        <EditIcon />
      </button>

      {open && (
        <div
          className="row-actions__menu"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="row-actions__item"
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
          >
            ویرایش پیام
          </button>

          <button
            type="button"
            className="row-actions__item row-actions__item--danger"
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
          >
            حذف پیام
          </button>
        </div>
      )}
    </div>
  );
}

function ItemsPopup({ message, onClose }) {
  if (!message) return null;

  const items = Array.isArray(message.items) ? message.items : [];

  return (
    <div className="msg-modal-backdrop" onClick={onClose}>
      <div className="msg-items-modal" onClick={(event) => event.stopPropagation()}>
        <div className="msg-items-modal__header">
          <div>
            <h3>اقلام سفارش</h3>
            <p>
              سفارش {message.orderCode || "-"} - {message.customer || "-"}
            </p>
          </div>

          <button
            type="button"
            className="msg-modal-close"
            onClick={onClose}
            aria-label="بستن"
          >
            ×
          </button>
        </div>

        <div className="msg-items-list">
          {items.length === 0 ? (
            <div className="msg-items-empty">موردی برای نمایش وجود ندارد.</div>
          ) : (
            items.map((item, index) => (
              <div className="msg-item-row" key={`${item.name || item.productName}-${index}`}>
                <div className="msg-item-index">{index + 1}</div>

                <div className="msg-item-main">
                  <strong>{item.name || item.productName || "-"}</strong>
                  <span>
                    تعداد/مقدار:{" "}
                    {item.quantity ||
                      item.countDisplay ||
                      item.weight ||
                      item.length ||
                      "-"}
                  </span>
                </div>

                <div className="msg-item-price">
                  <span>قیمت واحد: {item.unitPrice || "-"}</span>
                  <strong>{item.total || "-"}</strong>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteMessageConfirmModal({ message, onCancel, onConfirm }) {
  if (!message) return null;

  return (
    <div className="msg-delete-confirm-layer" onClick={onCancel}>
      <div
        className="msg-delete-confirm-box"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="msg-delete-confirm-icon">×</div>

        <p className="msg-delete-confirm-text">
          آیا از حذف پیام <strong>{message.id || "انتخاب‌شده"}</strong> مطمئن هستید؟
        </p>

        <div className="msg-delete-confirm-actions">
          <button
            type="button"
            className="msg-delete-confirm-cancel"
            onClick={onCancel}
          >
            خیر
          </button>

          <button
            type="button"
            className="msg-delete-confirm-submit"
            onClick={onConfirm}
          >
            بله، حذف شود
          </button>
        </div>
      </div>
    </div>
  );
}

function NewMessageForm({
  orders,
  initialData,
  mode = "create",
  onClose,
  onSubmit,
  messageTemplates = MESSAGE_TEMPLATES,
}) {
  const isEdit = mode === "edit";

  const initialOrderCode =
    initialData?.orderCode || initialData?.code || orders[0]?.code || "";

  const initialOrder =
    orders.find((order) => String(order.code) === String(initialOrderCode)) ||
    orders[0] ||
    null;

  const [form, setForm] = useState(() => ({
    orderCode: initialOrderCode,
    customer: initialData?.customer || initialOrder?.customer || "",
    phone: initialData?.phone || initialOrder?.phone || "",
    email: initialData?.email || initialOrder?.email || "",
    template: initialData?.template || "صورتحساب",
    channel:
      initialData?.channel ||
      messageTemplates[initialData?.template || "صورتحساب"]?.channel ||
      "پیامک",
    preview: initialData?.preview || "",
    items: initialData?.items || initialOrder?.items || [],
  }));

  const [hint, setHint] = useState("");

  const selectedOrder = useMemo(
    () => orders.find((order) => String(order.code) === String(form.orderCode)),
    [orders, form.orderCode]
  );

  const buildTemplateText = (
    templateName,
    nextForm = form,
    order = selectedOrder
  ) => {
    const template = messageTemplates[templateName];

    if (!template) return "";

    return template.buildText({
      order,
      form: nextForm,
      items: order?.items || nextForm.items || [],
    });
  };

  const applyOrder = (orderCode) => {
    const order = orders.find((item) => String(item.code) === String(orderCode));

    const nextForm = {
      ...form,
      orderCode,
      customer: order?.customer || "",
      phone: order?.phone || "",
      email: order?.email || "",
      items: order?.items || [],
    };

    nextForm.preview = buildTemplateText(nextForm.template, nextForm, order);

    setForm(nextForm);

    if (order) {
      setHint(
        `سفارش انتخاب شد: ${order.customer || "-"} - ${
          order.items?.length || 0
        } قلم کالا`
      );
    } else {
      setHint("سفارش انتخاب‌شده پیدا نشد.");
    }
  };

  const applyTemplate = (templateName) => {
    const template = messageTemplates[templateName];

    const nextForm = {
      ...form,
      template: templateName,
      channel: template?.channel || form.channel,
    };

    nextForm.preview =
      templateName === "پیام دلخواه"
        ? ""
        : buildTemplateText(templateName, nextForm, selectedOrder);

    setForm(nextForm);
  };

  const handleSubmit = (action) => {
    if (!form.orderCode) {
      alert("لطفاً ابتدا سفارش را انتخاب کنید.");
      return;
    }

    onSubmit(form, action);
  };

  useEffect(() => {
    if (!initialData?.preview && form.template !== "پیام دلخواه") {
      setForm((previous) => ({
        ...previous,
        preview: buildTemplateText(previous.template, previous, selectedOrder),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="msg-form-overlay">
      <div className="msg-form">
        <div className="msg-form__top">
          <h2 className="msg-form__title">
            {isEdit ? "ویرایش پیام" : "ارسال پیام جدید"}
          </h2>

          <button type="button" className="msg-back-btn" onClick={onClose}>
            بازگشت
          </button>
        </div>

        <div className="msg-form__body">
          <div className="msg-form__section-title">مشخصات مشتری</div>

          <div className="msg-form__row msg-form__row--three">
            <div className="msg-form__field">
              <label>انتخاب سفارش</label>
              <select
                className="msg-select"
                value={form.orderCode}
                onChange={(event) => applyOrder(event.target.value)}
              >
                <option value="">انتخاب سفارش</option>
                {orders.map((order) => (
                  <option key={order.code} value={order.code}>
                    {order.code} - {order.customer}
                  </option>
                ))}
              </select>
            </div>

            <div className="msg-form__field">
              <label>شماره تماس</label>
              <input
                className="msg-input"
                value={form.phone}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    phone: event.target.value,
                  }))
                }
                placeholder="شماره تماس"
              />
            </div>

            <div className="msg-form__field">
              <label>آدرس ایمیل</label>
              <input
                className="msg-input"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    email: event.target.value,
                  }))
                }
                placeholder="آدرس ایمیل"
              />
            </div>
          </div>

          {hint && <div className="msg-form__hint">{hint}</div>}

          <div className="msg-form__section-title">محتوای پیام</div>

          <div className="msg-form__row msg-form__row--two">
            <div className="msg-form__field">
              <label>محتوای پیام</label>
              <select
                className="msg-select"
                value={form.template}
                onChange={(event) => applyTemplate(event.target.value)}
              >
                {Object.keys(messageTemplates).map((templateName) => (
                  <option key={templateName} value={templateName}>
                    {templateName}
                  </option>
                ))}
              </select>
            </div>

            <div className="msg-form__field">
              <label>کانال ارسال</label>
              <select
                className="msg-select"
                value={form.channel}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    channel: event.target.value,
                  }))
                }
              >
                <option value="پیامک">پیامک</option>
                <option value="پیامرسان">پیامرسان</option>
                <option value="ایمیل">ایمیل</option>
              </select>
            </div>
          </div>

          <div className="msg-form__section-title">پیش نمایش</div>

          <textarea
            className="msg-textarea"
            value={form.preview}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                preview: event.target.value,
              }))
            }
            placeholder="متن پیام..."
          />
        </div>

        <div className="msg-form__actions">
          <button
            type="button"
            className="msg-btn msg-btn--send"
            onClick={() => handleSubmit("send")}
          >
            ارسال پیام
          </button>

          <button
            type="button"
            className="msg-btn msg-btn--save"
            onClick={() => handleSubmit("save")}
          >
            ذخیره تغییرات
          </button>

          <button
            type="button"
            className="msg-btn msg-btn--cancel"
            onClick={onClose}
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Messages() {
  const dateSettingsVersion = useDateSettingsVersion();
  void dateSettingsVersion;
  const navigate = useNavigate();
  const location = useLocation();

  const cameFromDashboard = location.state?.fromDashboard === true;
  const isNewMessageRoute = location.pathname === "/messages/new";

  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageTemplates, setMessageTemplates] = useState(MESSAGE_TEMPLATES);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [itemsPopupMessage, setItemsPopupMessage] = useState(null);
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState(null);

  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  const reloadData = async () => {
    try {
      const [ordersData, messagesData] = await Promise.all([
        fetchOrders(),
        fetchMessages(),
      ]);
      setOrders(Array.isArray(ordersData) ? ordersData.map(normalizeOrder) : []);
      setMessages(Array.isArray(messagesData) ? messagesData.map(normalizeMessage) : []);
    } catch (error) {
      console.error(error);
      alert("خطا در دریافت پیام‌ها از سرور");
    }

    try {
      const messageSettings = await fetchMessageSettings();
      const runtimeTemplates = templatesToRuntimeMap(messageSettings.templates || []);
      setMessageTemplates(
        Object.keys(runtimeTemplates).length
          ? { ...MESSAGE_TEMPLATES, ...runtimeTemplates }
          : MESSAGE_TEMPLATES
      );
    } catch (error) {
      console.warn("Message settings are not available yet. Static templates will be used.", error);
      setMessageTemplates(MESSAGE_TEMPLATES);
    }
  };

  const columns = [
    { key: "id", label: "کد پیام" },
    { key: "orderCode", label: "کد سفارش" },
    { key: "customer", label: "نام مشتری" },
    { key: "items", label: "اقلام سفارش" },
    { key: "status", label: "وضعیت ارسال پیام" },
    { key: "template", label: "محتوای پیام" },
    { key: "channel", label: "کانال ارسال" },
    { key: "date", label: "تاریخ" },
  ];

  useEffect(() => {
    if (isNewMessageRoute || location.state?.openNewMessage) {
      setEditingMessage(null);
      setShowForm(true);
    }
  }, [isNewMessageRoute, location.state]);

  useEffect(() => {
    reloadData();

    const refresh = () => {
      reloadData();
    };

    window.addEventListener("focus", refresh);
    window.addEventListener("order-assistant-messages-updated", refresh);
    window.addEventListener("order-assistant-date-settings-updated", refresh);
    window.addEventListener("order-assistant-message-settings-updated", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("order-assistant-messages-updated", refresh);
      window.removeEventListener("order-assistant-date-settings-updated", refresh);
      window.removeEventListener("order-assistant-message-settings-updated", refresh);
    };
  }, []);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }

    setCurrentPage(1);
  };

  const filteredMessages = useMemo(() => {
    const query = search.trim();

    return [...messages]
      .filter(
        (message) =>
          !query ||
          normalizeText(message.customer).includes(query) ||
          normalizeText(message.id).includes(query) ||
          normalizeText(message.orderCode).includes(query) ||
          normalizeText(message.status).includes(query) ||
          normalizeText(message.template).includes(query) ||
          normalizeText(message.channel).includes(query)
      )
      .sort((a, b) => {
        if (!sortKey) return 0;

        const aValue =
          sortKey === "items"
            ? String(a.items?.length || 0)
            : String(a[sortKey] ?? "");

        const bValue =
          sortKey === "items"
            ? String(b.items?.length || 0)
            : String(b[sortKey] ?? "");

        const compare = aValue.localeCompare(bValue, "fa", {
          numeric: true,
        });

        return sortDir === "asc" ? compare : -compare;
      });
  }, [messages, search, sortKey, sortDir]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMessages.length / rowsPerPage)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedMessages = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * rowsPerPage;

    return filteredMessages.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredMessages, safeCurrentPage, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const openCreateForm = () => {
    setEditingMessage(null);
    setShowForm(true);
  };

  const openEditForm = (message) => {
    setEditingMessage(message);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingMessage(null);

    if (cameFromDashboard) {
      navigate("/dashboard");
      return;
    }

    if (isNewMessageRoute) {
      navigate("/messages");
    }
  };

  const handleDeleteMessage = (message) => {
    setDeleteConfirmMessage(message);
  };

  const confirmDeleteMessage = async () => {
    if (!deleteConfirmMessage) return;

    try {
      await deleteMessage(deleteConfirmMessage.uid);
      setDeleteConfirmMessage(null);
      await reloadData();
      setCurrentPage(1);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.detail || "خطا در حذف پیام");
    }
  };

  const handleSubmitForm = async (form, action) => {
    const selectedOrder = orders.find(
      (order) => String(order.code) === String(form.orderCode)
    );

    const nextStatus = action === "send" ? "ارسال شده" : "پیش نویس";

    const payload = {
      ...(editingMessage || {}),
      orderCode: form.orderCode,
      invoiceCode: form.orderCode,
      customer: selectedOrder?.customer || form.customer || "مشتری جدید",
      phone: form.phone,
      email: form.email,
      items: form.items || selectedOrder?.items || [],
      status: nextStatus,
      template: form.template,
      channel: form.channel,
      preview: form.preview,
      date: formatAppDateOrText(getCurrentInputDate()),
      dateInputValue: getCurrentInputDate(),
    };

    try {
      if (editingMessage) {
        await updateMessage(editingMessage.uid, payload);
      } else {
        await createMessage(payload);
      }

      await reloadData();
      closeForm();
      setCurrentPage(1);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.detail || "خطا در ذخیره پیام");
    }
  };

  if (showForm) {
    return (
      <NewMessageForm
        orders={orders}
        mode={editingMessage ? "edit" : "create"}
        initialData={editingMessage}
        onClose={closeForm}
        onSubmit={handleSubmitForm}
        messageTemplates={messageTemplates}
      />
    );
  }

  return (
    <div className="messages-page">
      <div className="messages-header">
        <h1 className="messages-title">مدیریت پیام ها</h1>

        <div className="messages-header__actions">
          <button type="button" className="add-btn" onClick={openCreateForm}>
            <PlusIcon />
            <span>پیام جدید</span>
          </button>

          <label className="messages-search">
            <SearchIcon />

            <input
              className="search-input"
              type="search"
              placeholder="جستجو..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
            />
          </label>
        </div>
      </div>

      <div className="messages-table-wrap">
        <table className="messages-table">
          <colgroup>
            <col className="col-edit" />
            <col className="col-id" />
            <col className="col-order" />
            <col className="col-customer" />
            <col className="col-items" />
            <col className="col-status" />
            <col className="col-template" />
            <col className="col-channel" />
            <col className="col-date" />
          </colgroup>

          <thead>
            <tr>
              <th className="mt-head"></th>

              {columns.map((column) => (
                <th
                  key={column.key}
                  className="mt-head mt-sortable"
                  onClick={() => handleSort(column.key)}
                >
                  <span className="mt-head-inner">
                    <SortIcon active={sortKey === column.key} dir={sortDir} />
                    {column.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {paginatedMessages.length === 0 ? (
              <tr>
                <td className="mt-empty" colSpan={9}>
                  پیامی برای نمایش وجود ندارد.
                </td>
              </tr>
            ) : (
              paginatedMessages.map((message, index) => (
                <tr
                  key={message.uid}
                  className={
                    index < paginatedMessages.length - 1
                      ? "mt-row mt-row--border"
                      : "mt-row"
                  }
                  onDoubleClick={() => openEditForm(message)}
                  title="برای ویرایش پیام دوبار کلیک کنید"
                >
                  <td className="mt-cell mt-cell--edit">
                    <RowActionsMenu
                      onEdit={() => openEditForm(message)}
                      onDelete={() => handleDeleteMessage(message)}
                    />
                  </td>

                  <td className="mt-cell mt-id">{message.id}</td>
                  <td className="mt-cell">{message.orderCode || "-"}</td>
                  <td className="mt-cell">{message.customer || "-"}</td>

                  <td className="mt-cell mt-cell--items">
                    <button
                      type="button"
                      className="items-dots-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        setItemsPopupMessage(message);
                      }}
                      title="نمایش اقلام سفارش"
                    >
                      ...
                    </button>
                  </td>

                  <td className="mt-cell">
                    <StatusBadge status={message.status} />
                  </td>

                  <td className="mt-cell">{message.template || "-"}</td>
                  <td className="mt-cell">{message.channel || "-"}</td>
                  <td className="mt-cell">{formatMessageDate(message.dateRaw || message.date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="messages-pagination">
        <div className="pagination-info">
          <span>
            نمایش صفحه {safeCurrentPage} از {totalPages}
          </span>

          <span className="pagination-total">
            تعداد کل: {filteredMessages.length}
          </span>
        </div>

        <div className="pagination-controls">
          <label className="rows-per-page">
            <span>تعداد در صفحه:</span>

            <select
              value={rowsPerPage}
              onChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setCurrentPage(1);
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
            className="pagination-btn"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={safeCurrentPage === 1}
          >
            قبلی
          </button>

          <button
            type="button"
            className="pagination-btn"
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
            disabled={safeCurrentPage === totalPages}
          >
            بعدی
          </button>
        </div>
      </div>

      <ItemsPopup
        message={itemsPopupMessage}
        onClose={() => setItemsPopupMessage(null)}
      />

      <DeleteMessageConfirmModal
        message={deleteConfirmMessage}
        onCancel={() => setDeleteConfirmMessage(null)}
        onConfirm={confirmDeleteMessage}
      />
    </div>
  );
}