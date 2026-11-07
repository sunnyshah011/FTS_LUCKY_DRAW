import { api } from "./api";
export async function importCustomersDirect(customers) {
  return api("/customers/import", {
    method: "POST",
    auth: true,
    body: { customers },
  });
}
