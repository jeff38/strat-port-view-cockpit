import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Header } from "@/components/ppm/Header";
import { useSelectedMonth, useSnapshots } from "@/hooks/use-month";
import { MONTH_LABELS, PERIMETERS, isPastMonth, type RAG } from "@/lib/ppm-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, AlertCircle, FolderKanban, Flame, X } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { JalonHistoryPopover } from "@/components/ppm/JalonHistoryPopover";
import { MONTHS } from "@/lib/ppm-data";
import { Button } from "@/components/ui/button";
import { BUDGET_YEARS, useBudgets, projectCapexTotal, projectOpexTotal, formatKEUR, globalYearTotals } from "@/lib/ppm-budget";
import { Markdown } from "@/components/ppm/Markdown";
import { summarizeDirection } from "@/lib/ppm-ai";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { JALON_KEYS, JALON_LABEL, getInitialDate, getCurrentDate } from "@/lib/ppm-data";
import { Lock, Radio } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vue Direction — PPM Cockpit" },
      { name: "description", content: "Tableau de bord de pilotage du portefeuille de projets SI : santé globale, alertes Direction et indicateurs clés." },
    ],
  }),
  component: DashboardPage,
});

const COLORS: Record<RAG, string> = {
  green: "oklch(0.68 0.16 150)",
  amber: "oklch(0.78 0.16 75)",
  red: "oklch(0.62 0.22 25)",
};

