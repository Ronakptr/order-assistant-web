import api from "./client";

export async function fetchUsers() {
  const response = await api.get("/users/");
  return response.data;
}

export async function createUser(user) {
  const response = await api.post("/users/", {
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    active: user.active,
    password: user.password || "123456",
  });
  return response.data;
}

export async function updateUser(userId, user) {
  const payload = {
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    active: user.active,
  };

  const response = await api.put(`/users/${userId}`, payload);
  return response.data;
}

export async function updateUserPassword(userId, password) {
  const response = await api.put(`/users/${userId}/password`, { password });
  return response.data;
}

export async function deleteUser(userId) {
  await api.delete(`/users/${userId}`);
}
