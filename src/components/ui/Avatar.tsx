import { cn, hashString } from "@/lib/utils";

const GRADIENTS = [
  "from-amber-400 to-orange-600",
  "from-sky-400 to-indigo-600",
  "from-pink-400 to-rose-600",
  "from-emerald-400 to-teal-600",
  "from-violet-400 to-purple-700",
  "from-lime-400 to-green-600",
  "from-cyan-400 to-blue-600",
  "from-fuchsia-400 to-pink-700",
];

export function Avatar({ name, size = "md", color }: { name: string; size?: "sm" | "md" | "lg" | "xl"; color?: string }) {
  const g = GRADIENTS[hashString(name) % GRADIENTS.length];
  const sizes = {
    sm: "size-7 text-xs rounded-lg",
    md: "size-9 text-sm rounded-xl",
    lg: "size-12 text-lg rounded-2xl",
    xl: "size-16 text-2xl sm:size-20 sm:text-3xl rounded-3xl",
  };
  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center bg-gradient-to-br font-display font-bold text-ink-950 uppercase select-none",
        g,
        sizes[size],
      )}
      style={color ? { boxShadow: `0 0 0 2px ${color}` } : undefined}
      aria-hidden
    >
      {name.slice(0, 2)}
    </div>
  );
}
