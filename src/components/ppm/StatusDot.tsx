import { cn } from "@/lib/utils";
import type { RAG } from "@/lib/ppm-data";

const styles: Record<RAG, string> = {
  green: "bg-[var(--status-green)]",
  amber: "bg-[var(--status-amber)]",
  red: "bg-[var(--status-red)]",
};

export function StatusDot({ status, className, onClick, title }: { status: RAG; className?: string; onClick?: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-block h-4 w-4 rounded-full ring-1 ring-black/10 shadow-sm transition-transform hover:scale-110",
        styles[status],
        className,
      )}
    />
  );
}
