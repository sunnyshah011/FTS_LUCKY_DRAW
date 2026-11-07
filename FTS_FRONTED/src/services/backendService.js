import { api } from "./api";
export async function verifyBackendAdmin() {
  return api("/draw/test", { auth: true });
}
export async function drawNextWinner() {
  return api("/draw/next", { method: "POST", auth: true, body: {} });
}
