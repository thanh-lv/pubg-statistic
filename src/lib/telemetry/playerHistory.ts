/**
 * Phân tích cá nhân qua nhiều trận: lưu bản tóm tắt từng trận trong localStorage (như phần đội),
 * để không tải lại telemetry và vẫn xem được sau khi PUBG xoá dữ liệu trận (14 ngày).
 */
import type { ThrowKind } from "../attachments";
import type { PlayerMatchStats, ScopeStat, WeaponAccuracy } from "./player";

/** Tăng khi đổi cách tính → bản cũ bị bỏ qua */
export const PLAYER_INSIGHTS_VERSION = 1;
const STORE_KEY = "pubg-player-insights";
const MAX_RECORDS = 500;

export interface PlayerRecord {
  v: number;
  matchId: string;
  playerId: string;
  createdAt: string;
  mapName: string;
  gameMode: string;
  /** Hạng của đội */
  rank: number;
  /** Không phải trận battle royale thường/rank (TDM, custom…) hoặc không có telemetry → bỏ qua */
  skipped?: boolean;
  stats?: PlayerMatchStats;
}

export const playerRecordKey = (matchId: string, playerId: string) => `${matchId}:${playerId}`;

export function loadPlayerRecords(): Record<string, PlayerRecord> {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, PlayerRecord>) : {};
    return Object.fromEntries(Object.entries(all).filter(([, r]) => r?.v === PLAYER_INSIGHTS_VERSION));
  } catch {
    return {};
  }
}

export function savePlayerRecord(r: PlayerRecord) {
  try {
    const all = loadPlayerRecords();
    all[playerRecordKey(r.matchId, r.playerId)] = r;
    const kept = Object.entries(all)
      .sort(([, a], [, b]) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, MAX_RECORDS);
    localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {
    /* localStorage bị chặn / đầy → chỉ mất cache */
  }
}

export function clearPlayerRecords(playerId: string) {
  try {
    const all = loadPlayerRecords();
    for (const [k, r] of Object.entries(all)) if (r.playerId === playerId) delete all[k];
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

/* ------------------------------ cộng dồn ------------------------------ */

export function aggregatePlayer(records: PlayerRecord[]) {
  const weapons: Record<string, WeaponAccuracy> = {};
  const scopes: Record<string, ScopeStat> = {};
  const loadout: Record<string, Record<string, number>> = {};
  const throws: Partial<Record<ThrowKind, number>> = {};
  const total = {
    n: 0,
    throwDamage: 0,
    throwKnocks: 0,
    throwKills: 0,
    revives: 0,
    smokeRevives: 0,
    kills: { human: 0, bot: 0 },
    knocks: { human: 0, bot: 0 },
    deaths: { human: 0, bot: 0, env: 0 },
  };

  for (const r of records) {
    const s = r.stats;
    if (!s) continue;
    total.n++;
    for (const [id, w] of Object.entries(s.weapons)) {
      const t = (weapons[id] ??= { shots: 0, hits: 0, headHits: 0 });
      t.shots += w.shots;
      t.hits += w.hits;
      t.headHits += w.headHits;
    }
    for (const [id, x] of Object.entries(s.scopes)) {
      const t = (scopes[id] ??= { shots: 0, hits: 0, knocks: 0, kills: 0 });
      t.shots += x.shots;
      t.hits += x.hits;
      t.knocks += x.knocks;
      t.kills += x.kills;
    }
    for (const [w, atts] of Object.entries(s.loadout)) {
      const t = (loadout[w] ??= {});
      for (const [a, n] of Object.entries(atts)) t[a] = (t[a] ?? 0) + n;
    }
    for (const [k, n] of Object.entries(s.throws) as [ThrowKind, number][]) throws[k] = (throws[k] ?? 0) + n;
    total.throwDamage += s.throwDamage;
    total.throwKnocks += s.throwKnocks;
    total.throwKills += s.throwKills;
    total.revives += s.revives;
    total.smokeRevives += s.smokeRevives;
    total.kills.human += s.kills.human;
    total.kills.bot += s.kills.bot;
    total.knocks.human += s.knocks.human;
    total.knocks.bot += s.knocks.bot;
    total.deaths.human += s.deaths.human;
    total.deaths.bot += s.deaths.bot;
    total.deaths.env += s.deaths.env;
  }

  const shots = Object.values(weapons).reduce((a, w) => a + w.shots, 0);
  const hits = Object.values(weapons).reduce((a, w) => a + w.hits, 0);
  const headHits = Object.values(weapons).reduce((a, w) => a + w.headHits, 0);
  return { ...total, weapons, scopes, loadout, throws, shots, hits, headHits };
}
export type PlayerAggregate = ReturnType<typeof aggregatePlayer>;
