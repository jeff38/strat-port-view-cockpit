import { useSyncExternalStore } from "react";

export type WeeklyReport = {
  id: string;
  projectId: string; // snapshot id base (without month) — we'll use product name
  product: string;
  perimeter: string;
  pilot: string;
  weekISO: string; // e.g. "2026-W18"
  successes: string;
  risks: string;
  supportRequests: string;
  createdAt: string;
};

const KEY = "ppm-weekly-reports";

function load(): WeeklyReport[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

let store: WeeklyReport[] = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(store));
  listeners.forEach((l) => l());
}

export function addWeekly(r: Omit<WeeklyReport, "id" | "createdAt">) {
  store = [{ ...r, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...store];
  persist();
}

export function deleteWeekly(id: string) {
  store = store.filter((x) => x.id !== id);
  persist();
}

export function useWeeklyReports(): WeeklyReport[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => store,
    () => store,
  );
}

export function currentISOWeek(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function formatWeek(iso: string): string {
  const [y, w] = iso.split("-W");
  return `Semaine ${w} · ${y}`;
}
