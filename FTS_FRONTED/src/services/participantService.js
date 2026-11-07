import { api } from "./api";
export async function getParticipants() {
  return (await api("/participants")).participants;
}
export function subscribeParticipants(callback, onError) {
  let alive = true;
  const load = () =>
    getParticipants()
      .then((x) => {
        if (alive) callback(x);
      })
      .catch((e) => onError?.(e));
  load();
  const timer = setInterval(load, 5000);
  return () => {
    alive = false;
    clearInterval(timer);
  };
}
export async function getAdminParticipants() {
  return (await api("/participants/admin", { auth: true })).participants;
}
