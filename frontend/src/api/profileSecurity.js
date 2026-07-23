import { authHeaders, saveAuthSession } from "./auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function updateStoredUser(user) {
  if (!user || typeof user !== "object") return null;

  localStorage.setItem("currentUser", JSON.stringify(user));
  localStorage.setItem("user", JSON.stringify(user));

  if (user.username) localStorage.setItem("username", user.username);
  if (user.role) localStorage.setItem("role", user.role);

  window.dispatchEvent(new Event("oa-auth-changed"));

  return user;
}

async function readJsonResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || fallbackMessage);
  }

  return data;
}

export async function fetchSecurityProfile() {
  const response = await fetch(`${API_BASE_URL}/security/profile`, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await readJsonResponse(
    response,
    "خطا در دریافت اطلاعات امنیتی کاربر"
  );

  if (data?.user) updateStoredUser(data.user);

  return data?.user || data;
}

export async function updateCurrentUsername(username) {
  const response = await fetch(`${API_BASE_URL}/security/profile/username`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ username }),
  });

  const data = await readJsonResponse(response, "خطا در تغییر نام کاربری");

  if (data?.access_token || data?.token) {
    saveAuthSession(data);
  } else if (data?.user) {
    updateStoredUser(data.user);
  }

  return data?.user || data;
}

export async function changeCurrentPassword(currentPassword, newPassword) {
  const response = await fetch(`${API_BASE_URL}/security/profile/password`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });

  const data = await readJsonResponse(response, "خطا در تغییر رمز عبور");

  if (data?.user) updateStoredUser(data.user);

  return data;
}
