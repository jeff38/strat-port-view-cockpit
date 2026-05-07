import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Header } from "@/components/ppm/Header";
import { useSelectedMonth, useSnapshots } from "@/hooks/use-month";
import { MONTH_LABELS, type ProjectSnapshot, type Indicators, type RAG, updateSnapshot, isPastMonth } from "@/lib/ppm-data";
import { addWeekly, currentISOWeek, deleteWeekly, formatWeek, useWeeklyReports } from "@/lib/ppm-weekly";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, HandHelping, Lock, Save, Trash2, Sparkles, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { checkClarity, type ClarityResult } from "@/lib/ppm-ai";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/saisie")({
  head: () => ({
    meta: [
      { title: "Saisie Chef de Projet — PPM Cockpit" },
      { name: "description", content: "Espace de saisie pour les chefs de projet : reporting mensuel et faits marquants hebdomadaires." },
    ],
  }),
  component: SaisiePage,
});

const INDICATOR_LABELS: Record<keyof Indicators, string> = {
  jalonA: "Jalon A", jalonB: "Jalon B", jalonC: "Jalon C", jalonD: "Jalon D",
  budget: "Budget", staffing: "Staffing", planning: "Planning", relationMOA: "Relation MOA",
};

function RagToggle({ value, onChange, disabled }: { value: RAG; onChange: (v: RAG) => void; disabled?: boolean }) {
  return (
    <ToggleGroup type="single" value={value} disabled={disabled} onValueChange={(v) => v && onChange(v as RAG)} className="justify-start">
      {(["green", "amber", "red"] as RAG[]).map((r) => (
        <ToggleGroupItem key={r} value={r} className={cn(
          "h-7 w-7 rounded-full border data-[state=on]:ring-2 data-[state=on]:ring-offset-1 data-[state=on]:ring-primary",
          r === "green" && "bg-[var(--status-green)]",
          r === "amber" && "bg-[var(--status-amber)]",
          r === "red" && "bg-[var(--status-red)]",
        )} />
      ))}
    </ToggleGroup>
  );
}

