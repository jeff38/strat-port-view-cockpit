import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/ppm/Header";
import { useSelectedMonth } from "@/hooks/use-month";
import { formatWeek, useWeeklyReports, type WeeklyReport } from "@/lib/ppm-weekly";
import { summarizeWeek } from "@/lib/ppm-ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sparkles, RefreshCw, Loader2, CheckCircle2, AlertTriangle, HandHelping, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/restitution")({
  head: () => ({
    meta: [
      { title: "Restitution faits marquants — PPM Cockpit" },
      { name: "description", content: "Consolidation hebdomadaire des faits marquants projet, avec synthèse IA." },
    ],
  }),
  component: RestitutionPage,
});

const CACHE_KEY = "ppm-weekly-summary-cache";

function loadCache(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; }
}
function saveCache(c: Record<string, string>) {
  if (typeof window !== "undefined") localStorage.setItem(CACHE_KEY, JSON.stringify(c));
}

function RestitutionPage() {
  const [month, setMonth] = useSelectedMonth();
  const reports = useWeeklyReports();

  const weeks = useMemo(() => {
    const set = new Set(reports.map((r) => r.weekISO));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [reports]);

  const [week, setWeek] = useState<string>("");
  useEffect(() => { if (!week && weeks[0]) setWeek(weeks[0]); }, [weeks, week]);

  const weekReports = useMemo(
    () => reports.filter((r) => r.weekISO === week),
    [reports, week],
  );

  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSummary(loadCache()[week] ?? "");
  }, [week]);

  const generate = async () => {
    if (!weekReports.length) return;
    setLoading(true);
    const res = await summarizeWeek(week, weekReports);
    setLoading(false);
    if (!res.ok) { toast.error(res.error || "Erreur IA"); return; }
    setSummary(res.summary);
    const c = loadCache(); c[week] = res.summary; saveCache(c);
    toast.success("Synthèse générée.");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header month={month} onMonthChange={setMonth} />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
              <Newspaper className="h-6 w-6 text-primary" /> Restitution hebdomadaire
            </h1>
            <p className="text-sm text-muted-foreground">Consolidation des faits marquants saisis par les chefs de projet, avec synthèse rédigée par l'IA.</p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Semaine</Label>
            <Select value={week} onValueChange={setWeek}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Choisir une semaine" /></SelectTrigger>
              <SelectContent>
                {weeks.length === 0 && <div className="p-2 text-sm text-muted-foreground">Aucune semaine disponible</div>}
                {weeks.map((w) => <SelectItem key={w} value={w}>{formatWeek(w)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" /> Synthèse COMEX SI
              </CardTitle>
              <Button size="sm" onClick={generate} disabled={loading || !weekReports.length} className="gap-1.5">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {summary ? "Régénérer" : "Générer"}
              </Button>
            </CardHeader>
            <CardContent>
              {!weekReports.length && (
                <p className="text-sm text-muted-foreground">Aucun fait marquant saisi pour cette semaine.</p>
              )}
              {weekReports.length > 0 && !summary && !loading && (
                <p className="text-sm text-muted-foreground">Cliquez sur « Générer » pour produire la synthèse IA à partir des {weekReports.length} contribution(s) projet.</p>
              )}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Rédaction en cours…
                </div>
              )}
              {summary && <Markdown text={summary} />}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Saisies brutes ({weekReports.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {weekReports.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
              {weekReports.map((r) => <RawReport key={r.id} r={r} />)}
            </CardContent>
          </Card>
        </div>

        {weeks.length > 1 && (
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">Historique des semaines</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {weeks.map((w) => {
                  const count = reports.filter((r) => r.weekISO === w).length;
                  return (
                    <button
                      key={w}
                      onClick={() => setWeek(w)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-xs transition",
                        w === week ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-secondary",
                      )}
                    >
                      {formatWeek(w)} <span className="ml-1 text-muted-foreground">· {count}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function RawReport({ r }: { r: WeeklyReport }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-sm font-medium text-foreground">{r.product}</div>
      <div className="text-xs text-muted-foreground">{r.perimeter} · {r.pilot}</div>
      {r.successes && <Line icon={<CheckCircle2 className="h-3 w-3 text-[var(--status-green)]" />} text={r.successes} />}
      {r.risks && <Line icon={<AlertTriangle className="h-3 w-3 text-[var(--status-amber)]" />} text={r.risks} />}
      {r.supportRequests && <Line icon={<HandHelping className="h-3 w-3 text-primary" />} text={r.supportRequests} />}
    </div>
  );
}

function Line({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="mt-1.5 flex gap-1.5 text-xs text-foreground/80">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="whitespace-pre-wrap">{text}</span>
    </div>
  );
}

function Markdown({ text }: { text: string }) {
  // Lightweight markdown rendering: headings, bold, lists, paragraphs.
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let listBuf: string[] = [];
  const flushList = () => {
    if (listBuf.length) {
      out.push(
        <ul key={`ul-${out.length}`} className="my-2 list-disc space-y-1 pl-5 text-sm text-foreground/90">
          {listBuf.map((l, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(l) }} />)}
        </ul>,
      );
      listBuf = [];
    }
  };
  const inline = (s: string) =>
    s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
  lines.forEach((raw, i) => {
    const l = raw.trim();
    if (l.startsWith("## ")) { flushList(); out.push(<h3 key={i} className="mt-4 text-sm font-semibold uppercase tracking-wide text-primary">{l.slice(3)}</h3>); }
    else if (l.startsWith("# ")) { flushList(); out.push(<h2 key={i} className="mt-4 text-base font-semibold text-foreground">{l.slice(2)}</h2>); }
    else if (l.startsWith("- ") || l.startsWith("* ")) { listBuf.push(l.slice(2)); }
    else if (l === "") { flushList(); }
    else { flushList(); out.push(<p key={i} className="my-2 text-sm leading-relaxed text-foreground/90" dangerouslySetInnerHTML={{ __html: inline(l) }} />); }
  });
  flushList();
  return <div>{out}</div>;
}