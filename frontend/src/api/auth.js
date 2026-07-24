const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export function getToken() {
  return localStorage.getItem("token");
}

function safeJsonParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function getStoredUser() {
  const currentUser = safeJsonParse(localStorage.getItem("currentUser"), null);

  if (currentUser && typeof currentUser === "object") return currentUser;

  const user = safeJsonParse(localStorage.getItem("user"), null);

  if (user && typeof user === "object") return user;

  return null;
}

export function authHeaders() {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function dispatchAuthChanged() {
  window.dispatchEvent(new Event("oa-auth-changed"));
}

function logLogoutBeforeClear() {
  const token = getToken();

  if (!token) return;

  fetch(`${API_BASE_URL}/activity-logs/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    keepalive: true,
  }).catch(() => null);
}

export function saveAuthSession(data) {
  const token = data?.access_token || data?.token || "";
  const user = data?.user || data?.current_user || data?.currentUser || null;

  if (token) {
    localStorage.setItem("token", token);
  }

  if (user) {
    localStorage.setItem("currentUser", JSON.stringify(user));
    localStorage.setItem("user", JSON.stringify(user));

    if (user.username) localStorage.setItem("username", user.username);
    if (user.role) localStorage.setItem("role", user.role);
  }

  dispatchAuthChanged();

  return user;
}

export function clearAuthSession() {
  logLogoutBeforeClear();

  localStorage.removeItem("token");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("user");
  localStorage.removeItem("username");
  localStorage.removeItem("role");

  dispatchAuthChanged();
}

async function readApiError(response, fallbackMessage) {
  const error = await response.json().catch(() => null);
  return error?.detail || fallbackMessage;
}

export async function loginUser(username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "خطا در ورود به حساب"));
  }

  const data = await response.json();

  saveAuthSession(data);

  return data;
}

export async function startLoginOtp(username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "خطا در شروع ورود"));
  }

  return response.json();
}

export async function verifyLoginOtp(challengeId, otpCode) {
  const response = await fetch(`${API_BASE_URL}/auth/login/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      challenge_id: Number(challengeId),
      otp_code: String(otpCode || "").trim(),
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "کد تایید اشتباه است"));
  }

  const data = await response.json();

  saveAuthSession(data);

  return data;
}

export async function registerUser({ username, password, email, fullName }) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: String(username || "").trim(),
      password: String(password || ""),
      email: String(email || "").trim() || null,
      full_name: String(fullName || username || "").trim() || null,
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "خطا در ثبت‌نام"));
  }

  return response.json();
}

export async function fetchCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("خطا در دریافت اطلاعات کاربر فعلی");
  }

  const user = await response.json();

  localStorage.setItem("currentUser", JSON.stringify(user));
  localStorage.setItem("user", JSON.stringify(user));

  if (user.username) localStorage.setItem("username", user.username);
  if (user.role) localStorage.setItem("role", user.role);

  dispatchAuthChanged();

  return user;
}

export function getRoleLabel(role) {
  const value = String(role || "").trim().toLowerCase();

  const labels = {
    admin: "مدیر",
    administrator: "مدیر",
    owner: "مدیر",
    manager: "مدیر",
    "مدیر": "مدیر",
    "مدير": "مدیر",
    "ادمین": "مدیر",
    "ادمين": "مدیر",
    sales: "فروشنده",
    seller: "فروشنده",
    salesperson: "فروشنده",
    sales_manager: "سرپرست فروش",
    accountant: "حسابدار",
    user: "کاربر",
  };

  return labels[value] || role || "کاربر";
}

export function isAdminRole(role) {
  const value = String(role || "").trim().toLowerCase();

  return [
    "admin",
    "administrator",
    "owner",
    "manager",
    "مدیر",
    "مدير",
    "ادمین",
    "ادمين",
  ].includes(value);
}

export function getUserId(user) {
  return user?.id || user?.uid || user?.user_id || user?.userId || null;
}
