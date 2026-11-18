import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  wrap,
  className,
}: {
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
  wrap?: boolean;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex max-w-full rounded-xl border border-white/[0.08] bg-ink-950/60 p-1",
        wrap ? "flex-wrap gap-0.5" : "scrollbar-none overflow-x-auto",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={o.value === value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            "shrink-0 rounded-lg font-medium whitespace-nowrap transition",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
            o.value === value ? "bg-accent text-ink-950 shadow" : "text-fg-muted hover:text-fg",
            o.disabled && "opacity-40",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
