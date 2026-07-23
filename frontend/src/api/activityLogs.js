const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchActivityLogs(limit = 300) {
  const response = await fetch(`${API_BASE_URL}/activity-logs/?limit=${limit}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("خطا در دریافت گزارش فعالیت کاربران");
  }

  return response.json();
}

export async function fetchActivityLogsByUser(userId, limit = 300) {
  const response = await fetch(
    `${API_BASE_URL}/activity-logs/user/${encodeURIComponent(userId)}?limit=${limit}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("خطا در دریافت گزارش فعالیت کاربر");
  }

  return response.json();
}

export async function logLogoutActivity() {
  const token = localStorage.getItem("token");

  if (!token) return;

  await fetch(`${API_BASE_URL}/activity-logs/logout`, {
    method: "POST",
    headers: getAuthHeaders(),
    keepalive: true,
  }).catch(() => null);
}