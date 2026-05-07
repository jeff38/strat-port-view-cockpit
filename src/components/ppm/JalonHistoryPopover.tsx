import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarClock, History } from "lucide-react";
import {
  type ProjectSnapshot,
  JALON_KEYS,
  JALON_LABEL,
  getInitialDate,
  getCurrentDate,
  getLastReplan,
  driftDays,
} from "@/lib/ppm-data";
import { cn } from "@/lib/utils";

function fmt(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function JalonHistoryPopover({ snapshot, compact = false }: { snapshot: ProjectSnapshot; compact?: boolean }) {
  const hasReplan = JALON_KEYS.some((k) => (snapshot.jalonHistory?.[k]?.length ?? 0) > 0);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground", compact && "h-6 px-1.5")}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {compact ? "Jalons" : "Jalons & dérives"}
          {hasReplan && <span className="rounded bg-[var(--status-amber)]/20 px-1 text-[10px] font-medium text-[color:var(--status-amber)]">replan</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="end">
        <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">
          Jalons — {snapshot.product}
        </div>
        <div className="divide-y divide-border">
          {JALON_KEYS.map((k) => {
            const initial = getInitialDate(snapshot, k);
            const current = getCurrentDate(snapshot, k);
            const last = getLastReplan(snapshot, k);
            const drift = driftDays(initial, current);
            const history = snapshot.jalonHistory?.[k] ?? [];
            return (
              <div key={k} className="px-4 py-3 text-xs">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-foreground">{JALON_LABEL[k]}</span>
                  {drift !== null && drift !== 0 && (
                    <span className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                      drift > 0 ? "bg-[var(--status-red)]/15 text-[color:var(--status-red)]" : "bg-[var(--status-green)]/15 text-[color:var(--status-green)]",
                    )}>
                      {drift > 0 ? `+${drift}j` : `${drift}j`}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide">Date initiale</div>
                    <div className="text-foreground">{fmt(initial)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide">Dernière replanif</div>
                    <div className="text-foreground">{last ? fmt(last.date) : <span className="italic text-muted-foreground">aucune</span>}</div>
                  </div>
                </div>
                {history.length > 0 && (
                  <details className="mt-2">
                    <summary className="flex cursor-pointer items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground">
                      <History className="h-3 w-3" /> Historique ({history.length})
                    </summary>
                    <ul className="mt-1 space-y-1 pl-4">
                      {history.map((h, i) => (
                        <li key={i} className="text-foreground/80">
                          → {fmt(h.date)} <span className="text-muted-foreground">({new Date(h.recordedAt).toLocaleDateString("fr-FR")})</span>
                          {h.note && <div className="ml-2 italic text-muted-foreground">« {h.note} »</div>}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}