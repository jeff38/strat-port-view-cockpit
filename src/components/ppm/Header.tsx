import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Table2, Activity } from "lucide-react";
import { MonthSelector } from "./MonthSelector";

export function Header({ month, onMonthChange }: { month: string; onMonthChange: (m: string) => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="h-4 w-4" />
          </div>
          <span>PPM Cockpit</span>
          <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">SI</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link to="/" activeOptions={{ exact: true }}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground">
            <LayoutDashboard className="h-4 w-4" /> Direction
          </Link>
          <Link to="/pilotage"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground">
            <Table2 className="h-4 w-4" /> Pilotage
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Mois</span>
          <MonthSelector value={month} onChange={onMonthChange} />
        </div>
      </div>
    </header>
  );
}
