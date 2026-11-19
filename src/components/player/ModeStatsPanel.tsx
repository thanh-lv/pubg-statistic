import { GAME_MODES, type GameMode, type ModeStats } from "@shared/types";
import { Crown, Crosshair, Flame, Skull, Trophy } from "lucide-react";
import { useState } from "react";
import { MODE_LABELS } from "@/lib/constants";
import { fmt1, fmt2, fmtDuration, fmtInt, fmtMeters, fmtPct } from "@/lib/format";
import { derive, playstyle } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { TermKey } from "@/lib/glossary";
import { MiniStat, StatTile } from "../ui/StatTile";
import { Label } from "../ui/Tip";
import { Segmented } from "../ui/Segmented";
import { EmptyState } from "../ui/States";

export function ModeStatsPanel({ modes, preferred }: { modes: Partial<Record<GameMode, ModeStats>>; preferred: GameMode }) {
  const played = GAME_MODES.filter((m) => (modes[m]?.roundsPlayed ?? 0) > 0);
  const fallback = played.includes(preferred)
    ? preferred
    : ([...played].sort((a, b) => modes[b]!.roundsPlayed - modes[a]!.roundsPlayed)[0] ?? preferred);
  const [picked, setPicked] = useState<GameMode | null>(null);
  const mode = picked && played.includes(picked) ? picked : fallback;

  if (!played.length) {
    return (
      <EmptyState icon={<Crosshair className="size-7" />} title="Chưa có trận nào">
        Người chơi chưa chơi trận thường nào trong mùa này.
      </EmptyState>
    );
  }

  const s = modes[mode]!;
  const d = derive(s)!;

  return (
    <div className="space-y-4">
      <Segmented
        value={mode}
        onChange={setPicked}
        options={GAME_MODES.map((m) => ({
          value: m,
          label: `${MODE_LABELS[m]}${modes[m]?.roundsPlayed ? ` · ${modes[m]!.roundsPlayed}` : ""}`,
          disabled: !played.includes(m),
        }))}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile highlight term="kd" label="K/D" value={fmt2(d.kd)} hint={`KDA ${fmt2(d.kda)} · ${fmtInt(s.kills)} kill`} icon={<Skull className="size-4" />} />
        <StatTile term="adr" label="Sát thương TB (ADR)" value={fmtInt(d.avgDamage)} hint={`Tổng ${fmtInt(s.damageDealt)}`} icon={<Flame className="size-4" />} />
        <StatTile term="winRate" label="Tỉ lệ thắng" value={fmtPct(d.winRate)} hint={`${fmtInt(s.wins)} gà / ${fmtInt(s.roundsPlayed)} trận`} icon={<Trophy className="size-4" />} />
        <StatTile term="top10Rate" label="Top 10" value={fmtPct(d.top10Rate)} hint={`${fmtInt(s.top10s)} lần`} icon={<Crosshair className="size-4" />} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="card px-4 py-2">
          <h3 className="pt-2 pb-1 text-xs font-semibold tracking-wide text-fg-subtle uppercase">Chiến đấu</h3>
          <MiniStat term="avgKills" label="Kill / trận" value={fmt2(d.avgKills)} />
          <MiniStat term="hsRate" label="Headshot" value={`${fmtInt(s.headshotKills)} · ${fmtPct(d.hsRate)}`} />
          <MiniStat term="dBNOs" label="Hạ gục (knock)" value={fmtInt(s.dBNOs)} />
          <MiniStat term="assists" label="Hỗ trợ" value={fmtInt(s.assists)} />
          <MiniStat term="longestKill" label="Kill xa nhất" value={fmtMeters(s.longestKill)} />
          <MiniStat term="roundMostKills" label="Kill nhiều nhất 1 trận" value={fmtInt(s.roundMostKills)} />
          <MiniStat term="maxKillStreaks" label="Chuỗi kill dài nhất" value={fmtInt(s.maxKillStreaks)} />
        </div>
        <div className="card px-4 py-2">
          <h3 className="pt-2 pb-1 text-xs font-semibold tracking-wide text-fg-subtle uppercase">Sinh tồn</h3>
          <MiniStat term="avgSurvival" label="Sống sót TB" value={fmtDuration(d.avgSurvival)} />
          <MiniStat label="Sống lâu nhất" value={fmtDuration(s.longestTimeSurvived)} />
          <MiniStat term="revives" label="Cứu đồng đội" value={fmtInt(s.revives)} />
          <MiniStat term="heals" label="Hồi máu" value={fmtInt(s.heals)} />
          <MiniStat term="boosts" label="Doping" value={fmtInt(s.boosts)} />
          <MiniStat label="Bắn đồng đội" value={fmtInt(s.teamKills)} />
          <MiniStat label="Tự sát" value={fmtInt(s.suicides)} />
        </div>
        <div className="card px-4 py-2">
          <h3 className="pt-2 pb-1 text-xs font-semibold tracking-wide text-fg-subtle uppercase">Di chuyển & khác</h3>
          <MiniStat label="Đi bộ" value={fmtMeters(s.walkDistance)} />
          <MiniStat label="Lái xe" value={fmtMeters(s.rideDistance)} />
          <MiniStat label="Bơi" value={fmtMeters(s.swimDistance)} />
          <MiniStat label="Kill bằng xe" value={fmtInt(s.roadKills)} />
          <MiniStat label="Phá xe" value={fmtInt(s.vehicleDestroys)} />
          <MiniStat label="Nhặt vũ khí" value={fmtInt(s.weaponsAcquired)} />
          <MiniStat label="Kill tuần này" value={`${fmtInt(s.weeklyKills)} · ${fmtInt(s.weeklyWins)} gà`} />
        </div>
      </div>

      <Playstyle s={s} solo={mode.startsWith("solo")} />
      {played.length > 1 && <ModeCompare modes={modes} played={played} current={mode} onPick={setPicked} />}
    </div>
  );
}

