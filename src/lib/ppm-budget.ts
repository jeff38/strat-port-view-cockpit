import { useSyncExternalStore } from "react";
import { listProducts } from "./ppm-data";

export const BUDGET_YEARS = [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034] as const;
export type BudgetYear = (typeof BUDGET_YEARS)[number];

export type ProjectBudget = {
  product: string;        // clé stable
  perimeter: string;
  pilot: string;
  type: string;
  capex: Record<number, number>;
  opex: Record<number, number>;
};

const KEY = "ppm-budget-v1";

function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function buildSeed(): Record<string, ProjectBudget> {
  const products = listProducts();
  const out: Record<string, ProjectBudget> = {};
  products.forEach((p, idx) => {
    const rng = seeded(1000 + idx * 37);
    const isTransverse = p.type === "Chantier Transverse";
    // Investissement initial pondéré sur 2-4 premières années
    const capexBase = (isTransverse ? 800 : 350) + Math.floor(rng() * 600);
    const opexBase  = (isTransverse ? 120 : 60)  + Math.floor(rng() * 180);
    const capex: Record<number, number> = {};
    const opex: Record<number, number> = {};
    BUDGET_YEARS.forEach((y, yi) => {
      // CAPEX décroît dans le temps, OPEX croît (run)
      const capWeight = Math.max(0, 1 - yi * 0.15) * (0.6 + rng() * 0.8);
      const opWeight  = Math.min(1.4, 0.3 + yi * 0.12) * (0.7 + rng() * 0.6);
      capex[y] = Math.round(capexBase * capWeight);
      opex[y]  = Math.round(opexBase * opWeight);
    });
    out[p.name] = {
      product: p.name,
      perimeter: p.perimeter,
      pilot: p.pilot,
      type: p.type,
      capex, opex,
    };
  });
  return out;
}

function load(): Record<string, ProjectBudget> {
  if (typeof window === "undefined") return buildSeed();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  const seed = buildSeed();
  try { localStorage.setItem(KEY, JSON.stringify(seed)); } catch { /* noop */ }
  return seed;
}

let store: Record<string, ProjectBudget> = load();
const listeners = new Set<() => void>();
function persist() {
  if (typeof window !== "undefined") {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* noop */ }
  }
  listeners.forEach((l) => l());
}

export function getBudget(product: string): ProjectBudget | undefined {
  return store[product];
}

export function listBudgets(): ProjectBudget[] {
  return Object.values(store);
}

export function setBudgetCell(product: string, year: number, kind: "capex" | "opex", value: number) {
  const b = store[product];
  if (!b) return;
  const next: ProjectBudget = {
    ...b,
    capex: { ...b.capex },
    opex: { ...b.opex },
  };
  next[kind][year] = isFinite(value) ? value : 0;
  store = { ...store, [product]: next };
  persist();
}

export function useBudgets(): ProjectBudget[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => Object.values(store),
    () => Object.values(store),
  );
}

/* ====== Calculs d'agrégation ====== */

export function projectYearTotal(b: ProjectBudget, year: number): number {
  return (b.capex[year] ?? 0) + (b.opex[year] ?? 0);
}

export function projectTotal(b: ProjectBudget, years: readonly number[] = BUDGET_YEARS): number {
  return years.reduce((acc, y) => acc + projectYearTotal(b, y), 0);
}

export function projectCapexTotal(b: ProjectBudget, years: readonly number[] = BUDGET_YEARS): number {
  return years.reduce((acc, y) => acc + (b.capex[y] ?? 0), 0);
}
export function projectOpexTotal(b: ProjectBudget, years: readonly number[] = BUDGET_YEARS): number {
  return years.reduce((acc, y) => acc + (b.opex[y] ?? 0), 0);
}

export function perimeterYearTotal(items: ProjectBudget[], year: number): number {
  return items.reduce((acc, b) => acc + projectYearTotal(b, year), 0);
}

export function perimeterTotal(items: ProjectBudget[], years: readonly number[] = BUDGET_YEARS): number {
  return items.reduce((acc, b) => acc + projectTotal(b, years), 0);
}

export function globalYearTotals(items: ProjectBudget[], years: readonly number[]): { year: number; capex: number; opex: number; total: number }[] {
  return years.map((y) => {
    const capex = items.reduce((a, b) => a + (b.capex[y] ?? 0), 0);
    const opex  = items.reduce((a, b) => a + (b.opex[y] ?? 0), 0);
    return { year: y, capex, opex, total: capex + opex };
  });
}

export function formatKEUR(n: number): string {
  if (!isFinite(n)) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n)) + " k€";
}
