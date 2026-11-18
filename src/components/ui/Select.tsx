import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Select({
  value,
  onChange,
  options,
  className,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  label: string;
}) {
  return (
    <label className={cn("relative inline-flex", className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input cursor-pointer appearance-none py-2 pr-9 font-medium"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-ink-850">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-subtle" />
    </label>
  );
}
