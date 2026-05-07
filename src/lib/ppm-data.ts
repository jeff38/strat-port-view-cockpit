export type RAG = "green" | "amber" | "red";

export type Indicators = {
  jalonA: RAG;
  jalonB: RAG;
  jalonC: RAG;
  jalonD: RAG;
  budget: RAG;
  staffing: RAG;
  planning: RAG;
  relationMOA: RAG;
};

export type ProjectSnapshot = {
  id: string;
  month: string; // "2026-03"
  perimeter: string;
  product: string;
  pilot: string;
  type: "Produit Applicatif" | "Chantier Transverse";
  jalonADate?: string;
  jalonBDate?: string;
  jalonCDate?: string;
  jalonDDate?: string;
  indicators: Indicators;
  globalStatus: RAG;
  comment: string;
  strategicComment?: string;
  indicatorComments?: Partial<Record<keyof Indicators, string>>;
};

export const MONTHS = [
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
];

export const MONTH_LABELS: Record<string, string> = {
  "2025-12": "Décembre 2025",
  "2026-01": "Janvier 2026",
  "2026-02": "Février 2026",
  "2026-03": "Mars 2026",
  "2026-04": "Avril 2026",
  "2026-05": "Mai 2026",
};

export const PERIMETERS = [
  "Périmètre Fonctionnel 1",
  "Périmètre Fonctionnel 2",
  "Périmètre Fonctionnel 3",
];

const PRODUCTS: { perimeter: string; name: string; type: ProjectSnapshot["type"]; pilot: string }[] = [
  { perimeter: "Périmètre Fonctionnel 1", name: "CRM Salesforce", type: "Produit Applicatif", pilot: "Marie Dupont" },
  { perimeter: "Périmètre Fonctionnel 1", name: "Portail Client v2", type: "Produit Applicatif", pilot: "Jean Martin" },
  { perimeter: "Périmètre Fonctionnel 1", name: "Migration Cloud Azure", type: "Chantier Transverse", pilot: "Sophie Bernard" },
  { perimeter: "Périmètre Fonctionnel 2", name: "ERP Finance", type: "Produit Applicatif", pilot: "Pierre Lambert" },
  { perimeter: "Périmètre Fonctionnel 2", name: "Outil RH SIRH", type: "Produit Applicatif", pilot: "Claire Moreau" },
  { perimeter: "Périmètre Fonctionnel 2", name: "Refonte Datawarehouse", type: "Chantier Transverse", pilot: "Antoine Leroy" },
  { perimeter: "Périmètre Fonctionnel 3", name: "App Mobile B2B", type: "Produit Applicatif", pilot: "Élise Roux" },
  { perimeter: "Périmètre Fonctionnel 3", name: "Plateforme E-commerce", type: "Produit Applicatif", pilot: "Thomas Petit" },
  { perimeter: "Périmètre Fonctionnel 3", name: "Cybersécurité Zero Trust", type: "Chantier Transverse", pilot: "Nadia Chevalier" },
  { perimeter: "Périmètre Fonctionnel 3", name: "IA Générative Interne", type: "Chantier Transverse", pilot: "Marc Vidal" },
];

const RAGS: RAG[] = ["green", "amber", "red"];

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function randRag(rng: () => number, bias = 0): RAG {
  const r = rng() + bias;
  if (r < 0.6) return "green";
  if (r < 0.85) return "amber";
  return "red";
}

const COMMENTS = [
  "Avancement conforme au plan. Pas de point bloquant.",
  "Léger retard sur la phase de tests, plan de rattrapage en cours.",
  "Risque budgétaire identifié, arbitrage MOA attendu.",
  "Ressources clés indisponibles, impact sur le jalon B.",
  "Spécifications validées, démarrage des développements.",
];

const STRATEGIC = [
  "Décision de pilotage requise sur le périmètre fonctionnel.",
  "Escalade DSI nécessaire — dépassement budgétaire >15%.",
  "Mobilisation urgente d'expertise externe pour sécuriser le jalon.",
];

function buildMonth(month: string, monthIndex: number): ProjectSnapshot[] {
  const rng = seeded(monthIndex * 137 + 1);
  return PRODUCTS.map((p, i) => {
    const indicators: Indicators = {
      jalonA: randRag(rng, -0.1),
      jalonB: randRag(rng),
      jalonC: randRag(rng, 0.05),
      jalonD: randRag(rng, 0.1),
      budget: randRag(rng),
      staffing: randRag(rng, 0.05),
      planning: randRag(rng),
      relationMOA: randRag(rng, -0.15),
    };
    const reds = Object.values(indicators).filter((x) => x === "red").length;
    const ambers = Object.values(indicators).filter((x) => x === "amber").length;
    const globalStatus: RAG = reds >= 2 ? "red" : reds >= 1 || ambers >= 3 ? "amber" : "green";
    const baseDate = new Date(2026, monthIndex, 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return {
      id: `${month}-${i}`,
      month,
      perimeter: p.perimeter,
      product: p.name,
      pilot: p.pilot,
      type: p.type,
      jalonADate: fmt(new Date(baseDate.getTime() - 30 * 86400000)),
      jalonBDate: fmt(new Date(baseDate.getTime() + 15 * 86400000)),
      jalonCDate: fmt(new Date(baseDate.getTime() + 60 * 86400000)),
      jalonDDate: fmt(new Date(baseDate.getTime() + 120 * 86400000)),
      indicators,
      globalStatus,
      comment: COMMENTS[Math.floor(rng() * COMMENTS.length)],
      strategicComment: globalStatus === "red" ? STRATEGIC[Math.floor(rng() * STRATEGIC.length)] : undefined,
    };
  });
}

const initialData: Record<string, ProjectSnapshot[]> = {};
MONTHS.forEach((m, i) => {
  initialData[m] = buildMonth(m, i);
});

// In-memory store
let store: Record<string, ProjectSnapshot[]> = initialData;
const listeners = new Set<() => void>();

export function getSnapshots(month: string): ProjectSnapshot[] {
  return store[month] ?? [];
}

export function isPastMonth(month: string): boolean {
  const current = MONTHS[MONTHS.length - 2]; // current = April 2026 for demo
  return month < current;
}

export function updateSnapshot(month: string, id: string, patch: Partial<ProjectSnapshot>) {
  store = {
    ...store,
    [month]: store[month].map((s) => (s.id === id ? { ...s, ...patch } : s)),
  };
  listeners.forEach((l) => l());
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const RAG_LABELS: Record<RAG, string> = {
  green: "Vert",
  amber: "Ambre",
  red: "Rouge",
};
