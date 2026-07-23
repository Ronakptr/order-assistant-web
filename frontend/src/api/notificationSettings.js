import { useEffect, useMemo, useState } from "react";
import api from "./client";

export const NOTIFICATION_CATEGORIES = [
  "product_inventory",
  "product_pricing",
  "orders_attention",
  "messages_attention",
  "customers_attention",
  "backup",
  "account_security",
  "admin_management",
  "invoice_settings",
  "accounting_sync",
];

export const NOTIFICATION_CATEGORY_LABELS = {
  product_inventory: "موجودی محصولات",
  product_pricing: "قیمت محصولات",
  orders_attention: "سفارش‌ها",
  messages_attention: "پیام‌ها",
  customers_attention: "مشتریان",
  backup: "پشتیبان‌گیری",
  account_security: "امنیت حساب کاربری",
  admin_management: "مدیریت سیستم",
  invoice_settings: "تنظیمات فاکتور",
  accounting_sync: "همگام‌سازی حسابداری",
};

export const NOTIFICATION_ROLES = ["admin", "sales_manager", "sales", "accountant"];

export const NOTIFICATION_ROLE_LABELS = {
  admin: "مدیر",
  sales_manager: "سرپرست فروش",
  sales: "فروشنده",
  accountant: "حسابدار",
};

export function defaultNotificationRoleCategories() {
  const all = Object.fromEntries(NOTIFICATION_CATEGORIES.map((key) => [key, true]));

  return {
    admin: all,
    sales_manager: {
      product_inventory: true,
      product_pricing: true,
      orders_attention: true,
      messages_attention: true,
      customers_attention: true,
      backup: false,
      account_security: true,
      admin_management: false,
      invoice_settings: true,
      accounting_sync: false,
    },
    sales: {
      product_inventory: true,
      product_pricing: false,
      orders_attention: true,
      messages_attention: true,
      customers_attention: true,
      backup: false,
      account_security: true,
      admin_management: false,
      invoice_settings: false,
      accounting_sync: false,
    },
    accountant: {
      product_inventory: false,
      product_pricing: false,
      orders_attention: true,
      messages_attention: false,
      customers_attention: false,
      backup: false,
      account_security: true,
      admin_management: false,
      invoice_settings: true,
      accounting_sync: true,
    },
  };
}

export function normalizeNotificationSettings(settings = {}) {
  const defaults = defaultNotificationRoleCategories();
  const savedMatrix = settings?.role_categories || settings?.roleCategories || {};
  const roleCategories = {};

  NOTIFICATION_ROLES.forEach((role) => {
    roleCategories[role] = {};

    NOTIFICATION_CATEGORIES.forEach((category) => {
      roleCategories[role][category] = Boolean(
        savedMatrix?.[role]?.[category] ?? defaults?.[role]?.[category] ?? false
      );
    });
  });

  return {
    categories: NOTIFICATION_CATEGORIES,
    category_labels: NOTIFICATION_CATEGORY_LABELS,
    categoryLabels: NOTIFICATION_CATEGORY_LABELS,
    roles: NOTIFICATION_ROLES,
    role_labels: NOTIFICATION_ROLE_LABELS,
    roleLabels: NOTIFICATION_ROLE_LABELS,
    role_categories: roleCategories,
    roleCategories,
  };
}

export async function fetchNotificationSettings() {
  const response = await api.get("/settings/notifications");
  return normalizeNotificationSettings(response.data || {});
}

export async function saveNotificationSettings(settings) {
  const normalized = normalizeNotificationSettings(settings);
  const response = await api.put("/settings/notifications", normalized);

  window.dispatchEvent(new CustomEvent("order-assistant-notification-settings-updated"));

  return normalizeNotificationSettings(response.data || normalized);
}

export function normalizeRoleKey(role) {
  const value = String(role || "").trim().toLowerCase();

  if (["admin", "administrator", "owner", "manager", "مدیر", "مدير", "ادمین", "ادمين"].includes(value)) {
    return "admin";
  }

  if (["sales_manager", "sales-manager", "sales manager", "سرپرست فروش"].includes(value)) {
    return "sales_manager";
  }

  if (["accountant", "accounting", "حسابدار"].includes(value)) {
    return "accountant";
  }

  return "sales";
}

export function alertTypeToCategory(alertType) {
  const type = String(alertType || "").toLowerCase();

  if (type.includes("stock") || type.includes("inventory") || type === "low_stock" || type === "out_of_stock") {
    return "product_inventory";
  }

  if (type.includes("price") || type.includes("pricing")) {
    return "product_pricing";
  }

  if (type.includes("order") || type.includes("invoice") || type.includes("payment") || type.includes("unpaid")) {
    return "orders_attention";
  }

  if (type.includes("message") || type.includes("sms") || type.includes("notification")) {
    return "messages_attention";
  }

  if (type.includes("customer") || type.includes("buyer")) {
    return "customers_attention";
  }

  if (type.includes("backup")) {
    return "backup";
  }

  if (type.includes("security") || type.includes("password") || type.includes("account")) {
    return "account_security";
  }

  if (type.includes("admin") || type.includes("user") || type.includes("system")) {
    return "admin_management";
  }

  if (type.includes("invoice_settings")) {
    return "invoice_settings";
  }

  if (type.includes("accounting") || type.includes("sync") || type.includes("asan") || type.includes("soren")) {
    return "accounting_sync";
  }

  return "orders_attention";
}

export function isAlertAllowedForRole(settings, role, alertType) {
  const normalized = normalizeNotificationSettings(settings || {});
  const roleKey = normalizeRoleKey(role);
  const category = alertTypeToCategory(alertType);

  return Boolean(normalized.role_categories?.[roleKey]?.[category]);
}

export function useNotificationSettingsVersion() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setVersion((current) => current + 1);

    window.addEventListener("order-assistant-notification-settings-updated", refresh);
    window.addEventListener("oa-auth-changed", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("order-assistant-notification-settings-updated", refresh);
      window.removeEventListener("oa-auth-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return version;
}

export function useNotificationSettings() {
  const version = useNotificationSettingsVersion();
  const [settings, setSettings] = useState(() => normalizeNotificationSettings());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    fetchNotificationSettings()
      .then((data) => {
        if (alive) setSettings(data);
      })
      .catch(() => {
        if (alive) setSettings(normalizeNotificationSettings());
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [version]);

  return useMemo(() => ({ settings, loading, version }), [settings, loading, version]);
}
