import type { MatchParticipant, MatchSummary } from "@shared/types";
import { ArrowLeft, Bot, CalendarClock, Clock, Map as MapIcon, Users } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { PlaceBadge } from "@/components/ui/PlaceBadge";
import { useMatch } from "@/hooks/queries";
import { useSquad } from "@/hooks/useSquad";
import { MATCH_TYPES, mapInfo, matchModeLabel } from "@/lib/constants";
import { fmtDate, fmtDuration, fmtInt, fmtMeters } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MatchPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const playerId = params.get("player");
  const navigate = useNavigate();
  const q = useMatch(id);

  const back = (
    <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
      <ArrowLeft className="size-4" /> Quay lại
    </button>
  );

  if (q.isPending) {
    return (
      <div className="space-y-6">
        {back}
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  const m = q.data.data;
  const map = mapInfo(m.mapName);
  const me = m.participants.find((p) => p.playerId === playerId);
  const myTeam = me ? m.teams.find((t) => t.teamId === me.teamId) : undefined;

  return (
    <div className="space-y-6">
      {back}

      <section className="card relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ background: `radial-gradient(40rem 16rem at 100% 0%, ${map.color}, transparent 70%)` }} />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          {me && <PlaceBadge place={me.winPlace} total={m.teamCount} className="size-20 [&_.num]:text-3xl" />}
          <div className="flex-1">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: map.color }}>
              {matchModeLabel(m.gameMode)} · {MATCH_TYPES[m.matchType] ?? m.matchType}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{map.name}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
              <span className="inline-flex items-center gap-1.5"><CalendarClock className="size-4" />{fmtDate(m.createdAt)}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="size-4" />{fmtDuration(m.duration)}</span>
              <span className="inline-flex items-center gap-1.5"><Users className="size-4" />{m.participants.length} người · {m.teamCount} đội</span>
              <span className="inline-flex items-center gap-1.5"><Bot className="size-4" />{m.participants.filter((p) => p.isBot).length} bot</span>
            </div>
          </div>
        </div>
      </section>

      {myTeam && (
        <section className="card overflow-hidden">
          <h2 className="border-b border-white/[0.06] px-5 py-3 font-display text-lg font-semibold">
            Đội của {me!.name} <span className="text-fg-subtle">· hạng #{myTeam.rank}</span>
          </h2>
          <ParticipantTable rows={m.participants.filter((p) => myTeam.playerIds.includes(p.playerId))} highlight={playerId} />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <h2 className="border-b border-white/[0.06] px-5 py-3 font-display text-lg font-semibold">Top sát thủ</h2>
          <ParticipantTable rows={[...m.participants].sort((a, b) => b.kills - a.kills || b.damageDealt - a.damageDealt).slice(0, 10)} highlight={playerId} compact />
        </section>
        <TopTeams match={m} highlightTeam={myTeam?.teamId} />
      </div>
    </div>
  );
}

function ParticipantTable({ rows, highlight, compact }: { rows: MatchParticipant[]; highlight: string | null; compact?: boolean }) {
  const { players } = useSquad();
  const squadSet = new Set(players.map((n) => n.toLowerCase()));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-fg-subtle">
            <th className="py-2.5 pl-5 font-medium">Người chơi</th>
            <th className="px-3 text-right font-medium">Kill</th>
            {!compact && <th className="px-3 text-right font-medium">Assist</th>}
            {!compact && <th className="px-3 text-right font-medium">Knock</th>}
            <th className="px-3 text-right font-medium">Dmg</th>
            {!compact && <th className="px-3 text-right font-medium">HS</th>}
            {!compact && <th className="px-3 text-right font-medium">Xa nhất</th>}
            {!compact && <th className="px-3 text-right font-medium">Sống</th>}
            {!compact && <th className="px-3 text-right font-medium">Revive</th>}
            {compact && <th className="pr-5 text-right font-medium">Hạng</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const isMe = p.playerId === highlight;
            const inSquad = squadSet.has(p.name.toLowerCase());
            return (
              <tr key={p.playerId} className={cn("border-t border-white/[0.04]", isMe && "bg-accent/[0.07]")}>
                <td className="py-2.5 pl-5">
                  {p.isBot ? (
                    <span className="inline-flex items-center gap-1.5 text-fg-subtle"><Bot className="size-3.5" />{p.name}</span>
                  ) : (
                    <Link to={`/player/${encodeURIComponent(p.name)}`} className={cn("font-medium hover:text-accent", (isMe || inSquad) && "text-accent")}>
                      {p.name}
                    </Link>
                  )}
                </td>
                <td className="num px-3 text-right font-semibold">{p.kills}</td>
                {!compact && <td className="num px-3 text-right">{p.assists}</td>}
                {!compact && <td className="num px-3 text-right">{p.dBNOs}</td>}
                <td className="num px-3 text-right">{fmtInt(p.damageDealt)}</td>
                {!compact && <td className="num px-3 text-right">{p.headshotKills}</td>}
                {!compact && <td className="num px-3 text-right whitespace-nowrap">{fmtMeters(p.longestKill)}</td>}
                {!compact && <td className="num px-3 text-right whitespace-nowrap">{fmtDuration(p.timeSurvived)}</td>}
                {!compact && <td className="num px-3 text-right">{p.revives}</td>}
                {compact && <td className="num pr-5 text-right text-fg-muted">#{p.winPlace}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TopTeams({ match, highlightTeam }: { match: MatchSummary; highlightTeam?: number }) {
  const byId = new Map(match.participants.map((p) => [p.playerId, p]));
  return (
    <section className="card overflow-hidden">
      <h2 className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3 font-display text-lg font-semibold">
        <MapIcon className="size-4 text-fg-subtle" /> Top 10 đội
      </h2>
      <ul className="divide-y divide-white/[0.04]">
        {match.teams.slice(0, 10).map((t) => {
          const members = t.playerIds.map((id) => byId.get(id)).filter((p): p is MatchParticipant => !!p);
          const kills = members.reduce((a, p) => a + p.kills, 0);
          const dmg = members.reduce((a, p) => a + p.damageDealt, 0);
          return (
            <li key={t.teamId} className={cn("flex items-center gap-3 px-5 py-2.5", t.teamId === highlightTeam && "bg-accent/[0.07]")}>
              <span className={cn("num w-8 font-bold", t.rank === 1 ? "text-accent" : "text-fg-subtle")}>#{t.rank}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{members.map((p) => p.name).join(", ")}</span>
              <span className="num text-sm whitespace-nowrap text-fg-muted">
                {kills} kill · {fmtInt(dmg)} dmg
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
