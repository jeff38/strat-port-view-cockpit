import { useSyncExternalStore } from "react";
import { listProducts } from "./ppm-data";

export type WeeklyReport = {
  id: string;
  projectId: string;
  product: string;
  perimeter: string;
  pilot: string;
  weekISO: string; // "2025-W01"
  successes: string;
  risks: string;
  supportRequests: string;
  createdAt: string;
};

const KEY = "ppm-weekly-reports";
const SEED_KEY = "ppm-weekly-seed-v2";

const SUCCESS_TPL = [
  "Livraison du lot {n} validée par la MOA, recette OK.",
  "Jalon technique franchi avec 2 jours d'avance, KPIs au vert.",
  "Démo réussie auprès du sponsor, retours très positifs.",
  "Mise en production sans incident, monitoring stable.",
  "Atelier de cadrage mené, périmètre du sprint sécurisé.",
  "Recrutement d'un expert {role} finalisé.",
  "POC IA concluant : gain de productivité estimé à 18%.",
  "Audit qualité passé sans non-conformité majeure.",
];
const RISK_TPL = [
  "Dépendance fournisseur {vendor} en retard de 2 semaines.",
  "Charge serveur en augmentation, plan de capacité à revoir.",
  "Turn-over équipe : départ d'un développeur clé en fin de mois.",
  "Risque de glissement du jalon {jalon} si arbitrage non rendu.",
  "Sujet sécurité : finding scan SAST de criticité moyenne ouverte.",
  "Budget consommé à 78%, alerte pilotage activée.",
  "Spec fonctionnelle non stabilisée — itérations MOA à prévoir.",
];
const SUPPORT_TPL = [
  "Besoin d'arbitrage Direction sur priorité {axis}.",
  "Demande de mobilisation de l'expert sécurité 2j/semaine.",
  "Escalade nécessaire sur la coordination avec {dept}.",
  "Validation budgétaire complémentaire à présenter en COMEX.",
  "Appui RH pour ouvrir un poste {role} en CDI.",
];

const VENDORS = ["Capgemini","Atos","Sopra","IBM","Accenture"];
const ROLES = ["Data Engineer","DevOps","Tech Lead","Product Owner","UX"];
const AXES = ["sécurité","time-to-market","coût"];
const DEPTS = ["Finance","Achats","Industriel","Qualité"];
const JALONS = ["A","B","C","D"];

function pick<T>(arr: T[], rng: () => number): T { return arr[Math.floor(rng() * arr.length)]; }
function fill(tpl: string, rng: () => number): string {
  return tpl
    .replace("{n}", String(1 + Math.floor(rng() * 8)))
    .replace("{vendor}", pick(VENDORS, rng))
    .replace("{role}", pick(ROLES, rng))
    .replace("{axis}", pick(AXES, rng))
    .replace("{dept}", pick(DEPTS, rng))
    .replace("{jalon}", pick(JALONS, rng));
}

function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function isoWeek(year: number, week: number) {
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function buildSeed(): WeeklyReport[] {
  const out: WeeklyReport[] = [];
  const products = listProducts();
  const rng = seeded(42);
  for (let w = 1; w <= 52; w++) {
    const week = isoWeek(2025, w);
    products.forEach((p, idx) => {
      // ~70% des projets remontent un FM par semaine
      if (rng() > 0.7) return;
      const successes = rng() < 0.85 ? fill(pick(SUCCESS_TPL, rng), rng) : "";
      const risks = rng() < 0.6 ? fill(pick(RISK_TPL, rng), rng) : "";
      const support = rng() < 0.35 ? fill(pick(SUPPORT_TPL, rng), rng) : "";
      if (!successes && !risks && !support) return;
      out.push({
        id: `seed-${week}-${idx}`,
        projectId: `${week}-${idx}`,
        product: p.name,
        perimeter: p.perimeter,
        pilot: p.pilot,
        weekISO: week,
        successes,
        risks,
        supportRequests: support,
        createdAt: new Date(2025, 0, 1 + w * 7).toISOString(),
      });
    });
  }
  return out;
}

function load(): WeeklyReport[] {
  if (typeof window === "undefined") return [];
  try {
    const seeded = localStorage.getItem(SEED_KEY);
    const raw = localStorage.getItem(KEY);
    if (!seeded) {
      const data = buildSeed();
      localStorage.setItem(KEY, JSON.stringify(data));
      localStorage.setItem(SEED_KEY, "1");
      return data;
    }
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
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
