import { createFileRoute } from "@tanstack/react-router";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(messages: Array<{ role: string; content: string }>, opts: { json?: boolean } = {}) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const body: Record<string, unknown> = {
    model: "google/gemini-3-flash-preview",
    messages,
  };
  if (opts.json) body.response_format = { type: "json_object" };
  const r = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`AI ${r.status}: ${t}`);
  }
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

export const Route = createFileRoute("/api/ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { action, payload } = await request.json();
          if (action === "clarity") {
            const { field, text } = payload as { field: string; text: string };
            if (!text || text.trim().length < 3) {
              return Response.json({ ok: true, score: 0, issues: [], suggestion: "" });
            }
            const sys = `Tu es un coach éditorial pour des chefs de projet SI. Tu évalues la clarté et la compréhensibilité d'une saisie courte (champ "${field}"). Tu réponds en JSON: {"score": 0-100 (clarté), "issues": ["..."], "suggestion": "reformulation concise éventuelle"}. Score >=75 = clair. Sois indulgent sur les phrases courtes mais factuelles. Signale: jargon non explicité, ambiguïté, manque de contexte (qui/quoi/impact), formulations télégraphiques incompréhensibles.`;
            const out = await callAI(
              [
                { role: "system", content: sys },
                { role: "user", content: text },
              ],
              { json: true },
            );
            try {
              return Response.json({ ok: true, ...JSON.parse(out) });
            } catch {
              return Response.json({ ok: true, score: 80, issues: [], suggestion: "" });
            }
          }
          if (action === "weekly-summary") {
            const { week, reports } = payload as {
              week: string;
              reports: Array<{ product: string; perimeter: string; pilot: string; successes: string; risks: string; supportRequests: string }>;
            };
            if (!reports?.length) {
              return Response.json({ ok: true, summary: "Aucun fait marquant saisi pour cette semaine." });
            }
            const sys = `Tu es analyste PPM pour la DSI. Rédige une synthèse hebdomadaire de haut niveau, structurée et professionnelle, à destination du COMEX SI. Style: rédactionnel fluide, phrases complètes, ton factuel et synthétique. Structure en markdown:\n\n## Vue d'ensemble\n(2-3 phrases sur la dynamique globale)\n\n## Succès marquants\n(consolide par thème, cite les projets entre parenthèses)\n\n## Risques & points d'attention\n(consolide, hiérarchise)\n\n## Demandes d'arbitrage / appui managérial\n(liste claire et actionnable)\n\nNe répète pas les saisies brutes, reformule. Pas de bullet stérile, privilégie la rédaction.`;
            const data = reports
              .map(
                (r) =>
                  `Projet: ${r.product} (${r.perimeter}) — Pilote ${r.pilot}\n- Succès: ${r.successes || "—"}\n- Risques: ${r.risks || "—"}\n- Appui: ${r.supportRequests || "—"}`,
              )
              .join("\n\n");
            const out = await callAI([
              { role: "system", content: sys },
              { role: "user", content: `Semaine ${week}\n\n${data}` },
            ]);
            return Response.json({ ok: true, summary: out });
          }
          return new Response("Unknown action", { status: 400 });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown";
          if (msg.includes("429")) return Response.json({ ok: false, error: "Trop de requêtes. Réessayez dans un instant." }, { status: 429 });
          if (msg.includes("402")) return Response.json({ ok: false, error: "Crédits IA épuisés. Ajoutez des crédits dans Settings > Workspace > Usage." }, { status: 402 });
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});