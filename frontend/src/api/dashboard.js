const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchDashboardSummary(period = "weekly") {
  const params = new URLSearchParams({
    period,
    _: String(Date.now()),
  });

  const response = await fetch(`${API_BASE_URL}/dashboard/summary?${params}`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || "خطا در دریافت اطلاعات داشبورد");
  }

  return response.json();
}
