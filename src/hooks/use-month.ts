import { useEffect, useSyncExternalStore } from "react";
import { MONTHS, getSnapshots, subscribe } from "@/lib/ppm-data";

const KEY = "ppm-month";

export function useSelectedMonth(): [string, (m: string) => void] {
  const fallback = MONTHS[MONTHS.length - 1];
  const get = () => {
    if (typeof window === "undefined") return fallback;
    const v = localStorage.getItem(KEY);
    return v && MONTHS.includes(v) ? v : fallback;
  };
  const subscribeStorage = (cb: () => void) => {
    window.addEventListener("storage", cb);
    window.addEventListener("ppm-month-change", cb);
    return () => {
      window.removeEventListener("storage", cb);
      window.removeEventListener("ppm-month-change", cb);
    };
  };
  const month = useSyncExternalStore(subscribeStorage, get, () => MONTHS[MONTHS.length - 1]);
  const setMonth = (m: string) => {
    localStorage.setItem(KEY, m);
    window.dispatchEvent(new Event("ppm-month-change"));
  };
  return [month, setMonth];
}

export function useSnapshots(month: string) {
  const get = () => getSnapshots(month);
  const data = useSyncExternalStore(subscribe, get, get);
  useEffect(() => {}, [month]);
  return data;
}
