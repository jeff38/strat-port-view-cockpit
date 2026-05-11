import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { Header } from "@/components/ppm/Header";
import { useSelectedMonth } from "@/hooks/use-month";
import { PERIMETERS } from "@/lib/ppm-data";
import {
  BUDGET_YEARS,
  useBudgets,
  type ProjectBudget,
  projectYearTotal,
  projectTotal,
  perimeterYearTotal,
  perimeterTotal,
  globalYearTotals,
  formatKEUR,
} from "@/lib/ppm-budget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown, ChevronRight, Wallet } from "lucide-react";

export const Route = createFileRoute("/budget")({
  head: () => ({
    meta: [
      { title: "Vision pluri-annuelle — PPM Cockpit" },
      { name: "description", content: "Budget CAPEX / OPEX pluri-annuel du portefeuille SI : agrégation par projet, périmètre fonctionnel et global, sur 10 ans." },
    ],
  }),
  component: BudgetPage,
});

const CAPEX = "var(--budget-capex)";
const OPEX  = "var(--budget-opex)";
const TOT   = "var(--budget-total)";

function BudgetPage() {
  const [month, setMonth] = useSelectedMonth();
  const budgets = useBudgets();
  const [startYear, setStartYear] = useState<number>(2025);
  const visibleYears = useMemo(
    () => [startYear, startYear + 1, startYear + 2].filter((y) => BUDGET_YEARS.includes(y as any)),
    [startYear],
  );
  const [openPerim, setOpenPerim] = useState<Record<string, boolean>>(
    () => Object.fromEntries(PERIMETERS.map((p) => [p, true])),
  );

  const grouped = useMemo(() => {
    const g: Record<string, ProjectBudget[]> = {};
    PERIMETERS.forEach((p) => (g[p] = []));
    budgets.forEach((b) => { (g[b.perimeter] ||= []).push(b); });
    Object.values(g).forEach((arr) => arr.sort((a, b) => a.product.localeCompare(b.product)));
    return g;
  }, [budgets]);

  const chartData = useMemo(() => {
    return globalYearTotals(budgets, visibleYears).map((d) => ({
      year: String(d.year), capex: d.capex, opex: d.opex, total: d.total,
    }));
  }, [budgets, visibleYears]);

  const grandTotal = useMemo(() => {
    return budgets.reduce((acc, b) => acc + projectTotal(b, visibleYears), 0);
  }, [budgets, visibleYears]);

  return (
    <div className="min-h-screen bg-background">
      <Header month={month} onMonthChange={setMonth} />
      <main className="mx-auto max-w-[1600px] px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
              <Wallet className="h-6 w-6 text-[color:var(--budget-capex)]" />
              Vision pluri-annuelle
            </h1>
            <p className="text-sm text-muted-foreground">
              Budget CAPEX / OPEX du portefeuille — fenêtre 3 ans glissante (2025-2034). Montants en k€.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Année N</span>
            <Select value={String(startYear)} onValueChange={(v) => setStartYear(Number(v))}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BUDGET_YEARS.filter((y) => y <= 2032).map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Évolution du budget département — empilement CAPEX / OPEX</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v} k€`} />
                  <Tooltip formatter={(v: number) => formatKEUR(v)} />
                  <Legend />
                  <Bar dataKey="capex" name="CAPEX (Investissement)" stackId="b" fill={CAPEX} />
                  <Bar dataKey="opex"  name="OPEX (Fonctionnement)"  stackId="b" fill={OPEX} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="sticky left-0 z-10 bg-secondary/60 px-4 py-3 text-left font-medium">Périmètre / Projet</th>
                  {visibleYears.map((y) => (
                    <th key={y} className="px-3 py-3 text-right font-medium">{y}</th>
                  ))}
                  <th className="px-3 py-3 text-right font-medium text-[color:var(--budget-total)]">Total projet</th>
                </tr>
              </thead>
              <tbody className="text-foreground/90">
                {PERIMETERS.map((perim) => {
                  const items = grouped[perim] ?? [];
                  const open = openPerim[perim];
                  return (
                    <Fragment key={perim}>
                      <tr
                        className="cursor-pointer border-t border-border bg-accent/40 hover:bg-accent/60"
                        onClick={() => setOpenPerim((s) => ({ ...s, [perim]: !s[perim] }))}
                      >
                        <td className="sticky left-0 z-10 bg-accent/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-accent-foreground">
                          <span className="inline-flex items-center gap-1">
                            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            {perim} · {items.length}
                          </span>
                        </td>
                        {visibleYears.map((y) => (
                          <td key={y} className="px-3 py-2 text-right font-mono text-xs text-[color:var(--budget-capex)]">
                            {formatKEUR(perimeterYearTotal(items, y))}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-[color:var(--budget-total)]">
                          {formatKEUR(perimeterTotal(items, visibleYears))}
                        </td>
                      </tr>
                      {open && items.map((b) => (
                        <tr key={b.product} className="border-t border-border hover:bg-secondary/30">
                          <td className="sticky left-0 z-10 bg-background px-4 py-2 pl-10">
                            <div className="font-medium">{b.product}</div>
                            <div className="text-[11px] text-muted-foreground">{b.type} · {b.pilot}</div>
                          </td>
                          {visibleYears.map((y) => (
                            <td key={y} className="px-3 py-2 text-right font-mono text-xs">
                              <div className="text-[color:var(--budget-capex)]">C {formatKEUR(b.capex[y] ?? 0)}</div>
                              <div className="text-[color:var(--budget-opex)]">O {formatKEUR(b.opex[y] ?? 0)}</div>
                              <div className="border-t border-border/60 pt-0.5 text-foreground">= {formatKEUR(projectYearTotal(b, y))}</div>
                            </td>
                          ))}
                          <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-[color:var(--budget-total)]">
                            {formatKEUR(projectTotal(b, visibleYears))}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-secondary/40">
                  <td className="sticky left-0 z-10 bg-secondary/40 px-4 py-3 text-sm font-semibold">Total département</td>
                  {visibleYears.map((y) => (
                    <td key={y} className="px-3 py-3 text-right font-mono text-sm font-semibold text-[color:var(--budget-total)]">
                      {formatKEUR(budgets.reduce((a, b) => a + projectYearTotal(b, y), 0))}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right font-mono text-sm font-bold text-[color:var(--budget-total)]">
                    {formatKEUR(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <p className="mt-4 text-xs text-muted-foreground">
          C = CAPEX (Investissement) · O = OPEX (Fonctionnement) · Totaux agrégés dynamiquement Projet → Périmètre → Département.
        </p>
      </main>
    </div>
  );
}
