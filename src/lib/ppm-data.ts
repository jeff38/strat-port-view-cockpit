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
  month: string;
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
  jalonInitial?: Partial<Record<JalonKey, string>>;
  jalonHistory?: Partial<Record<JalonKey, JalonRevision[]>>;
};

export type JalonKey = "jalonA" | "jalonB" | "jalonC" | "jalonD";
export const JALON_KEYS: JalonKey[] = ["jalonA", "jalonB", "jalonC", "jalonD"];
export const JALON_DATE_FIELD: Record<JalonKey, "jalonADate" | "jalonBDate" | "jalonCDate" | "jalonDDate"> = {
  jalonA: "jalonADate", jalonB: "jalonBDate", jalonC: "jalonCDate", jalonD: "jalonDDate",
};
export const JALON_LABEL: Record<JalonKey, string> = {
  jalonA: "Jalon A", jalonB: "Jalon B", jalonC: "Jalon C", jalonD: "Jalon D",
};

export type JalonRevision = {
  date: string;            // date prévisionnelle saisie
  recordedAt: string;      // ISO datetime de la saisie
  month: string;           // mois de reporting où la replanif a eu lieu
  note?: string;           // motif de replanification
};

export function getInitialDate(s: ProjectSnapshot, k: JalonKey): string | undefined {
  return s.jalonInitial?.[k] ?? s[JALON_DATE_FIELD[k]];
}
export function getCurrentDate(s: ProjectSnapshot, k: JalonKey): string | undefined {
  return s[JALON_DATE_FIELD[k]];
}
export function getLastReplan(s: ProjectSnapshot, k: JalonKey): JalonRevision | undefined {
  const h = s.jalonHistory?.[k];
  return h && h.length > 0 ? h[h.length - 1] : undefined;
}
export function driftDays(initial?: string, current?: string): number | null {
  if (!initial || !current) return null;
  const a = new Date(initial).getTime();
  const b = new Date(current).getTime();
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

// Historique 2025 complet + 2026 jusqu'au mois en cours (mai 2026)
export const MONTHS = [
  "2025-01","2025-02","2025-03","2025-04","2025-05","2025-06",
  "2025-07","2025-08","2025-09","2025-10","2025-11","2025-12",
  "2026-01","2026-02","2026-03","2026-04","2026-05",
];

export const MONTH_LABELS: Record<string, string> = {
  "2025-01": "Janvier 2025",  "2025-02": "Février 2025",
  "2025-03": "Mars 2025",     "2025-04": "Avril 2025",
  "2025-05": "Mai 2025",      "2025-06": "Juin 2025",
  "2025-07": "Juillet 2025",  "2025-08": "Août 2025",
  "2025-09": "Septembre 2025","2025-10": "Octobre 2025",
  "2025-11": "Novembre 2025", "2025-12": "Décembre 2025",
  "2026-01": "Janvier 2026",  "2026-02": "Février 2026",
  "2026-03": "Mars 2026",     "2026-04": "Avril 2026",
  "2026-05": "Mai 2026",
};

export const PERIMETERS = [
  "Moteur",
  "Fuselage",
  "Tableau de Bord",
  "Aménagement Intérieur",
];

export const PILOTS = [
  "Marie Dupont","Jean Martin","Sophie Bernard","Pierre Lambert","Claire Moreau",
  "Antoine Leroy","Élise Roux","Thomas Petit","Nadia Chevalier","Marc Vidal",
  "Camille Fournier","Lucas Garnier","Hélène Rousseau","Olivier Mercier","Julie Faure",
  "Romain Blanc","Aurélie Girard","Vincent Noël","Sabine Lemoine","Damien Perrot",
  "Inès Caron","Florian Aubry","Margaux Dubois","Yannick Renaud","Caroline Picard",
];

type ProductDef = { perimeter: string; name: string; type: ProjectSnapshot["type"] };

const PRODUCTS_BASE: ProductDef[] = [
  // Moteur
  { perimeter: "Moteur", name: "Banc d'essai turboréacteur TRX-9", type: "Produit Applicatif" },
  { perimeter: "Moteur", name: "MRO Predictive Engine", type: "Produit Applicatif" },
  { perimeter: "Moteur", name: "Optimisation consommation Helios", type: "Produit Applicatif" },
  { perimeter: "Moteur", name: "Jumeau numérique Propulsion", type: "Produit Applicatif" },
  { perimeter: "Moteur", name: "Conformité Emissions CORSIA", type: "Produit Applicatif" },
  // Fuselage
  { perimeter: "Fuselage", name: "Atlas — CAO collaborative", type: "Produit Applicatif" },
  { perimeter: "Fuselage", name: "Contrôle non destructif IA", type: "Produit Applicatif" },
  { perimeter: "Fuselage", name: "Traçabilité composites", type: "Produit Applicatif" },
  { perimeter: "Fuselage", name: "Plateforme Stress Analysis", type: "Produit Applicatif" },
  { perimeter: "Fuselage", name: "Portail fournisseurs Tier-1", type: "Produit Applicatif" },
  // Tableau de Bord
  { perimeter: "Tableau de Bord", name: "Cockpit Glass Avionics v3", type: "Produit Applicatif" },
  { perimeter: "Tableau de Bord", name: "HUD Réalité Augmentée", type: "Produit Applicatif" },
  { perimeter: "Tableau de Bord", name: "Suite EFB pilotes", type: "Produit Applicatif" },
  { perimeter: "Tableau de Bord", name: "Datalink ACARS nouvelle gen", type: "Produit Applicatif" },
  { perimeter: "Tableau de Bord", name: "Simulateur formation A350", type: "Produit Applicatif" },
  // Aménagement Intérieur
  { perimeter: "Aménagement Intérieur", name: "IFE Streaming 4K", type: "Produit Applicatif" },
  { perimeter: "Aménagement Intérieur", name: "Configurateur cabine VIP", type: "Produit Applicatif" },
  { perimeter: "Aménagement Intérieur", name: "Éclairage circadien LED", type: "Produit Applicatif" },
  { perimeter: "Aménagement Intérieur", name: "Sièges connectés Premium", type: "Produit Applicatif" },
  { perimeter: "Aménagement Intérieur", name: "Galleys & Trolleys IoT", type: "Produit Applicatif" },
  // Chantiers transverses
  { perimeter: "Moteur", name: "Cybersécurité OT industrielle", type: "Chantier Transverse" },
  { perimeter: "Fuselage", name: "Migration Cloud souverain", type: "Chantier Transverse" },
  { perimeter: "Tableau de Bord", name: "Référentiel données Produit (PLM)", type: "Chantier Transverse" },
  { perimeter: "Aménagement Intérieur", name: "Programme IA générative ingénierie", type: "Chantier Transverse" },
  { perimeter: "Fuselage", name: "Conformité DORA & NIS2", type: "Chantier Transverse" },
];

// Affecter un pilote unique par projet (25 projets, 25 pilotes)
const PRODUCTS = PRODUCTS_BASE.map((p, i) => ({ ...p, pilot: PILOTS[i % PILOTS.length] }));

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
  "Recette utilisateur en cours, retours positifs.",
  "Dépendance fournisseur critique, suivi rapproché.",
  "Mise en production sécurisée, monitoring renforcé.",
];

