import { RefreshCw } from "lucide-react";
import { useSquad } from "@/hooks/useSquad";
import { LEVEL_STYLE, helmetInfo, helmetSrc, nextHelmet } from "@/lib/helmets";
import { cn, hashString } from "@/lib/utils";

/** Nền màu riêng cho từng người (class viết đầy đủ để Tailwind nhận diện). */
const BACKDROPS = [
  "from-amber-400/60 via-amber-500/20",
  "from-sky-400/60 via-sky-500/20",
  "from-pink-400/60 via-pink-500/20",
  "from-emerald-400/60 via-emerald-500/20",
  "from-violet-400/60 via-violet-500/20",
  "from-lime-400/55 via-lime-500/20",
  "from-cyan-400/60 via-cyan-500/20",
  "from-orange-400/60 via-orange-500/20",
];

const SIZES = {
  sm: "size-7 rounded-lg",
  md: "size-9 rounded-xl",
  lg: "size-12 rounded-2xl",
  xl: "size-16 rounded-3xl sm:size-20",
};

/**
 * Avatar = mũ bảo hiểm PUBG trên nền màu riêng.
 * `editable`: bấm để đổi sang mũ khác (lưu trong trình duyệt).
 */
export function Avatar({
  name,
  size = "md",
  color,
  editable,
  showLevel = size === "xl" || size === "lg",
}: {
  name: string;
  size?: keyof typeof SIZES;
  color?: string;
  editable?: boolean;
  showLevel?: boolean;
}) {
  const { helmetOf, setHelmet } = useSquad();
  const id = helmetOf(name);
  const info = helmetInfo(id);
  const backdrop = BACKDROPS[hashString(name.toLowerCase()) % BACKDROPS.length];

  const body = (
    <>
      <span
        className={cn("absolute inset-0 bg-gradient-to-br to-ink-800", backdrop, SIZES[size].split(" ").filter((c) => c.startsWith("rounded")).join(" "))}
      />
      <img
        src={helmetSrc(id)}
        alt=""
        draggable={false}
        loading="lazy"
        decoding="async"
        className="relative size-[92%] object-contain brightness-125 contrast-105 drop-shadow-[0_3px_4px_rgb(0_0_0/0.55)]"
      />
      {showLevel && (
        <span
          className={cn(
            "num absolute -right-1 -bottom-1 rounded-md px-1 text-[10px] leading-4 font-bold shadow ring-2 ring-ink-850",
            LEVEL_STYLE[info.level],
          )}
        >
          Lv.{info.level}
        </span>
      )}
      {editable && (
        <span className="absolute inset-0 grid place-items-center rounded-[inherit] bg-black/55 opacity-0 transition group-hover/avatar:opacity-100 group-focus-visible/avatar:opacity-100">
          <RefreshCw className="size-1/3 text-white" />
        </span>
      )}
    </>
  );

  const base = cn(
    "relative grid shrink-0 place-items-center select-none ring-1 ring-white/10",
    SIZES[size],
  );
  const style = color ? { boxShadow: `0 0 0 2px ${color}` } : undefined;

  if (editable) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setHelmet(name, nextHelmet(id));
        }}
        className={cn(base, "group/avatar cursor-pointer")}
        style={style}
        title={`${info.label} — bấm để đổi mũ`}
        aria-label={`Đổi mũ của ${name} (hiện tại: ${info.label})`}
      >
        {body}
      </button>
    );
  }
  return (
    <div className={base} style={style} title={info.label} aria-hidden>
      {body}
    </div>
  );
}
