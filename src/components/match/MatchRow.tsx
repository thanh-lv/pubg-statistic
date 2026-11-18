import type { MatchSummary } from "@shared/types";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { MATCH_TYPES, mapInfo, matchModeLabel } from "@/lib/constants";
import { fmtDuration, fmtInt, timeAgo } from "@/lib/format";
import { PlaceBadge } from "../ui/PlaceBadge";

export function MatchRow({ match, playerId }: { match: MatchSummary; playerId: string }) {
  const me = match.participants.find((p) => p.playerId === playerId);
  if (!me) return null;
  const team = match.teams.find((t) => t.teamId === me.teamId);
  const mates = team
    ? match.participants.filter((p) => team.playerIds.includes(p.playerId) && p.playerId !== playerId)
    : [];
  const map = mapInfo(match.mapName);
  const won = me.winPlace === 1;

  return (
    <Link
      to={`/match/${match.id}?player=${playerId}`}
      className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-3 transition sm:gap-4 sm:px-4 ${
        won ? "border-accent/30 bg-accent/[0.06] hover:bg-accent/[0.1]" : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]"
      }`}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: map.color }} />
      <PlaceBadge place={me.winPlace} total={match.teamCount} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-semibold">{map.name}</span>
          <span className="text-xs text-fg-subtle">
            {matchModeLabel(match.gameMode)} · {MATCH_TYPES[match.matchType] ?? match.matchType}
          </span>
          {won && <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-ink-950 uppercase">Winner</span>}
        </div>
        <div className="mt-0.5 truncate text-xs text-fg-subtle">
          {timeAgo(match.createdAt)}
          {mates.length > 0 && <> · cùng {mates.map((m) => m.name).join(", ")}</>}
        </div>
      </div>

      <div className="num grid grid-cols-[2.25rem_3rem] gap-x-3 text-right text-sm sm:grid-cols-[2.5rem_3.5rem_3rem_4.5rem] sm:gap-x-5">
        <Stat label="Kill" value={fmtInt(me.kills)} strong={me.kills >= 5} />
        <Stat label="Dmg" value={fmtInt(me.damageDealt)} strong={me.damageDealt >= 500} />
        <Stat label="Assist" value={fmtInt(me.assists)} className="hidden sm:block" />
        <Stat label="Sống" value={fmtDuration(me.timeSurvived)} className="hidden sm:block" />
      </div>
      <ChevronRight className="hidden size-4 text-fg-subtle transition group-hover:translate-x-0.5 group-hover:text-fg sm:block" />
    </Link>
  );
}

function Stat({ label, value, strong, className }: { label: string; value: string; strong?: boolean; className?: string }) {
  return (
    <div className={className}>
      <div className={`font-semibold ${strong ? "text-accent" : ""}`}>{value}</div>
      <div className="font-sans text-[10px] text-fg-subtle">{label}</div>
    </div>
  );
}