const STRATEGIC = [
  "Décision de pilotage requise sur le périmètre fonctionnel.",
  "Escalade DSI nécessaire — dépassement budgétaire >15%.",
  "Mobilisation urgente d'expertise externe pour sécuriser le jalon.",
  "Re-priorisation portefeuille à arbitrer en COMEX.",
];

function buildMonth(month: string, monthIndex: number): ProjectSnapshot[] {
  const rng = seeded(monthIndex * 137 + 1);
  const [yearStr, mStr] = month.split("-");
  const year = Number(yearStr);
  const m = Number(mStr) - 1;
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
    const baseDate = new Date(year, m, 1);
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

let store: Record<string, ProjectSnapshot[]> = initialData;
const listeners = new Set<() => void>();

export function getSnapshots(month: string): ProjectSnapshot[] {
  return store[month] ?? [];
}

// Mois "courant" = dernier mois de la liste (Décembre 2025). Tous les autres sont historisés.
export function isPastMonth(month: string): boolean {
  const current = MONTHS[MONTHS.length - 1];
  return month < current;
}

export function updateSnapshot(month: string, id: string, patch: Partial<ProjectSnapshot>) {
  store = {
    ...store,
    [month]: store[month].map((s) => (s.id === id ? { ...s, ...patch } : s)),
  };
  listeners.forEach((l) => l());
}

/**
 * Replanifier une date de jalon : versionne le changement, conserve la date
 * initiale si absente, et met à jour la date courante.
 */
export function replanJalon(month: string, id: string, key: JalonKey, newDate: string, note?: string) {
  store = {
    ...store,
    [month]: store[month].map((s) => {
      if (s.id !== id) return s;
      const field = JALON_DATE_FIELD[key];
      const previous = s[field];
      if (previous === newDate) return s;
      const initial = { ...(s.jalonInitial ?? {}) };
      if (!initial[key]) initial[key] = previous ?? newDate;
      const history = { ...(s.jalonHistory ?? {}) };
      const list = [...(history[key] ?? [])];
      list.push({ date: newDate, recordedAt: new Date().toISOString(), month, note });
      history[key] = list;
      return { ...s, [field]: newDate, jalonInitial: initial, jalonHistory: history };
    }),
  };
  listeners.forEach((l) => l());
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Liste publique des projets (utile pour seed hebdo)
export function listProducts() {
  return PRODUCTS.map((p) => ({ ...p }));
}

export const RAG_LABELS: Record<RAG, string> = {
  green: "Vert",
  amber: "Ambre",
  red: "Rouge",
};
