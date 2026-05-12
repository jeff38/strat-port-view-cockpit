import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { Header } from "@/components/ppm/Header";
import { useSelectedMonth, useSnapshots } from "@/hooks/use-month";
import { MONTH_LABELS, PERIMETERS, type ProjectSnapshot, type Indicators, isPastMonth } from "@/lib/ppm-data";
import { StatusDot } from "@/components/ppm/StatusDot";
import { ReportingForm } from "@/components/ppm/ReportingForm";
import { JalonHistoryPopover } from "@/components/ppm/JalonHistoryPopover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { FilePlus2, Lock, Search } from "lucide-react";
import { Wallet } from "lucide-react";
import { getBudget, useBudgets, formatKEUR, projectTotal, BUDGET_YEARS } from "@/lib/ppm-budget";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const Route = createFileRoute("/pilotage")({
  head: () => ({
    meta: [
      { title: "Vue Pilotage — PPM Cockpit" },
      { name: "description", content: "Tableau de pilotage du portefeuille de projets : jalons, budget, staffing, planning et relation MOA." },
    ],
  }),
  component: PilotagePage,
});

const IND_COLS: { key: keyof Indicators; label: string }[] = [
  { key: "jalonA", label: "Jalon A" },
  { key: "jalonB", label: "Jalon B" },
  { key: "jalonC", label: "Jalon C" },
  { key: "jalonD", label: "Jalon D" },
  { key: "budget", label: "Budget" },
  { key: "staffing", label: "Staffing" },
  { key: "planning", label: "Planning" },
  { key: "relationMOA", label: "Relation MOA" },
];

