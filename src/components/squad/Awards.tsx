import { Crosshair, Flame, Skull, Swords, Target, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import type { MetricKey } from "@/lib/stats";
import { METRICS } from "@/lib/stats";
import { Avatar } from "../ui/Avatar";
import { Label } from "../ui/Tip";
import type { SquadRow } from "./types";

const AWARDS: { key: MetricKey; title: string; icon: ReactNode; minRounds?: number }[] = [
  { key: "kd", title: "Sát thủ", icon: <Skull className="size-4" />, minRounds: 5 },
  { key: "wins", title: "Vua gà", icon: <Trophy className="size-4" /> },
  { key: "avgDamage", title: "Máy dame", icon: <Flame className="size-4" />, minRounds: 5 },
  { key: "hsRate", title: "Thiện xạ", icon: <Crosshair className="size-4" />, minRounds: 5 },
  { key: "longestKill", title: "Bắn tỉa", icon: <Target className="size-4" /> },
  { key: "roundMostKills", title: "Càn quét", icon: <Swords className="size-4" /> },
];

export function Awards({ rows }: { rows: SquadRow[] }) {
  const awards = AWARDS.map((a) => {
    const eligible = rows.filter((r) => r.d && r.d.rounds >= (a.minRounds ?? 1));
    const best = eligible.reduce<SquadRow | null>((b, r) => (!b || r.d![a.key] > b.d![a.key] ? r : b), null);
    return { ...a, best };
  }).filter((a) => a.best && a.best.d![a.key] > 0);

  if (!awards.length) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {awards.map(({ key, title, icon, best }, i) => (
        <Link
          key={key}
          to={`/player/${encodeURIComponent(best!.name)}`}
          className="card group animate-fade-in p-4 transition hover:-translate-y-0.5 hover:border-accent/30"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-accent uppercase">
            {icon}
            {title}
          </div>
          <div className="num mt-2 text-2xl font-bold">{METRICS[key].format(best!.d![key])}</div>
          <Label term={METRICS[key].term} className="text-[11px] text-fg-subtle">{METRICS[key].label}</Label>
          <div className="mt-3 flex items-center gap-2">
            <Avatar name={best!.name} size="sm" />
            <span className="truncate text-sm font-medium group-hover:text-accent">{best!.name}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