/** Hiển thị số hoặc "—" khi không có dữ liệu */
const show = (v: number | null, f: (n: number) => string) => (v == null || !Number.isFinite(v) ? "—" : f(v));

function Playstyle({ s, solo }: { s: ModeStats; solo: boolean }) {
  const p = playstyle(s, solo);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="card px-4 py-2">
        <h3 className="pt-2 pb-1 text-xs font-semibold tracking-wide text-fg-subtle uppercase">Hiệu quả</h3>
        <MiniStat
          term="winConversion"
          label="Chốt gà (gà ÷ Top 10)"
          value={p.winConversion == null ? "—" : `${fmtPct(p.winConversion)} · ${fmtInt(s.wins)}/${fmtInt(s.top10s)}`}
        />
        <MiniStat term="dmgPerKill" label="Sát thương mỗi kill" value={show(p.dmgPerKill, fmtInt)} />
        {!solo && <MiniStat term="knockPerKill" label="Knock / kill" value={show(p.knockPerKill, fmt2)} />}
        <MiniStat term="killPace" label="Kill / 10 phút sống" value={show(p.killsPer10Min, fmt2)} />
        <MiniStat label="Ngày chơi" value={`${fmtInt(s.days)} ngày · ${show(p.roundsPerDay, fmt1)} trận/ngày`} />
      </div>
      <div className="card px-4 py-2">
        <h3 className="pt-2 pb-1 text-xs font-semibold tracking-wide text-fg-subtle uppercase">Trung bình mỗi trận</h3>
        <MiniStat term="heals" label="Hồi máu · doping" value={`${show(p.healsPerRound, fmt1)} · ${show(p.boostsPerRound, fmt1)}`} />
        {!solo && <MiniStat term="revives" label="Cứu đồng đội" value={show(p.revivesPerRound, fmt2)} />}
        <MiniStat label="Nhặt vũ khí" value={show(p.weaponsPerRound, fmt1)} />
        <MiniStat label="Đi bộ" value={show(p.walkPerRound, fmtMeters)} />
        <MiniStat term="ridePct" label="Tỉ lệ đi xe" value={show(p.ridePct, fmtPct)} />
      </div>
    </div>
  );
}

