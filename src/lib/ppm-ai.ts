export type ClarityResult = { score: number; issues: string[]; suggestion: string };

export async function checkClarity(field: string, text: string): Promise<ClarityResult> {
  try {
    const r = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clarity", payload: { field, text } }),
    });
    const j = await r.json();
    if (!j.ok) return { score: 100, issues: [], suggestion: "" };
    return { score: j.score ?? 100, issues: j.issues ?? [], suggestion: j.suggestion ?? "" };
  } catch {
    return { score: 100, issues: [], suggestion: "" };
  }
}

export async function summarizeWeek(week: string, reports: Array<{ product: string; perimeter: string; pilot: string; successes: string; risks: string; supportRequests: string }>): Promise<{ ok: boolean; summary: string; error?: string }> {
  try {
    const r = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "weekly-summary", payload: { week, reports } }),
    });
    const j = await r.json();
    if (!j.ok) return { ok: false, summary: "", error: j.error };
    return { ok: true, summary: j.summary };
  } catch (e) {
    return { ok: false, summary: "", error: e instanceof Error ? e.message : "Erreur" };
  }
}

export type DirectionSummaryPayload = {
  month: string;
  snapshots: Array<{ product: string; perimeter: string; pilot: string; type?: string; globalStatus: string; scheduleStatus?: string; budgetStatus?: string; scopeStatus?: string; comment?: string; strategicComment?: string; jalonInitial?: string; jalonReplanned?: string }>;
  prevSnapshots?: Array<{ product: string; globalStatus: string }>;
  budget?: { totalCapex: number; totalOpex: number; byPerim: Array<{ perimeter: string; capex: number; opex: number; total: number; count: number }>; byYear: Array<{ year: number; capex: number; opex: number }> };
};

export async function summarizeDirection(payload: DirectionSummaryPayload): Promise<{ ok: boolean; summary: string; error?: string }> {
  try {
    const r = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "direction-summary", payload }),
    });
    const j = await r.json();
    if (!j.ok) return { ok: false, summary: "", error: j.error };
    return { ok: true, summary: j.summary };
  } catch (e) {
    return { ok: false, summary: "", error: e instanceof Error ? e.message : "Erreur" };
  }
}