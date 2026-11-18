import type { ReactNode } from "react";
import type { TermKey } from "@/lib/glossary";
import { cn } from "@/lib/utils";
import { Label } from "./Tip";

export function StatTile({
  label,
  value,
  hint,
  icon,
  highlight,
  term,
  className,
}: {
  label: string;
  term?: TermKey;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "card relative overflow-hidden p-4",
        highlight && "border-accent/25 bg-gradient-to-br from-accent/[0.09] to-transparent",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-fg-muted">
        <Label term={term}>{label}</Label>
        {icon && <span className={highlight ? "text-accent" : "text-fg-subtle"}>{icon}</span>}
      </div>
      <div className={cn("num mt-1.5 text-2xl font-semibold sm:text-3xl", highlight && "text-accent")}>{value}</div>
      {hint && <div className="mt-1 text-xs text-fg-subtle">{hint}</div>}
    </div>
  );
}

export function MiniStat({ label, value, term }: { label: string; value: ReactNode; term?: TermKey }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] py-2.5 last:border-0">
      <Label term={term} className="text-sm text-fg-muted">{label}</Label>
      <span className="num text-sm font-semibold">{value}</span>
    </div>
  );
}
