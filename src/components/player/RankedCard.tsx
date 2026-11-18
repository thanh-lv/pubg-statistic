import type { RankedModeStats } from "@shared/types";
import { Medal } from "lucide-react";
import { MODE_LABELS, TIER_COLORS } from "@/lib/constants";
import { fmt1, fmt2, fmtInt, fmtPct } from "@/lib/format";
import type { TermKey } from "@/lib/glossary";
import { InfoTip, Label } from "../ui/Tip";

export function RankedCard({ mode, s, wide }: { mode: string; s: RankedModeStats; wide?: boolean }) {
  const color = TIER_COLORS[s.currentTier.tier] ?? "#9aa1b2";
  const tierName = (t: { tier: string; subTier: string }) =>
    ["Master", "Survivor", "Unranked"].includes(t.tier) ? t.tier : `${t.tier} ${t.subTier}`;
  return (
    <div className="card relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full opacity-20 blur-3xl" style={{ background: color }} />
      <div className={wide ? "flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between" : undefined}>
      <div className="flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-2xl ring-2" style={{ background: `${color}22`, color, boxShadow: `inset 0 0 0 2px ${color}55` }}>
          <Medal className="size-8" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Rank · {MODE_LABELS[mode as keyof typeof MODE_LABELS] ?? mode}</div>
          <div className="flex items-center gap-1.5 font-display text-2xl font-bold" style={{ color }}>
            {tierName(s.currentTier)}
            <InfoTip term="tier" />
          </div>
          <div className="num text-sm text-fg-muted">
            <Label term="rp">{fmtInt(s.currentRankPoint)} RP</Label> · cao nhất {tierName(s.bestTier)}
          </div>
        </div>
      </div>
      <div className={wide ? "grid grid-cols-3 gap-3 text-center sm:grid-cols-6 lg:min-w-[34rem]" : "mt-5 grid grid-cols-3 gap-3 text-center sm:grid-cols-6"}>
        {[
          ["Trận", fmtInt(s.roundsPlayed), "rounds"],
          ["KDA", fmt2(s.kda), "kda"],
          ["Hạng TB", fmt1(s.avgRank), "avgRank"],
          ["Win%", fmtPct(s.winRatio), "winRate"],
          ["Top10%", fmtPct(s.top10Ratio), "top10Rate"],
          ["ADR", fmtInt(s.roundsPlayed ? s.damageDealt / s.roundsPlayed : 0), "adr"],
        ].map(([l, v, t]) => (
          <div key={l} className="rounded-xl bg-white/[0.03] px-2 py-2.5">
            <div className="num text-lg font-semibold">{v}</div>
            <Label term={t as TermKey} className="text-[11px] text-fg-subtle">{l}</Label>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
