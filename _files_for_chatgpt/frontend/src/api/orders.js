import api from "./client";

export async function fetchOrders(search = "") {
  const response = await api.get("/orders/", {
    params: search ? { search } : {},
  });
  return response.data;
}

export async function getOrders(search = "") {
  return fetchOrders(search);
}

export async function fetchOrder(orderId) {
  const response = await api.get(`/orders/${encodeURIComponent(orderId)}`);
  return response.data;
}

export async function getOrder(orderId) {
  return fetchOrder(orderId);
}

export async function createOrder(order) {
  const response = await api.post("/orders/", order);
  return response.data;
}

export async function updateOrder(orderId, order) {
  const response = await api.put(`/orders/${encodeURIComponent(orderId)}`, order);
  return response.data;
}

export async function deleteOrder(orderId) {
  await api.delete(`/orders/${encodeURIComponent(orderId)}`);
}
