import { api } from "./api";
export async function loginAdmin(email, password) {
  const data = await api("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  localStorage.setItem("fts_admin_token", data.token);
  localStorage.setItem("fts_admin_user", JSON.stringify(data.admin));
  return data;
}
export async function logoutAdmin() {
  localStorage.removeItem("fts_admin_token");
  localStorage.removeItem("fts_admin_user");
}
export async function currentAdmin() {
  if (!localStorage.getItem("fts_admin_token")) return null;
  try {
    return (await api("/auth/me", { auth: true })).admin;
  } catch {
    await logoutAdmin();
    return null;
  }
}
