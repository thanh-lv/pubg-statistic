/**
 * Thống kê "Chơi chung" từ lịch sử trận gần đây (bản rút gọn MatchBrief).
 * Một "lượt" (Appearance) = một đội trong một trận có ít nhất 1 người trong đội hình theo dõi.
 */
import { GAME_MODES, type BriefPlayer, type MatchBrief } from "@shared/types";

export type MatchFilter = "all" | "official" | "competitive";

const BR_MODES = new Set<string>(GAME_MODES);

export interface Appearance {
  match: MatchBrief;
  /** Thành viên theo dõi cùng đội trong trận, theo thứ tự đội hình */
  members: BriefPlayer[];
  /** id các thành viên, nối bằng "," — dùng nhóm đội hình */
  key: string;
  rank: number;
  t: number;
}

/** Trận battle royale thật (bỏ custom, TDM, arcade…) */
export function isBattleRoyale(m: MatchBrief, filter: MatchFilter = "all") {
  if (m.isCustomMatch || !BR_MODES.has(m.gameMode)) return false;
  if (filter === "all") return m.matchType === "official" || m.matchType === "competitive";
  return m.matchType === filter;
}

export function toAppearances(briefs: MatchBrief[], order: string[], filter: MatchFilter): Appearance[] {
  const idx = new Map(order.map((id, i) => [id, i]));
  const out: Appearance[] = [];
  for (const m of briefs) {
    if (!isBattleRoyale(m, filter) || m.players.length === 0) continue;
    const teams = new Map<string, BriefPlayer[]>();
    for (const p of m.players) {
      const k = p.teamId == null ? `solo:${p.playerId}` : String(p.teamId);
      teams.set(k, [...(teams.get(k) ?? []), p]);
    }
    for (const members of teams.values()) {
      members.sort((a, b) => (idx.get(a.playerId) ?? 99) - (idx.get(b.playerId) ?? 99));
      out.push({
        match: m,
        members,
        key: members.map((p) => p.playerId).join(","),
        rank: members[0].winPlace,
        t: Date.parse(m.createdAt),
      });
    }
  }
  return out.sort((a, b) => b.t - a.t);
}

/* ------------------------------ cộng dồn ------------------------------ */

export interface Agg {
  /** số lượt (đội-trận) */
  n: number;
  wins: number;
  top10: number;
  rankSum: number;
  /** số người-trận (để tính trung bình mỗi người) */
  pn: number;
  kills: number;
  damage: number;
  knocks: number;
}

export const emptyAgg = (): Agg => ({ n: 0, wins: 0, top10: 0, rankSum: 0, pn: 0, kills: 0, damage: 0, knocks: 0 });

export function addApp(a: Agg, app: Appearance, only?: BriefPlayer[]) {
  const ps = only ?? app.members;
  a.n++;
  if (app.rank === 1) a.wins++;
  if (app.rank > 0 && app.rank <= 10) a.top10++;
  a.rankSum += app.rank;
  for (const p of ps) {
    a.pn++;
    a.kills += p.kills;
    a.damage += p.damageDealt;
    a.knocks += p.dBNOs;
  }
  return a;
}

export function view(a: Agg) {
  const n = a.n || 1;
  const pn = a.pn || 1;
  return {
    n: a.n,
    wins: a.wins,
    winRate: a.wins / n,
    top10Rate: a.top10 / n,
    avgRank: a.rankSum / n,
    /** kill trung bình mỗi người mỗi trận */
    killsPP: a.kills / pn,
    dmgPP: a.damage / pn,
    /** tổng kill của cả nhóm mỗi trận */
    teamKills: a.kills / n,
    teamDmg: a.damage / n,
  };
}
export type AggView = ReturnType<typeof view>;

/* ------------------------------ các góc nhìn ------------------------------ */

export function summary(apps: Appearance[], trackedCount: number) {
  const matches = new Set(apps.map((a) => a.match.id));
  const together = apps.filter((a) => a.members.length >= 2);
  const full = trackedCount >= 2 ? apps.filter((a) => a.members.length === trackedCount) : [];
  const total = addAppAll(apps);
  const times = apps.map((a) => a.t);
  return {
    matches: matches.size,
    together: together.length,
    full: full.length,
    total: view(total),
    from: times.length ? Math.min(...times) : null,
    to: times.length ? Math.max(...times) : null,
  };
}

function addAppAll(apps: Appearance[]) {
  const a = emptyAgg();
  for (const app of apps) addApp(a, app);
  return a;
}

/** Thành tích theo từng đội hình (tổ hợp người chơi cùng đội) */
export function lineups(apps: Appearance[]) {
  const by = new Map<string, { members: BriefPlayer[]; agg: Agg }>();
  for (const app of apps) {
    let e = by.get(app.key);
    if (!e) by.set(app.key, (e = { members: app.members, agg: emptyAgg() }));
    addApp(e.agg, app);
  }
  return [...by.entries()]
    .map(([key, e]) => ({ key, members: e.members, ...view(e.agg) }))
    .sort((a, b) => b.n - a.n || a.avgRank - b.avgRank);
}

/** Mỗi người: khi có ít nhất 1 người quen cùng đội vs khi đi một mình */
export function withVsAlone(apps: Appearance[], ids: string[]) {
  return ids.map((id) => {
    const together = emptyAgg();
    const alone = emptyAgg();
    for (const app of apps) {
      const me = app.members.find((p) => p.playerId === id);
      if (!me) continue;
      addApp(app.members.length >= 2 ? together : alone, app, [me]);
    }
    return { id, together: view(together), alone: view(alone) };
  });
}

export function byMap(apps: Appearance[]) {
  const by = new Map<string, Agg>();
  for (const app of apps) {
    const k = app.match.mapName;
    if (!by.has(k)) by.set(k, emptyAgg());
    addApp(by.get(k)!, app);
  }
  return [...by.entries()].map(([mapName, a]) => ({ mapName, ...view(a) })).sort((a, b) => b.n - a.n);
}

export const TIME_SLOTS = [
  { key: "morning", label: "Sáng", range: "6h–12h", from: 6, to: 12 },
  { key: "afternoon", label: "Chiều", range: "12h–18h", from: 12, to: 18 },
  { key: "evening", label: "Tối", range: "18h–24h", from: 18, to: 24 },
  { key: "night", label: "Đêm", range: "0h–6h", from: 0, to: 6 },
] as const;

/** Theo khung giờ (giờ địa phương của trình duyệt) */
export function byTime(apps: Appearance[]) {
  const aggs = TIME_SLOTS.map(() => emptyAgg());
  for (const app of apps) {
    const h = new Date(app.t).getHours();
    const i = TIME_SLOTS.findIndex((s) => h >= s.from && h < s.to);
    addApp(aggs[i], app);
  }
  return TIME_SLOTS.map((s, i) => ({ ...s, ...view(aggs[i]) }));
}
