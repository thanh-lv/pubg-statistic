import type { MatchSummary } from "@shared/types";
import { History, Loader2 } from "lucide-react";
import { useState } from "react";
import { useMatches } from "@/hooks/queries";
import { fmt1, fmtInt } from "@/lib/format";
import type { TermKey } from "@/lib/glossary";
import { MatchRow } from "../match/MatchRow";
import { Label } from "../ui/Tip";
import { Skeleton } from "../ui/Skeleton";
import { BarSpark } from "../ui/Sparkline";
import { EmptyState } from "../ui/States";
import { DeathCauses } from "./DeathCauses";

const PAGE = 10;

export function RecentMatches({ playerId, matchIds }: { playerId: string; matchIds: string[] }) {
  const [limit, setLimit] = useState(PAGE);
  const visible = matchIds.slice(0, limit);
  const results = useMatches(visible);
  const loaded = results.map((r) => r.data?.data).filter((m): m is MatchSummary => !!m);
  const pending = results.some((r) => r.isPending);

  if (!matchIds.length) {
    return (
      <EmptyState icon={<History className="size-7" />} title="Không có trận gần đây">
        PUBG API chỉ lưu lịch sử trận đấu trong khoảng 14 ngày.
      </EmptyState>
    );
  }

  const mine = loaded
    .map((m) => m.participants.find((p) => p.playerId === playerId))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const n = mine.length || 1;
  const summary = {
    wins: mine.filter((p) => p.winPlace === 1).length,
    top10: mine.filter((p) => p.winPlace <= 10).length,
    avgPlace: mine.reduce((a, p) => a + p.winPlace, 0) / n,
    avgKills: mine.reduce((a, p) => a + p.kills, 0) / n,
    avgDmg: mine.reduce((a, p) => a + p.damageDealt, 0) / n,
  };
  // Biểu đồ: cũ → mới (trái → phải)
  const chrono = [...mine].reverse();

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Phong độ gần đây</h2>
        <span className="text-xs text-fg-subtle">
          {loaded.length}/{matchIds.length} trận trong ~14 ngày
        </span>
      </div>

      {mine.length > 0 && (
        <div className="mb-5 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="grid grid-cols-6 gap-2 self-start *:col-span-2 *:nth-[n+4]:col-span-3 sm:grid-cols-5 sm:*:col-span-1 sm:*:nth-[n+4]:col-span-1">
            {[
              ["Gà", fmtInt(summary.wins), "wins"],
              ["Top 10", fmtInt(summary.top10), "top10Rate"],
              ["Hạng TB", fmt1(summary.avgPlace), "avgRank"],
              ["Kill TB", fmt1(summary.avgKills), "avgKills"],
              ["ADR", fmtInt(summary.avgDmg), "adr"],
            ].map(([l, v, t]) => (
              <div key={l} className="rounded-xl bg-white/[0.03] px-2 py-2.5 sm:px-3">
                <div className="num text-lg font-semibold sm:text-xl">{v}</div>
                <Label term={t as TermKey} className="text-[11px] whitespace-nowrap text-fg-subtle">{l}</Label>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-white/[0.02] p-3">
            <div className="mb-2 flex items-center justify-between text-[11px] text-fg-subtle">
              <span>Sát thương mỗi trận (cũ → mới)</span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-accent" /> Top 10
              </span>
            </div>
            <BarSpark
              label="Sát thương mỗi trận"
              values={chrono.map((p) => p.damageDealt)}
              highlight={(i) => chrono[i].winPlace <= 10}
              height={72}
            />
          </div>
        </div>
      )}

      <DeathCauses rows={mine} />

      <div className="space-y-2">
        {visible.map((id, i) => {
          const r = results[i];
          if (r?.data) return <MatchRow key={id} match={r.data.data} playerId={playerId} />;
          if (r?.isError) return null;
          return <Skeleton key={id} className="h-[74px] rounded-xl" />;
        })}
      </div>

      {limit < matchIds.length && (
        <button className="btn-ghost mt-4 w-full" disabled={pending} onClick={() => setLimit((l) => l + PAGE)}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Xem thêm ({matchIds.length - limit} trận)
        </button>
      )}
    </div>
  );
}
