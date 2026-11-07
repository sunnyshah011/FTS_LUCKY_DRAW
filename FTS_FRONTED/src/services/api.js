const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export function getToken() {
  return localStorage.getItem("fts_admin_token");
}

export async function api(path, { method = "GET", body, auth = false } = {}) {
  
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (!token) throw new Error("Please log in as an administrator.");
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data = {};

  try {
    data = await response.json();
  } 
  catch { }
  if (!response.ok)
    throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}
