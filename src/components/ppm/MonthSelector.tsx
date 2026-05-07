import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTHS, MONTH_LABELS } from "@/lib/ppm-data";

export function MonthSelector({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        {[...MONTHS].reverse().map((m) => (
          <SelectItem key={m} value={m}>{MONTH_LABELS[m]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
