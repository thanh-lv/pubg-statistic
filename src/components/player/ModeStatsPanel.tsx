import { GAME_MODES, type GameMode, type ModeStats } from "@shared/types";
import { Crosshair, Flame, Skull, Trophy } from "lucide-react";
import { useState } from "react";
import { MODE_LABELS } from "@/lib/constants";
import { fmt2, fmtDuration, fmtInt, fmtMeters, fmtPct } from "@/lib/format";
import { derive } from "@/lib/stats";
import { MiniStat, StatTile } from "../ui/StatTile";
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
    </div>
  );
}