function Stat({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-foreground" style={accent ? { backgroundColor: accent, color: "white" } : {}}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold text-foreground">{value}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const [month, setMonth] = useSelectedMonth();
  const allSnaps = useSnapshots(month);
  const prevMonth = useMemo(() => {
    const idx = MONTHS.indexOf(month);
    return idx > 0 ? MONTHS[idx - 1] : null;
  }, [month]);
  const prevSnaps = useSnapshots(prevMonth ?? MONTHS[0]);
  const [perimFilter, setPerimFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const snaps = useMemo(() => allSnaps.filter((s) =>
    (perimFilter === "all" || s.perimeter === perimFilter) &&
    (healthFilter === "all" || s.globalStatus === healthFilter) &&
    (search === "" || s.product.toLowerCase().includes(search.toLowerCase()) || s.pilot.toLowerCase().includes(search.toLowerCase()))
  ), [allSnaps, perimFilter, healthFilter, search]);

  const stats = useMemo(() => {
    const total = snaps.length || 1;
    const counts = { green: 0, amber: 0, red: 0 } as Record<RAG, number>;
    snaps.forEach((s) => counts[s.globalStatus]++);
    return {
      total: snaps.length,
      counts,
      pct: {
        green: Math.round((counts.green / total) * 100),
        amber: Math.round((counts.amber / total) * 100),
        red: Math.round((counts.red / total) * 100),
      },
    };
  }, [snaps]);

  const reds = snaps.filter((s) => s.globalStatus === "red");

  const newlyRed = useMemo(() => {
    if (!prevMonth) return [];
    const prevById = new Map(prevSnaps.map((s) => [s.product, s.globalStatus] as const));
    return snaps.filter((s) => s.globalStatus === "red" && prevById.get(s.product) !== "red");
  }, [snaps, prevSnaps, prevMonth]);

  const perimData = useMemo(() => {
    return PERIMETERS.map((p) => {
      const list = allSnaps.filter((s) => s.perimeter === p);
      return {
        perimeter: p,
        short: p.length > 14 ? p.slice(0, 12) + "…" : p,
        green: list.filter((s) => s.globalStatus === "green").length,
        amber: list.filter((s) => s.globalStatus === "amber").length,
        red: list.filter((s) => s.globalStatus === "red").length,
      };
    });
  }, [allSnaps]);

  const budgets = useBudgets();
  const filteredBudgets = useMemo(() => {
    const productSet = new Set(snaps.map((s) => s.product));
    return budgets.filter((b) => productSet.has(b.product));
  }, [budgets, snaps]);

  const budgetByYear = useMemo(
    () => globalYearTotals(filteredBudgets, BUDGET_YEARS).map((r) => ({
      year: String(r.year), capex: Math.round(r.capex), opex: Math.round(r.opex), total: r.total,
    })),
    [filteredBudgets],
  );
  const budgetGrandTotal = useMemo(() => ({
    capex: filteredBudgets.reduce((a, b) => a + projectCapexTotal(b), 0),
    opex: filteredBudgets.reduce((a, b) => a + projectOpexTotal(b), 0),
  }), [filteredBudgets]);

  const budgetByPerim = useMemo(() => {
    return PERIMETERS.map((p) => {
      const items = filteredBudgets.filter((b) => b.perimeter === p);
      const capex = items.reduce((a, b) => a + projectCapexTotal(b), 0);
      const opex = items.reduce((a, b) => a + projectOpexTotal(b), 0);
      return { perimeter: p, count: items.length, capex, opex, total: capex + opex };
    }).filter((r) => r.count > 0).sort((a, b) => b.total - a.total);
  }, [filteredBudgets]);

  // ===== Synthèse IA Direction =====
  const [synthMonth, setSynthMonth] = useState<string>(month);
  useEffect(() => { setSynthMonth(month); }, [month]);
  const synthSnaps = useSnapshots(synthMonth);
  const synthPrevMonth = useMemo(() => {
    const idx = MONTHS.indexOf(synthMonth);
    return idx > 0 ? MONTHS[idx - 1] : null;
  }, [synthMonth]);
  const synthPrevSnaps = useSnapshots(synthPrevMonth ?? MONTHS[0]);
  const synthIsLive = !isPastMonth(synthMonth);

  const [aiSummary, setAiSummary] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const cacheKey = `ppm-direction-summary::${synthMonth}::${perimFilter}::${healthFilter}`;
  useEffect(() => {
    if (typeof window === "undefined") return;
    setAiSummary(localStorage.getItem(cacheKey) ?? "");
  }, [cacheKey]);

  const generateSummary = async () => {
    // Applique les mêmes filtres (périmètre/santé/recherche) au mois choisi pour la synthèse
    const filteredSynth = synthSnaps.filter((s) =>
      (perimFilter === "all" || s.perimeter === perimFilter) &&
      (healthFilter === "all" || s.globalStatus === healthFilter) &&
      (search === "" || s.product.toLowerCase().includes(search.toLowerCase()) || s.pilot.toLowerCase().includes(search.toLowerCase()))
    );
    if (!filteredSynth.length) return;
    setAiLoading(true);
    try {
      const aiSnapshots = filteredSynth.map((s) => {
        // jalon le plus dérivé (initial vs courant)
        let drift = 0;
        let driftKey = JALON_KEYS[0];
        JALON_KEYS.forEach((k) => {
          const i = getInitialDate(s, k); const c = getCurrentDate(s, k);
          if (i && c) {
            const d = Math.abs(new Date(c).getTime() - new Date(i).getTime());
            if (d > drift) { drift = d; driftKey = k; }
          }
        });
        const ji = getInitialDate(s, driftKey);
        const jc = getCurrentDate(s, driftKey);
        return {
          product: s.product,
          perimeter: s.perimeter,
          pilot: s.pilot,
          type: s.type,
          globalStatus: s.globalStatus,
          scheduleStatus: s.indicators.planning,
          budgetStatus: s.indicators.budget,
          scopeStatus: s.indicators.relationMOA,
          comment: s.comment,
          strategicComment: s.strategicComment,
          jalonInitial: ji ? `${JALON_LABEL[driftKey]} ${ji}` : undefined,
          jalonReplanned: jc && ji && jc !== ji ? `${JALON_LABEL[driftKey]} ${jc}` : undefined,
        };
      });
      const aiBudget = filteredBudgets.length ? {
        totalCapex: budgetGrandTotal.capex,
        totalOpex: budgetGrandTotal.opex,
        byPerim: budgetByPerim,
        byYear: budgetByYear.map((b) => ({ year: Number(b.year), capex: b.capex, opex: b.opex })),
      } : undefined;
      const res = await summarizeDirection({
        month: synthMonth,
        snapshots: aiSnapshots,
        prevSnapshots: synthPrevMonth ? synthPrevSnaps.map((s) => ({ product: s.product, globalStatus: s.globalStatus })) : undefined,
        budget: aiBudget,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Erreur lors de la génération de la synthèse");
      } else {
        setAiSummary(res.summary);
        try { localStorage.setItem(cacheKey, res.summary); } catch { /* noop */ }
      }
    } finally {
      setAiLoading(false);
    }
  };

  const pieData = [
    { name: "Vert", value: stats.counts.green, color: COLORS.green },
    { name: "Ambre", value: stats.counts.amber, color: COLORS.amber },
    { name: "Rouge", value: stats.counts.red, color: COLORS.red },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header month={month} onMonthChange={setMonth} />
      <main className="mx-auto max-w-[1600px] px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Vue Direction</h1>
            <p className="text-sm text-muted-foreground">Snapshot figé — {MONTH_LABELS[month]} · {snaps.length} projet{snaps.length > 1 ? "s" : ""}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher projet ou pilote…" className="pl-8 w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={perimFilter} onValueChange={setPerimFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les périmètres</SelectItem>
                {PERIMETERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={healthFilter} onValueChange={setHealthFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes santés</SelectItem>
                <SelectItem value="green">🟢 Vert</SelectItem>
                <SelectItem value="amber">🟠 Ambre</SelectItem>
                <SelectItem value="red">🔴 Rouge</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat icon={FolderKanban} label="Projets actifs" value={String(stats.total)} sub="Portefeuille SI" />
          <Stat icon={CheckCircle2} label="% Vert" value={`${stats.pct.green}%`} sub={`${stats.counts.green} projets`} accent={COLORS.green} />
          <Stat icon={AlertCircle} label="% Ambre" value={`${stats.pct.amber}%`} sub={`${stats.counts.amber} projets`} accent={COLORS.amber} />
          <Stat icon={AlertTriangle} label="% Rouge" value={`${stats.pct.red}%`} sub={`${stats.counts.red} projets`} accent={COLORS.red} />
        </div>

        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Répartition par périmètre fonctionnel</CardTitle>
            {perimFilter !== "all" && (
              <Button variant="ghost" size="sm" onClick={() => setPerimFilter("all")} className="h-8">
                <X className="mr-1 h-3.5 w-3.5" /> Filtre : {perimFilter}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perimData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="short" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: "oklch(0.95 0 0 / 0.4)" }} />
                  <Legend />
                  <Bar dataKey="green" name="Vert" stackId="s" fill={COLORS.green} cursor="pointer"
                       onClick={(d: any) => setPerimFilter(d?.payload?.perimeter ?? "all")} />
                  <Bar dataKey="amber" name="Ambre" stackId="s" fill={COLORS.amber} cursor="pointer"
                       onClick={(d: any) => setPerimFilter(d?.payload?.perimeter ?? "all")} />
                  <Bar dataKey="red" name="Rouge" stackId="s" fill={COLORS.red} cursor="pointer"
                       onClick={(d: any) => setPerimFilter(d?.payload?.perimeter ?? "all")} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Astuce : cliquez sur une barre pour filtrer la liste ci-dessous.</p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">
              Synthèse budgétaire pluri-annuelle ({BUDGET_YEARS[0]}–{BUDGET_YEARS[BUDGET_YEARS.length - 1]})
              {perimFilter !== "all" && <span className="ml-2 text-xs font-normal text-muted-foreground">· {perimFilter}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
              <div className="rounded-lg border border-border bg-[var(--budget-capex)]/5 p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">CAPEX cumulé</div>
                <div className="text-2xl font-semibold text-[var(--budget-capex)]">{formatKEUR(budgetGrandTotal.capex)}</div>
              </div>
              <div className="rounded-lg border border-border bg-[var(--budget-opex)]/5 p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">OPEX cumulé</div>
                <div className="text-2xl font-semibold text-[var(--budget-opex)]">{formatKEUR(budgetGrandTotal.opex)}</div>
              </div>
              <div className="rounded-lg border border-border bg-[var(--budget-total)]/10 p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Total budget</div>
                <div className="text-2xl font-semibold text-[var(--budget-total)]">{formatKEUR(budgetGrandTotal.capex + budgetGrandTotal.opex)}</div>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetByYear} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(v / 1000)}M`} />
                  <Tooltip formatter={(v: any) => formatKEUR(Number(v))} />
                  <Legend />
                  <Bar dataKey="capex" name="CAPEX" stackId="b" fill="var(--budget-capex)" />
                  <Bar dataKey="opex" name="OPEX" stackId="b" fill="var(--budget-opex)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3">Périmètre</th>
                    <th className="py-2 pr-3 text-right">Projets</th>
                    <th className="py-2 pr-3 text-right">CAPEX</th>
                    <th className="py-2 pr-3 text-right">OPEX</th>
                    <th className="py-2 pr-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetByPerim.map((r) => (
                    <tr key={r.perimeter} className="border-b border-border/60 hover:bg-secondary/40 cursor-pointer" onClick={() => setPerimFilter(r.perimeter)}>
                      <td className="py-2 pr-3 font-medium text-foreground">{r.perimeter}</td>
                      <td className="py-2 pr-3 text-right text-muted-foreground">{r.count}</td>
                      <td className="py-2 pr-3 text-right text-[var(--budget-capex)]">{formatKEUR(r.capex)}</td>
                      <td className="py-2 pr-3 text-right text-[var(--budget-opex)]">{formatKEUR(r.opex)}</td>
                      <td className="py-2 pr-3 text-right font-semibold text-[var(--budget-total)]">{formatKEUR(r.total)}</td>
                    </tr>
                  ))}
                  {budgetByPerim.length === 0 && (
                    <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">Aucune donnée budgétaire.</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-semibold">
                    <td className="py-2 pr-3">Total {perimFilter === "all" ? "global" : "filtré"}</td>
                    <td className="py-2 pr-3 text-right">{filteredBudgets.length}</td>
                    <td className="py-2 pr-3 text-right text-[var(--budget-capex)]">{formatKEUR(budgetGrandTotal.capex)}</td>
                    <td className="py-2 pr-3 text-right text-[var(--budget-opex)]">{formatKEUR(budgetGrandTotal.opex)}</td>
                    <td className="py-2 pr-3 text-right text-[var(--budget-total)]">{formatKEUR(budgetGrandTotal.capex + budgetGrandTotal.opex)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Synthèse exécutive IA · {MONTH_LABELS[month]}
              {(perimFilter !== "all" || healthFilter !== "all") && (
                <span className="text-xs font-normal text-muted-foreground">· vue filtrée</span>
              )}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={generateSummary} disabled={aiLoading || snaps.length === 0} className="gap-1.5">
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : aiSummary ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              {aiLoading ? "Analyse…" : aiSummary ? "Régénérer" : "Générer la synthèse"}
            </Button>
          </CardHeader>
          <CardContent>
            {!aiSummary && !aiLoading && (
              <p className="text-sm text-muted-foreground">
                Lance une analyse IA sur les {snaps.length} projet{snaps.length > 1 ? "s" : ""} affiché{snaps.length > 1 ? "s" : ""}, en intégrant les statuts, les replanifications de jalons et la trajectoire budgétaire pluri-annuelle. Le résultat met en avant les points à <strong>valoriser</strong> et à <strong>sécuriser</strong>, avec des recommandations actionnables pour la Direction.
              </p>
            )}
            {aiLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> L'IA analyse l'ensemble du portefeuille…
              </div>
            )}
            {aiSummary && <Markdown text={aiSummary} />}
          </CardContent>
        </Card>

        <Card className="mt-6 border-[var(--status-red)]/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4 text-[var(--status-red)]" />
              Alertes critiques · projets passés au rouge ce mois-ci
              <span className="ml-1 rounded-full bg-[var(--status-red)]/10 px-2 py-0.5 text-xs font-medium text-[var(--status-red)]">
                {newlyRed.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!prevMonth ? (
              <p className="text-sm text-muted-foreground">Premier mois de la période — pas d'historique pour comparer.</p>
            ) : newlyRed.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune nouvelle dégradation critique ce mois-ci. ✅</p>
            ) : (
              <ul className="space-y-2">
                {newlyRed.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-4 rounded-lg border border-[var(--status-red)]/30 bg-[var(--status-red)]/5 p-3">
                    <div>
                      <div className="font-medium text-foreground">{p.product}</div>
                      <div className="text-xs text-muted-foreground">{p.perimeter} · Pilote : {p.pilot}</div>
                      <p className="mt-1 text-sm text-foreground/90">{p.strategicComment ?? p.comment}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[var(--status-red)] px-2.5 py-0.5 text-xs font-medium text-white">Nouveau</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-base">Santé globale</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-[var(--status-red)]" />
                Alertes Direction · {reds.length} projet{reds.length > 1 ? "s" : ""} en rouge
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reds.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun projet critique ce mois-ci. ✅</p>
              ) : (
                <ul className="space-y-3">
                  {reds.map((p) => (
                    <li key={p.id} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium text-foreground">{p.product}</div>
                          <div className="text-xs text-muted-foreground">{p.perimeter} · Pilote : {p.pilot}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <JalonHistoryPopover snapshot={p} compact />
                          <span className="rounded-full bg-[var(--status-red)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--status-red)]">Rouge</span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-foreground/90">
                        <span className="font-medium">Stratégique : </span>
                        {p.strategicComment ?? p.comment}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
