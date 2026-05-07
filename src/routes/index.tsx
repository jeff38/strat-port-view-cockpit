import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Header } from "@/components/ppm/Header";
import { useSelectedMonth, useSnapshots } from "@/hooks/use-month";
import { MONTH_LABELS, PERIMETERS, type RAG } from "@/lib/ppm-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, AlertCircle, FolderKanban } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { JalonHistoryPopover } from "@/components/ppm/JalonHistoryPopover";

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
