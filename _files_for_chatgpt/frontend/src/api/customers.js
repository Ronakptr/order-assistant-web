const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function normalizeCustomer(customer) {
  const isActive =
    typeof customer?.is_active === "boolean"
      ? customer.is_active
      : typeof customer?.isActive === "boolean"
        ? customer.isActive
        : typeof customer?.active === "boolean"
          ? customer.active
          : !["غیرفعال", "غيرفعال", "inactive", "false", "0"].includes(
              String(customer?.status || "").trim().toLowerCase()
            );

  return {
    ...customer,

    id: customer?.id ?? customer?.uid,
    uid: customer?.uid ?? customer?.id,

    customer_code:
      customer?.customer_code ||
      customer?.customerCode ||
      customer?.code ||
      "",

    customerCode:
      customer?.customerCode ||
      customer?.customer_code ||
      customer?.code ||
      "",

    code:
      customer?.code ||
      customer?.customer_code ||
      customer?.customerCode ||
      "",

    oa_internal_code:
      customer?.oa_internal_code ||
      customer?.oaInternalCode ||
      "",

    oaInternalCode:
      customer?.oaInternalCode ||
      customer?.oa_internal_code ||
      "",

    accounting_id:
      customer?.accounting_id ||
      customer?.accountingId ||
      "",

    accountingId:
      customer?.accountingId ||
      customer?.accounting_id ||
      "",

    accounting_software:
      customer?.accounting_software ||
      customer?.accountingSoftware ||
      "",

    accountingSoftware:
      customer?.accountingSoftware ||
      customer?.accounting_software ||
      "",

    name:
      customer?.name ||
      customer?.full_name ||
      customer?.fullName ||
      customer?.customer_name ||
      "",

    phone:
      customer?.phone ||
      customer?.mobile ||
      customer?.tel ||
      "",

    mobile:
      customer?.mobile ||
      customer?.phone ||
      customer?.tel ||
      "",

    quality: customer?.quality || "عادی",

    source_type:
      customer?.source_type ||
      customer?.sourceType ||
      "manual",

    sourceType:
      customer?.sourceType ||
      customer?.source_type ||
      "manual",

    description: customer?.description || "",

    is_active: isActive,
    isActive,
    active: isActive,
    status: isActive ? "فعال" : "غیرفعال",

    created_at:
      customer?.created_at ||
      customer?.createdAt ||
      "",

    createdAt:
      customer?.createdAt ||
      customer?.created_at ||
      "",

    updated_at:
      customer?.updated_at ||
      customer?.updatedAt ||
      "",

    updatedAt:
      customer?.updatedAt ||
      customer?.updated_at ||
      "",
  };
}

function normalizeCustomerList(data) {
  if (Array.isArray(data)) {
    return data.map(normalizeCustomer);
  }

  if (Array.isArray(data?.customers)) {
    return data.customers.map(normalizeCustomer);
  }

  if (Array.isArray(data?.items)) {
    return data.items.map(normalizeCustomer);
  }

  if (Array.isArray(data?.data)) {
    return data.data.map(normalizeCustomer);
  }

  if (Array.isArray(data?.results)) {
    return data.results.map(normalizeCustomer);
  }

  return [];
}

export async function fetchCustomers(options = {}) {
  const params = new URLSearchParams();

  if (options.search) {
    params.set("search", options.search);
  }

  /*
    صفحه مدیریت مشتریان باید همه مشتری‌ها را بگیرد،
    نه فقط مشتری‌های فعال.
  */
  if (options.activeOnly || options.active_only) {
    params.set("active_only", "true");
  }

  const queryString = params.toString();
  const url = `${API_BASE_URL}/customers/${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || "خطا در دریافت مشتریان");
  }

  const data = await response.json();
  return normalizeCustomerList(data);
}

export async function createCustomer(customerData) {
  const response = await fetch(`${API_BASE_URL}/customers/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(customerData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || "خطا در ثبت مشتری");
  }

  return normalizeCustomer(await response.json());
}

export async function updateCustomer(customerId, customerData) {
  const response = await fetch(
    `${API_BASE_URL}/customers/${encodeURIComponent(customerId)}`,
    {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(customerData),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || "خطا در ویرایش مشتری");
  }

  return normalizeCustomer(await response.json());
}

export async function setCustomerActive(customerId, isActive) {
  const activeValue = Boolean(isActive);

  const response = await fetch(
    `${API_BASE_URL}/customers/${encodeURIComponent(customerId)}/status`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        is_active: activeValue,
        isActive: activeValue,
        active: activeValue,
        status: activeValue ? "فعال" : "غیرفعال",
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || "خطا در تغییر وضعیت مشتری");
  }

  return normalizeCustomer(await response.json());
}

export async function deleteCustomer(customerId) {
  const response = await fetch(
    `${API_BASE_URL}/customers/${encodeURIComponent(customerId)}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || "خطا در حذف مشتری");
  }

  return true;
}

export const getCustomers = fetchCustomers;
export const addCustomer = createCustomer;
export const editCustomer = updateCustomer;
export const removeCustomer = deleteCustomer;
export const toggleCustomerStatus = setCustomerActive;