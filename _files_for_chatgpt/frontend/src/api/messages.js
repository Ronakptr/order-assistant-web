import api from "./client";

function toPayload(message) {
  return {
    message_code: message.id || message.messageCode || undefined,
    order_code: message.orderCode || "",
    invoice_code: message.invoiceCode || message.orderCode || "",
    customer: message.customer || "",
    phone: message.phone || "",
    email: message.email || "",
    items: Array.isArray(message.items) ? message.items : [],
    status: message.status || "پیش نویس",
    template: message.template || "صورتحساب",
    channel: message.channel || "پیامک",
    preview: message.preview || "",
  };
}

export async function fetchMessages(search = "") {
  const response = await api.get("/messages/", {
    params: search ? { search } : {},
  });
  return response.data;
}

export async function createMessage(message) {
  const response = await api.post("/messages/", toPayload(message));
  return response.data;
}

export async function updateMessage(messageId, message) {
  const response = await api.put(`/messages/${messageId}`, toPayload(message));
  return response.data;
}

export async function deleteMessage(messageId) {
  await api.delete(`/messages/${messageId}`);
}
