import { api } from "./api";
export function subscribeWinners(callback, onError) {
  let alive = true;
  const load = () =>
    api("/winners")
      .then((d) => {
        if (alive) callback(d.winners);
      })
      .catch((e) => onError?.(e));
  load();
  const timer = setInterval(load, 3000);
  return () => {
    alive = false;
    clearInterval(timer);
  };
}