function PilotagePage() {
  const [month, setMonth] = useSelectedMonth();
  const snaps = useSnapshots(month);
  useBudgets(); // s'abonner pour re-rendre sur édition budget
  const year = Number(month.slice(0, 4));
  const [perimFilter, setPerimFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ProjectSnapshot | null>(null);

  const locked = isPastMonth(month);

  const rows = useMemo(() => {
    return snaps.filter((s) =>
      (perimFilter === "all" || s.perimeter === perimFilter) &&
      (healthFilter === "all" || s.globalStatus === healthFilter) &&
      (search === "" || s.product.toLowerCase().includes(search.toLowerCase()) || s.pilot.toLowerCase().includes(search.toLowerCase()))
    );
  }, [snaps, perimFilter, healthFilter, search]);

  const grouped = useMemo(() => {
    const g: Record<string, ProjectSnapshot[]> = {};
    rows.forEach((r) => { (g[r.perimeter] ||= []).push(r); });
    return g;
  }, [rows]);

  const perimBudgetYear = useMemo(() => {
    const m: Record<string, { capex: number; opex: number }> = {};
    Object.entries(grouped).forEach(([perim, items]) => {
      const agg = items.reduce(
        (a, p) => {
          const b = getBudget(p.product);
          if (b) { a.capex += b.capex[year] ?? 0; a.opex += b.opex[year] ?? 0; }
          return a;
        },
        { capex: 0, opex: 0 },
      );
      m[perim] = agg;
    });
    return m;
  }, [grouped, year]);

  return (
    <div className="min-h-screen bg-background">
      <Header month={month} onMonthChange={setMonth} />
      <main className="mx-auto max-w-[1600px] px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Vue Pilotage</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              {MONTH_LABELS[month]} · {rows.length} projet{rows.length > 1 ? "s" : ""}
              {locked && <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs"><Lock className="h-3 w-3" /> Mois historisé</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher projet ou pilote…" className="pl-8 w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={perimFilter} onValueChange={setPerimFilter}>
              <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
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

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="sticky left-0 z-10 bg-secondary/60 px-4 py-3 text-left font-medium">Produit / Chantier</th>
                  <th className="px-3 py-3 text-left font-medium">Pilote</th>
                  <th className="px-3 py-3 text-center font-medium">Global</th>
                  {IND_COLS.map((c) => (
                    <th key={c.key} className="px-2 py-3 text-center font-medium">{c.label}</th>
                  ))}
                  <th className="px-3 py-3 text-right font-medium text-[color:var(--budget-capex)]">CAPEX {year}</th>
                  <th className="px-3 py-3 text-right font-medium text-[color:var(--budget-opex)]">OPEX {year}</th>
                  <th className="px-3 py-3 text-right font-medium text-[color:var(--budget-total)]">Total {year}</th>
                  <th className="px-3 py-3 text-left font-medium">Commentaire</th>
                  <th className="px-3 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([perim, items]) => (
                  <Fragment key={perim}>
                    <tr className="bg-accent/40">
                      <td colSpan={IND_COLS.length + 3} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-accent-foreground">
                        {perim} · {items.length}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-[color:var(--budget-capex)]">{formatKEUR(perimBudgetYear[perim]?.capex ?? 0)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-[color:var(--budget-opex)]">{formatKEUR(perimBudgetYear[perim]?.opex ?? 0)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-[color:var(--budget-total)]">{formatKEUR((perimBudgetYear[perim]?.capex ?? 0) + (perimBudgetYear[perim]?.opex ?? 0))}</td>
                      <td colSpan={2} />
                    </tr>
                    {items.map((p) => (
                      <tr key={p.id} className="border-t border-border hover:bg-secondary/30">
                        <td className="sticky left-0 z-10 bg-background px-4 py-3 font-medium text-foreground">
                          <div>{p.product}</div>
                          <div className="text-xs font-normal text-muted-foreground">{p.type}</div>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{p.pilot}</td>
                        <td className="px-3 py-3 text-center">
                          <StatusDot status={p.globalStatus} onClick={() => setEditing(p)} title="Statut global" />
                        </td>
                        {IND_COLS.map((c) => (
                          <td key={c.key} className="px-2 py-3 text-center">
                            <StatusDot status={p.indicators[c.key]} onClick={() => setEditing(p)} title={c.label} />
                          </td>
                        ))}
                        <BudgetCells product={p.product} year={year} />
                        <td className="max-w-[280px] px-3 py-3 text-xs text-muted-foreground">
                          <div className="line-clamp-2">{p.comment}</div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <JalonHistoryPopover snapshot={p} compact />
                            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing(p)}>
                              <FilePlus2 className="h-3.5 w-3.5" />
                              Reporting
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={IND_COLS.length + 8} className="px-4 py-12 text-center text-sm text-muted-foreground">Aucun projet ne correspond aux filtres.</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-secondary/40">
                  <td colSpan={IND_COLS.length + 3} className="sticky left-0 z-10 bg-secondary/40 px-4 py-3 text-sm font-semibold">
                    <span className="inline-flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Total filtré {year}</span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-sm font-semibold text-[color:var(--budget-capex)]">
                    {formatKEUR(rows.reduce((a, p) => a + (getBudget(p.product)?.capex[year] ?? 0), 0))}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-sm font-semibold text-[color:var(--budget-opex)]">
                    {formatKEUR(rows.reduce((a, p) => a + (getBudget(p.product)?.opex[year] ?? 0), 0))}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-sm font-bold text-[color:var(--budget-total)]">
                    {formatKEUR(rows.reduce((a, p) => {
                      const b = getBudget(p.product); return a + ((b?.capex[year] ?? 0) + (b?.opex[year] ?? 0));
                    }, 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </main>

      <ReportingForm snapshot={editing} open={!!editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function BudgetCells({ product, year }: { product: string; year: number }) {
  const b = getBudget(product);
  const capex = b?.capex[year] ?? 0;
  const opex = b?.opex[year] ?? 0;
  const total = capex + opex;
  return (
    <>
      <td className="px-3 py-3 text-right font-mono text-xs text-[color:var(--budget-capex)]">{formatKEUR(capex)}</td>
      <td className="px-3 py-3 text-right font-mono text-xs text-[color:var(--budget-opex)]">{formatKEUR(opex)}</td>
      <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-[color:var(--budget-total)]">
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-1 hover:underline">
              <Wallet className="h-3 w-3" /> {formatKEUR(total)}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Détail pluri-annuel</div>
            {!b ? <p className="text-xs text-muted-foreground">Pas de données budgétaires.</p> : (
              <table className="w-full text-xs">
                <tbody>
                  {BUDGET_YEARS.map((y) => (
                    <tr key={y} className={cn("border-t border-border/60", y === year && "bg-accent/40")}>
                      <td className="py-1 font-medium">{y}</td>
                      <td className="py-1 text-right font-mono text-[color:var(--budget-capex)]">{formatKEUR(b.capex[y] ?? 0)}</td>
                      <td className="py-1 text-right font-mono text-[color:var(--budget-opex)]">{formatKEUR(b.opex[y] ?? 0)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border">
                    <td className="py-1 font-semibold">Total</td>
                    <td colSpan={2} className="py-1 text-right font-mono font-bold text-[color:var(--budget-total)]">
                      {formatKEUR(projectTotal(b))}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </PopoverContent>
        </Popover>
      </td>
    </>
  );
}
