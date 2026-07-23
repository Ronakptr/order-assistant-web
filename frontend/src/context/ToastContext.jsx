import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const ToastContext = createContext(null);
const TOAST_DURATION = 3600;
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getUrlPath(input) {
  try {
    if (typeof input === "string") {
      return new URL(input, window.location.origin).pathname;
    }

    if (input?.url) {
      return new URL(input.url, window.location.origin).pathname;
    }
  } catch {
    return "";
  }

  return "";
}

function getRequestMethod(input, init) {
  return String(init?.method || input?.method || "GET").toUpperCase();
}

function shouldAutoToast(path, method) {
  if (!MUTATION_METHODS.has(method)) return false;

  const ignoredPaths = [
    "/auth/login",
    "/auth/register",
    "/auth/me",
    "/activity-logs",
  ];

  return !ignoredPaths.some((ignoredPath) => path.startsWith(ignoredPath));
}

function getEntityLabel(path) {
  if (path.includes("/orders")) return "سفارش";
  if (path.includes("/products")) return "محصول";
  if (path.includes("/customers")) return "مشتری";
  if (path.includes("/messages")) return "پیام";
  if (path.includes("/users")) return "کاربر";
  if (path.includes("/settings")) return "تنظیمات";

  return "اطلاعات";
}

function getSuccessMessage(path, method) {
  const entity = getEntityLabel(path);

  if (method === "POST") return `${entity} با موفقیت ثبت شد`;
  if (method === "PUT" || method === "PATCH") return `${entity} با موفقیت ویرایش شد`;
  if (method === "DELETE") return `${entity} با موفقیت حذف شد`;

  return "عملیات با موفقیت انجام شد";
}

function getErrorMessage(path, method) {
  const entity = getEntityLabel(path);

  if (method === "POST") return `خطا در ثبت ${entity}`;
  if (method === "PUT" || method === "PATCH") return `خطا در ویرایش ${entity}`;
  if (method === "DELETE") return `خطا در حذف ${entity}`;

  return "خطا در انجام عملیات";
}

function isSuccessAlertMessage(message) {
  const text = String(message || "").trim();

  if (!text) return false;

  return [
    "موفق",
    "ثبت شد",
    "ذخیره شد",
    "حذف شد",
    "ویرایش شد",
    "بروزرسانی شد",
    "به‌روزرسانی شد",
  ].some((keyword) => text.includes(keyword));
}

function ToastIcon({ type }) {
  const icons = {
    success: "✓",
    error: "!",
    warning: "!",
    info: "i",
  };

  return <span className="oa-toast__icon">{icons[type] || icons.info}</span>;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    const timer = timersRef.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts((previousToasts) => previousToasts.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = "info", title = "", message = "", duration = TOAST_DURATION } = {}) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const safeMessage = String(message || title || "").trim();

      if (!safeMessage) return id;

      setToasts((previousToasts) => {
        const hasDuplicate = previousToasts.some(
          (toast) => toast.type === type && toast.message === safeMessage
        );

        if (hasDuplicate) {
          return previousToasts;
        }

        return [
          { id, type, title, message: safeMessage },
          ...previousToasts,
        ].slice(0, 5);
      });

      if (duration > 0) {
        const timer = setTimeout(() => removeToast(id), duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [removeToast]
  );

  const toast = useMemo(
    () => ({
      show: addToast,
      success: (message, options = {}) => addToast({ ...options, type: "success", message }),
      error: (message, options = {}) => addToast({ ...options, type: "error", message }),
      warning: (message, options = {}) => addToast({ ...options, type: "warning", message }),
      info: (message, options = {}) => addToast({ ...options, type: "info", message }),
      remove: removeToast,
    }),
    [addToast, removeToast]
  );

  useEffect(() => {
    function handleToastEvent(event) {
      addToast(event.detail || {});
    }

    window.addEventListener("oa-toast", handleToastEvent);
    window.addEventListener("order-assistant-toast", handleToastEvent);

    return () => {
      window.removeEventListener("oa-toast", handleToastEvent);
      window.removeEventListener("order-assistant-toast", handleToastEvent);
    };
  }, [addToast]);

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (input, init = {}) => {
      const method = getRequestMethod(input, init);
      const path = getUrlPath(input);
      const autoToast = shouldAutoToast(path, method);

      try {
        const response = await originalFetch(input, init);

        if (autoToast) {
          addToast({
            type: response.ok ? "success" : "error",
            message: response.ok
              ? getSuccessMessage(path, method)
              : getErrorMessage(path, method),
          });
        }

        return response;
      } catch (error) {
        if (autoToast) {
          addToast({ type: "error", message: getErrorMessage(path, method) });
        }

        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [addToast]);

  useEffect(() => {
    const originalAlert = window.alert;

    window.alert = (message) => {
      if (isSuccessAlertMessage(message)) {
        addToast({ type: "success", message: String(message || "") });
        return;
      }

      originalAlert(message);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [addToast]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}

      <div className="oa-toast-stack" role="status" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className={`oa-toast oa-toast--${item.type}`}>
            <ToastIcon type={item.type} />
            <div className="oa-toast__content">
              {item.title && <strong>{item.title}</strong>}
              <span>{item.message}</span>
            </div>
            <button
              type="button"
              className="oa-toast__close"
              onClick={() => removeToast(item.id)}
              aria-label="بستن اعلان"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