/* ------------------------------ so sánh các chế độ ------------------------------ */

/** Chế độ có ít trận hơn mức này không được tính "tốt nhất" (tránh nhiễu) */
const MIN_ROUNDS = 5;

const COMPARE: { label: string; term?: TermKey; value: (s: ModeStats) => number | null; fmt: (n: number) => string; best?: boolean }[] = [
  { label: "Trận", value: (s) => s.roundsPlayed, fmt: fmtInt },
  { label: "K/D", term: "kd", value: (s) => derive(s)!.kd, fmt: fmt2, best: true },
  { label: "ADR", term: "adr", value: (s) => derive(s)!.avgDamage, fmt: fmtInt, best: true },
  { label: "Thắng", term: "winRate", value: (s) => derive(s)!.winRate, fmt: fmtPct, best: true },
  { label: "Top 10", term: "top10Rate", value: (s) => derive(s)!.top10Rate, fmt: fmtPct, best: true },
  { label: "Chốt gà", term: "winConversion", value: (s) => (s.top10s ? s.wins / s.top10s : null), fmt: fmtPct, best: true },
  { label: "Headshot", term: "hsRate", value: (s) => derive(s)!.hsRate, fmt: fmtPct, best: true },
  { label: "Sống TB", term: "avgSurvival", value: (s) => derive(s)!.avgSurvival, fmt: fmtDuration, best: true },
];

function ModeCompare({
  modes,
  played,
  current,
  onPick,
}: {
  modes: Partial<Record<GameMode, ModeStats>>;
  played: GameMode[];
  current: GameMode;
  onPick: (m: GameMode) => void;
}) {
  const eligible = played.filter((m) => modes[m]!.roundsPlayed >= MIN_ROUNDS);
  const bestOf = COMPARE.map((c) => (c.best ? Math.max(...eligible.map((m) => c.value(modes[m]!) ?? -Infinity)) : null));

  return (
    <div className="card overflow-hidden">
      <h3 className="px-4 pt-3 pb-2 text-xs font-semibold tracking-wide text-fg-subtle uppercase">So sánh các chế độ</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="text-xs text-fg-subtle">
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-2 text-left font-medium">Chế độ</th>
              {COMPARE.map((c) => (
                <th key={c.label} className="px-3 py-2 text-right font-medium">
                  <Label term={c.term}>{c.label}</Label>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="num">
            {played.map((m) => {
              const s = modes[m]!;
              const ok = s.roundsPlayed >= MIN_ROUNDS;
              return (
                <tr
                  key={m}
                  onClick={() => onPick(m)}
                  className={cn("cursor-pointer border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03]", m === current && "bg-accent/[0.06]")}
                >
                  <td className="px-4 py-2 font-medium">
                    {MODE_LABELS[m]}
                    {!ok && <span className="ml-1 text-xs font-normal text-fg-subtle">(ít trận)</span>}
                  </td>
                  {COMPARE.map((c, i) => {
                    const v = c.value(s);
                    const best = ok && eligible.length > 1 && v != null && v === bestOf[i];
                    return (
                      <td key={c.label} className={cn("px-3 py-2 text-right", best && "font-semibold text-accent", !ok && "text-fg-muted")}>
                        {best && <Crown className="mr-1 inline size-3" />}
                        {show(v, c.fmt)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2 text-[11px] text-fg-subtle">
        Bấm 1 dòng để xem chi tiết chế độ đó. Vương miện = tốt nhất trong các chế độ có từ {MIN_ROUNDS} trận.
      </p>
    </div>
  );
}
