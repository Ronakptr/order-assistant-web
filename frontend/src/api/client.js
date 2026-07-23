import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const MUTATION_METHODS = new Set(["post", "put", "patch", "delete"]);

function getToken() {
  return localStorage.getItem("token");
}

function dispatchToast(type, message) {
  if (!message) return;

  window.dispatchEvent(
    new CustomEvent("oa-toast", {
      detail: { type, message },
    })
  );
}

function getPath(config = {}) {
  const rawUrl = String(config.url || "");

  try {
    return new URL(rawUrl, API_BASE_URL).pathname;
  } catch {
    return rawUrl;
  }
}

function getEntityLabel(path) {
  if (path.includes("/orders")) return "سفارش";
  if (path.includes("/products")) return "محصول";
  if (path.includes("/customers")) return "مشتری";
  if (path.includes("/messages")) return "پیام";
  if (path.includes("/users")) return "کاربر";

  return "اطلاعات";
}

function successMessage(config = {}) {
  const method = String(config.method || "get").toLowerCase();
  const entity = getEntityLabel(getPath(config));

  if (method === "post") return `${entity} با موفقیت ثبت شد`;
  if (method === "put" || method === "patch") return `${entity} با موفقیت ویرایش شد`;
  if (method === "delete") return `${entity} با موفقیت حذف شد`;

  return "عملیات با موفقیت انجام شد";
}

function errorMessage(config = {}) {
  const method = String(config.method || "get").toLowerCase();
  const entity = getEntityLabel(getPath(config));

  if (method === "post") return `خطا در ثبت ${entity}`;
  if (method === "put" || method === "patch") return `خطا در ویرایش ${entity}`;
  if (method === "delete") return `خطا در حذف ${entity}`;

  return "خطا در انجام عملیات";
}

function shouldToast(config = {}) {
  const method = String(config.method || "get").toLowerCase();
  const path = getPath(config);

  if (!MUTATION_METHODS.has(method)) return false;
  if (path.startsWith("/auth/")) return false;
  if (path.startsWith("/activity-logs")) return false;

  return true;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (shouldToast(response.config)) {
      dispatchToast("success", successMessage(response.config));
    }

    return response;
  },
  (error) => {
    const config = error?.config || {};

    if (shouldToast(config)) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        errorMessage(config);

      dispatchToast("error", detail);
    }

    return Promise.reject(error);
  }
);

export default api;
