const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export async function fetchDashboardSummary(period = "weekly") {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE_URL}/dashboard/summary?period=${encodeURIComponent(period)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) throw new Error("Failed to fetch dashboard summary");

  return response.json();
}