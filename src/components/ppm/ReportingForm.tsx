import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type ProjectSnapshot, type RAG, type Indicators, updateSnapshot, isPastMonth, MONTH_LABELS } from "@/lib/ppm-data";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

const INDICATOR_LABELS: Record<keyof Indicators, string> = {
  jalonA: "Jalon A", jalonB: "Jalon B", jalonC: "Jalon C", jalonD: "Jalon D",
  budget: "Budget", staffing: "Staffing", planning: "Planning", relationMOA: "Relation MOA",
};

function RagToggle({ value, onChange }: { value: RAG; onChange: (v: RAG) => void }) {
  return (
    <ToggleGroup type="single" value={value} onValueChange={(v) => v && onChange(v as RAG)} className="justify-start">
      {(["green", "amber", "red"] as RAG[]).map((r) => (
        <ToggleGroupItem key={r} value={r} className={cn(
          "h-8 w-8 rounded-full border data-[state=on]:ring-2 data-[state=on]:ring-offset-1 data-[state=on]:ring-primary",
          r === "green" && "bg-[var(--status-green)]",
          r === "amber" && "bg-[var(--status-amber)]",
          r === "red" && "bg-[var(--status-red)]",
        )} />
      ))}
    </ToggleGroup>
  );
}

export function ReportingForm({ snapshot, open, onClose }: { snapshot: ProjectSnapshot | null; open: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState<ProjectSnapshot | null>(snapshot);
  useEffect(() => setDraft(snapshot), [snapshot]);

  if (!draft) return null;
  const locked = isPastMonth(draft.month);

  const setInd = (k: keyof Indicators, v: RAG) =>
    setDraft({ ...draft, indicators: { ...draft.indicators, [k]: v } });

  const save = () => {
    updateSnapshot(draft.month, draft.id, draft);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Nouveau Reporting
            {locked && <Lock className="h-4 w-4 text-muted-foreground" />}
          </SheetTitle>
          <SheetDescription>
            <span className="font-medium text-foreground">{draft.product}</span> · {draft.perimeter} · Pilote : {draft.pilot}
            <br />
            Photo figée pour <span className="font-medium">{MONTH_LABELS[draft.month]}</span>
            {locked && " — mois historisé, lecture seule."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <section>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Dates de jalons</h3>
            <div className="grid grid-cols-2 gap-3">
              {(["jalonADate", "jalonBDate", "jalonCDate", "jalonDDate"] as const).map((k, i) => (
                <div key={k}>
                  <Label className="text-xs text-muted-foreground">Jalon {String.fromCharCode(65 + i)}</Label>
                  <Input type="date" disabled={locked} value={draft[k] ?? ""} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Indicateurs RAG</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {(Object.keys(INDICATOR_LABELS) as (keyof Indicators)[]).map((k) => (
                <div key={k} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
                  <span className="text-sm">{INDICATOR_LABELS[k]}</span>
                  <fieldset disabled={locked}>
                    <RagToggle value={draft.indicators[k]} onChange={(v) => setInd(k, v)} />
                  </fieldset>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Statut global</h3>
            <fieldset disabled={locked}>
              <RagToggle value={draft.globalStatus} onChange={(v) => setDraft({ ...draft, globalStatus: v })} />
            </fieldset>
          </section>

          <section>
            <Label htmlFor="comment" className="text-sm font-semibold text-foreground">Commentaire pilote</Label>
            <Textarea id="comment" disabled={locked} className="mt-2" rows={3}
              value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} />
          </section>

          {draft.globalStatus === "red" && (
            <section>
              <Label htmlFor="strat" className="text-sm font-semibold text-foreground">Commentaire stratégique (Direction)</Label>
              <Textarea id="strat" disabled={locked} className="mt-2" rows={3}
                value={draft.strategicComment ?? ""} onChange={(e) => setDraft({ ...draft, strategicComment: e.target.value })} />
            </section>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={save} disabled={locked}>Enregistrer le reporting</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
