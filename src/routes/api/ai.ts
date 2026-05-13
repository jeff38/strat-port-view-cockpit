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
          if (action === "direction-summary") {
            const { month, snapshots, prevSnapshots, budget } = payload as {
              month: string;
              snapshots: Array<{ product: string; perimeter: string; pilot: string; type?: string; globalStatus: string; scheduleStatus?: string; budgetStatus?: string; scopeStatus?: string; comment?: string; strategicComment?: string; jalonInitial?: string; jalonReplanned?: string }>;
              prevSnapshots?: Array<{ product: string; globalStatus: string }>;
              budget?: { totalCapex: number; totalOpex: number; byPerim: Array<{ perimeter: string; capex: number; opex: number; total: number; count: number }>; byYear: Array<{ year: number; capex: number; opex: number }> };
            };
            if (!snapshots?.length) {
              return Response.json({ ok: true, summary: "Aucune donnée à analyser pour ce mois." });
            }
            const counts = { green: 0, amber: 0, red: 0 } as Record<string, number>;
            snapshots.forEach((s) => { counts[s.globalStatus] = (counts[s.globalStatus] ?? 0) + 1; });
            const prevById = new Map((prevSnapshots ?? []).map((s) => [s.product, s.globalStatus] as const));
            const newlyRed = snapshots.filter((s) => s.globalStatus === "red" && prevById.get(s.product) !== "red");
            const recovered = snapshots.filter((s) => s.globalStatus !== "red" && prevById.get(s.product) === "red");
            const reds = snapshots.filter((s) => s.globalStatus === "red");
            const ambers = snapshots.filter((s) => s.globalStatus === "amber");
            const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " k€";
            const sys = `Tu es analyste senior PPM pour la DSI, à destination du COMEX et de la Direction Générale. Tu produis une SYNTHÈSE EXÉCUTIVE rédigée en français, structurée, factuelle et orientée décision. Style: rédactionnel fluide (phrases complètes), ton professionnel et synthétique, AUCUNE donnée inventée. Tu t'appuies UNIQUEMENT sur les données fournies. Mets en avant ce qu'il faut VALORISER (succès, dynamiques positives, projets stabilisés) et ce qu'il faut SÉCURISER (alertes critiques, replanifications, dérives budgétaires, périmètres en tension). Termine systématiquement par des recommandations actionnables pour la Direction.\n\nStructure markdown OBLIGATOIRE:\n\n## Vue d'ensemble\n(2-3 phrases: santé globale du portefeuille, dynamique vs mois précédent, niveau de tension)\n\n## Points à valoriser\n(succès, projets stabilisés, périmètres performants — cite les projets entre parenthèses)\n\n## Points à sécuriser\n(alertes critiques, dégradations, replanifications majeures, périmètres en tension — hiérarchise par criticité)\n\n## Lecture budgétaire\n(analyse CAPEX/OPEX, concentration par périmètre, trajectoire pluri-annuelle si pertinent)\n\n## Recommandations & arbitrages Direction\n(3-5 décisions ou arbitrages concrets attendus du COMEX, formulés à l'impératif)`;
            const lines: string[] = [];
            lines.push(`Mois analysé: ${month}`);
            lines.push(`Portefeuille: ${snapshots.length} projets — Vert: ${counts.green ?? 0} · Ambre: ${counts.amber ?? 0} · Rouge: ${counts.red ?? 0}`);
            if (prevSnapshots?.length) {
              lines.push(`Évolution: ${newlyRed.length} nouveau(x) projet(s) passé(s) au rouge ce mois, ${recovered.length} sorti(s) du rouge.`);
            }
            if (reds.length) {
              lines.push(`\n## Projets ROUGES (${reds.length})`);
              reds.forEach((p) => {
                lines.push(`- ${p.product} [${p.perimeter}] pilote ${p.pilot} — Planning:${p.scheduleStatus ?? "?"} Budget:${p.budgetStatus ?? "?"} Périmètre:${p.scopeStatus ?? "?"}`);
                if (p.strategicComment || p.comment) lines.push(`  Commentaire: ${(p.strategicComment ?? p.comment ?? "").slice(0, 280)}`);
                if (p.jalonInitial && p.jalonReplanned && p.jalonInitial !== p.jalonReplanned) lines.push(`  Jalon: initial ${p.jalonInitial} → replanifié ${p.jalonReplanned}`);
              });
            }
            if (ambers.length) {
              lines.push(`\n## Projets AMBRES (${ambers.length})`);
              ambers.slice(0, 15).forEach((p) => {
                lines.push(`- ${p.product} [${p.perimeter}] — Planning:${p.scheduleStatus ?? "?"} Budget:${p.budgetStatus ?? "?"} Périmètre:${p.scopeStatus ?? "?"}${p.comment ? ` — ${p.comment.slice(0, 160)}` : ""}`);
              });
              if (ambers.length > 15) lines.push(`  (+ ${ambers.length - 15} autres)`);
            }
            if (newlyRed.length) {
              lines.push(`\n## Dégradations critiques ce mois`);
              newlyRed.forEach((p) => lines.push(`- ${p.product} [${p.perimeter}] : ${(p.strategicComment ?? p.comment ?? "passage au rouge").slice(0, 240)}`));
            }
            if (budget) {
              lines.push(`\n## Budget pluri-annuel`);
              lines.push(`Total CAPEX cumulé: ${fmt(budget.totalCapex)} · Total OPEX cumulé: ${fmt(budget.totalOpex)} · Total: ${fmt(budget.totalCapex + budget.totalOpex)}`);
              lines.push(`Par périmètre (top):`);
              budget.byPerim.slice(0, 8).forEach((b) => lines.push(`- ${b.perimeter} (${b.count} projets) — CAPEX ${fmt(b.capex)} / OPEX ${fmt(b.opex)} / Total ${fmt(b.total)}`));
              if (budget.byYear?.length) {
                lines.push(`Trajectoire annuelle (CAPEX+OPEX): ${budget.byYear.map((y) => `${y.year}:${fmt(y.capex + y.opex)}`).join(" · ")}`);
              }
            }
            const out = await callAI([
              { role: "system", content: sys },
              { role: "user", content: lines.join("\n") },
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