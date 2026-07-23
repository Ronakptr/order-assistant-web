const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function isProductActive(product) {
  if (typeof product?.is_active === "boolean") return product.is_active;
  if (typeof product?.isActive === "boolean") return product.isActive;
  if (typeof product?.active === "boolean") return product.active;

  const status = String(product?.status || product?.status_label || "")
    .trim()
    .toLowerCase();

  if (["inactive", "false", "0", "غیرفعال", "غيرفعال"].includes(status)) {
    return false;
  }

  return true;
}

function shouldUseActiveOnlyByCurrentRoute(options = {}) {
  if (options.activeOnly !== undefined) return Boolean(options.activeOnly);
  if (options.active_only !== undefined) return Boolean(options.active_only);

  const path = String(window.location.pathname || "").toLowerCase();

  return path.includes("/orders/new") || path.includes("/orders/edit");
}

export async function fetchProducts(options = {}) {
  const activeOnly = shouldUseActiveOnlyByCurrentRoute(options);
  const query = activeOnly ? "?active_only=true" : "";

  const response = await fetch(`${API_BASE_URL}/products/${query}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("خطا در دریافت محصولات");
  }

  const data = await response.json();

  if (!Array.isArray(data)) return data;

  return activeOnly ? data.filter(isProductActive) : data;
}

export async function createProduct(productData) {
  const response = await fetch(`${API_BASE_URL}/products/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(productData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || "خطا در ثبت محصول");
  }

  return response.json();
}

export async function updateProduct(productId, productData) {
  const response = await fetch(
    `${API_BASE_URL}/products/${encodeURIComponent(productId)}`,
    {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(productData),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || "خطا در ویرایش محصول");
  }

  return response.json();
}

export async function deleteProduct(productId) {
  const response = await fetch(
    `${API_BASE_URL}/products/${encodeURIComponent(productId)}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || "خطا در حذف محصول");
  }

  return true;
}