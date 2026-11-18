import { cn } from "@/lib/utils";

export function PlaceBadge({ place, total, className }: { place: number; total?: number; className?: string }) {
  const tone =
    place === 1
      ? "bg-accent text-ink-950 shadow-[0_0_24px_-4px] shadow-accent/60"
      : place <= 5
        ? "bg-sky-400/15 text-sky-300 ring-1 ring-sky-400/30"
        : place <= 10
          ? "bg-white/[0.08] text-fg ring-1 ring-white/10"
          : "bg-white/[0.03] text-fg-subtle ring-1 ring-white/[0.06]";
  return (
    <div className={cn("grid size-12 shrink-0 place-items-center rounded-xl", tone, className)}>
      <div className="text-center leading-none">
        <div className="num text-lg font-bold">#{place || "?"}</div>
        {total ? <div className="mt-0.5 text-[10px] opacity-70">/{total}</div> : null}
      </div>
    </div>
  );
}
