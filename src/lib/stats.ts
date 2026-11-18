import type { ModeStats } from "@shared/types";
import { fmt2, fmtDuration, fmtInt, fmtMeters, fmtPct } from "./format";
import type { TermKey } from "./glossary";

export interface Derived {
  rounds: number;
  wins: number;
  kills: number;
  kd: number;
  kda: number;
  winRate: number;
  top10Rate: number;
  avgDamage: number;
  avgKills: number;
  hsRate: number;
  avgSurvival: number;
  longestKill: number;
  roundMostKills: number;
  maxKillStreaks: number;
  assists: number;
  dBNOs: number;
  revives: number;
  damage: number;
}

export function derive(s: ModeStats | null | undefined): Derived | null {
  if (!s || !s.roundsPlayed) return null;
  const r = s.roundsPlayed;
  const deaths = Math.max(1, r - s.wins);
  return {
    rounds: r,
    wins: s.wins,
    kills: s.kills,
    kd: s.kills / deaths,
    kda: (s.kills + s.assists) / deaths,
    winRate: s.wins / r,
    top10Rate: s.top10s / r,
    avgDamage: s.damageDealt / r,
    avgKills: s.kills / r,
    hsRate: s.kills ? s.headshotKills / s.kills : 0,
    avgSurvival: s.timeSurvived / r,
    longestKill: s.longestKill,
    roundMostKills: s.roundMostKills,
    maxKillStreaks: s.maxKillStreaks,
    assists: s.assists,
    dBNOs: s.dBNOs,
    revives: s.revives,
    damage: s.damageDealt,
  };
}

export type MetricKey = keyof Derived;

export interface Metric {
  key: MetricKey;
  label: string;
  short: string;
  format: (v: number) => string;
  term: TermKey;
}

export const METRICS: Record<string, Metric> = {
  rounds: { key: "rounds", label: "Số trận", short: "Trận", format: fmtInt, term: "rounds" },
  wins: { key: "wins", label: "Chicken Dinner", short: "Top 1", format: fmtInt, term: "wins" },
  winRate: { key: "winRate", label: "Tỉ lệ thắng", short: "Win%", format: fmtPct, term: "winRate" },
  top10Rate: { key: "top10Rate", label: "Tỉ lệ Top 10", short: "Top10%", format: fmtPct, term: "top10Rate" },
  kd: { key: "kd", label: "K/D", short: "K/D", format: fmt2, term: "kd" },
  kda: { key: "kda", label: "KDA", short: "KDA", format: fmt2, term: "kda" },
  kills: { key: "kills", label: "Tổng kill", short: "Kill", format: fmtInt, term: "kills" },
  avgKills: { key: "avgKills", label: "Kill / trận", short: "Kill/trận", format: fmt2, term: "avgKills" },
  avgDamage: { key: "avgDamage", label: "Sát thương TB", short: "ADR", format: fmtInt, term: "adr" },
  hsRate: { key: "hsRate", label: "Tỉ lệ headshot", short: "HS%", format: fmtPct, term: "hsRate" },
  longestKill: { key: "longestKill", label: "Kill xa nhất", short: "Xa nhất", format: fmtMeters, term: "longestKill" },
  roundMostKills: { key: "roundMostKills", label: "Kill nhiều nhất 1 trận", short: "Max kill", format: fmtInt, term: "roundMostKills" },
  avgSurvival: { key: "avgSurvival", label: "Sống sót TB", short: "Sống TB", format: fmtDuration, term: "avgSurvival" },
  dBNOs: { key: "dBNOs", label: "Hạ gục (knock)", short: "Knock", format: fmtInt, term: "dBNOs" },
  assists: { key: "assists", label: "Hỗ trợ", short: "Assist", format: fmtInt, term: "assists" },
  revives: { key: "revives", label: "Cứu đồng đội", short: "Revive", format: fmtInt, term: "revives" },
};

export const LEADERBOARD_COLUMNS: MetricKey[] = [
  "rounds",
  "wins",
  "winRate",
  "top10Rate",
  "kd",
  "avgDamage",
  "avgKills",
  "hsRate",
  "longestKill",
  "roundMostKills",
];

export const COMPARE_METRICS: MetricKey[] = ["kd", "avgDamage", "winRate", "top10Rate", "hsRate", "avgKills", "rounds", "wins"];