function SaisiePage() {
  const [month, setMonth] = useSelectedMonth();
  const snaps = useSnapshots(month);
  const [projectId, setProjectId] = useState<string>(snaps[0]?.id ?? "");
  const project = snaps.find((s) => s.id === projectId) ?? snaps[0];

  return (
    <div className="min-h-screen bg-background">
      <Header month={month} onMonthChange={setMonth} />
      <main className="mx-auto max-w-[1200px] px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Espace Chef de Projet</h1>
            <p className="text-sm text-muted-foreground">Saisissez le reporting mensuel et les faits marquants hebdomadaires.</p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Projet</Label>
            <Select value={project?.id ?? ""} onValueChange={setProjectId}>
              <SelectTrigger className="w-[320px]"><SelectValue placeholder="Choisir un projet" /></SelectTrigger>
              <SelectContent>
                {snaps.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.product} — {s.pilot}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {project && (
          <Card className="mb-6">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div>
                <div className="text-lg font-semibold text-foreground">{project.product}</div>
                <div className="text-sm text-muted-foreground">{project.perimeter} · {project.type} · Pilote : {project.pilot}</div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                Mois : <span className="font-medium text-foreground">{MONTH_LABELS[month]}</span>
                {isPastMonth(month) && <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs"><Lock className="h-3 w-3" /> Historisé</span>}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="monthly">
          <TabsList>
            <TabsTrigger value="monthly">Reporting mensuel</TabsTrigger>
            <TabsTrigger value="weekly" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Faits marquants hebdo</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="mt-6">
            {project ? <MonthlyForm key={project.id} project={project} /> : <p className="text-sm text-muted-foreground">Aucun projet.</p>}
          </TabsContent>

          <TabsContent value="weekly" className="mt-6">
            {project && <WeeklyTab project={project} />}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function MonthlyForm({ project }: { project: ProjectSnapshot }) {
  const [draft, setDraft] = useState<ProjectSnapshot>(project);
  const locked = isPastMonth(draft.month);

  const setInd = (k: keyof Indicators, v: RAG) =>
    setDraft({ ...draft, indicators: { ...draft.indicators, [k]: v } });

  const save = () => {
    updateSnapshot(draft.month, draft.id, draft);
    toast.success("Reporting mensuel enregistré.");
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Dates de jalons</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {(["jalonADate", "jalonBDate", "jalonCDate", "jalonDDate"] as const).map((k, i) => (
            <div key={k}>
              <Label className="text-xs text-muted-foreground">Jalon {String.fromCharCode(65 + i)}</Label>
              <Input type="date" disabled={locked} value={draft[k] ?? ""} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Indicateurs RAG</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(INDICATOR_LABELS) as (keyof Indicators)[]).map((k) => (
            <div key={k} className="rounded-md border border-border bg-card px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{INDICATOR_LABELS[k]}</span>
                <RagToggle value={draft.indicators[k]} disabled={locked} onChange={(v) => setInd(k, v)} />
              </div>
              <Textarea
                disabled={locked}
                rows={2}
                placeholder="Commentaire (optionnel)…"
                className="mt-2 text-xs"
                value={draft.indicatorComments?.[k] ?? ""}
                onChange={(e) => setDraft({ ...draft, indicatorComments: { ...(draft.indicatorComments ?? {}), [k]: e.target.value } })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Statut global & commentaires</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm">Statut global</Label>
            <RagToggle value={draft.globalStatus} disabled={locked} onChange={(v) => setDraft({ ...draft, globalStatus: v })} />
          </div>
          <div>
            <Label className="text-sm">Commentaire pilote</Label>
            <Textarea disabled={locked} className="mt-2" rows={3} value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} />
          </div>
          {draft.globalStatus === "red" && (
            <div>
              <Label className="text-sm">Commentaire stratégique (Direction)</Label>
              <Textarea disabled={locked} className="mt-2" rows={3} value={draft.strategicComment ?? ""} onChange={(e) => setDraft({ ...draft, strategicComment: e.target.value })} />
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={save} disabled={locked} className="gap-2"><Save className="h-4 w-4" /> Enregistrer le reporting</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WeeklyTab({ project }: { project: ProjectSnapshot }) {
  const reports = useWeeklyReports();
  const [week, setWeek] = useState(currentISOWeek());
  const [successes, setSuccesses] = useState("");
  const [risks, setRisks] = useState("");
  const [support, setSupport] = useState("");

  const projectReports = useMemo(
    () => reports.filter((r) => r.product === project.product).sort((a, b) => b.weekISO.localeCompare(a.weekISO)),
    [reports, project.product],
  );

  const submit = () => {
    if (!successes && !risks && !support) {
      toast.error("Renseignez au moins un champ.");
      return;
    }
    addWeekly({
      projectId: project.id,
      product: project.product,
      perimeter: project.perimeter,
      pilot: project.pilot,
      weekISO: week,
      successes,
      risks,
      supportRequests: support,
    });
    setSuccesses(""); setRisks(""); setSupport("");
    toast.success(`Faits marquants ${formatWeek(week)} enregistrés.`);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Nouveau point hebdomadaire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3">
            <Label className="text-sm">Semaine</Label>
            <Input type="week" value={week} onChange={(e) => setWeek(e.target.value)} className="w-48" />
            <span className="text-xs text-muted-foreground">{formatWeek(week)}</span>
          </div>

          <FieldBlock
            icon={<CheckCircle2 className="h-4 w-4 text-[var(--status-green)]" />}
            label="Succès de la semaine"
            fieldKey="Succès"
            placeholder="Livraisons, jalons atteints, retours positifs MOA…"
            value={successes} onChange={setSuccesses}
          />
          <FieldBlock
            icon={<AlertTriangle className="h-4 w-4 text-[var(--status-amber)]" />}
            label="Risques identifiés"
            fieldKey="Risques"
            placeholder="Risques techniques, fonctionnels, planning, dépendances externes…"
            value={risks} onChange={setRisks}
          />
          <FieldBlock
            icon={<HandHelping className="h-4 w-4 text-primary" />}
            label="Demandes d'appui managérial"
            fieldKey="Appui managérial"
            placeholder="Arbitrages, ressources, escalades, décisions attendues…"
            value={support} onChange={setSupport}
          />

          <div className="flex justify-end">
            <Button onClick={submit} className="gap-2"><Save className="h-4 w-4" /> Publier les faits marquants</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Historique ({projectReports.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {projectReports.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun point hebdo pour ce projet.</p>
          )}
          {projectReports.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-foreground">{formatWeek(r.weekISO)}</div>
                <button onClick={() => deleteWeekly(r.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {r.successes && <Snippet color="green" label="Succès" text={r.successes} />}
              {r.risks && <Snippet color="amber" label="Risques" text={r.risks} />}
              {r.supportRequests && <Snippet color="primary" label="Appui" text={r.supportRequests} />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function FieldBlock({ icon, label, fieldKey, placeholder, value, onChange }: { icon: React.ReactNode; label: string; fieldKey: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  const [clarity, setClarity] = useState<ClarityResult | null>(null);
  const [checking, setChecking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!value || value.trim().length < 10) { setClarity(null); return; }
    setChecking(true);
    timer.current = setTimeout(async () => {
      const res = await checkClarity(fieldKey, value);
      setClarity(res);
      setChecking(false);
    }, 900);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value, fieldKey]);

  const unclear = clarity && clarity.score < 75;

  return (
    <div>
      <Label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
        {icon}{label}
        {checking && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        {clarity && !checking && (
          <span className={cn(
            "ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium",
            unclear ? "bg-[var(--status-amber)]/15 text-[color:var(--status-amber)]" : "bg-[var(--status-green)]/15 text-[color:var(--status-green)]",
          )}>
            Clarté {clarity.score}/100
          </span>
        )}
      </Label>
      <Textarea rows={3} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      {unclear && (
        <div className="mt-2 rounded-md border border-[var(--status-amber)]/30 bg-[var(--status-amber)]/5 p-2 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <MessageSquare className="h-3 w-3" /> Saisie peu claire — à reformuler
          </div>
          {clarity.issues.length > 0 && (
            <ul className="mt-1 list-disc pl-4 text-muted-foreground">
              {clarity.issues.map((i, idx) => <li key={idx}>{i}</li>)}
            </ul>
          )}
          {clarity.suggestion && (
            <div className="mt-1 italic text-foreground/80">💡 {clarity.suggestion}</div>
          )}
        </div>
      )}
    </div>
  );
}

function Snippet({ color, label, text }: { color: "green" | "amber" | "primary"; label: string; text: string }) {
  const cls = color === "green"
    ? "border-l-[var(--status-green)]"
    : color === "amber"
    ? "border-l-[var(--status-amber)]"
    : "border-l-primary";
  return (
    <div className={cn("mt-2 border-l-2 pl-2", cls)}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xs text-foreground/90 whitespace-pre-wrap">{text}</div>
    </div>
  );
}
