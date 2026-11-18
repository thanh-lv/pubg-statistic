import type {
  GameMode,
  MatchParticipant,
  MatchSummary,
  MatchTeam,
  ModeStats,
  PlayerRanked,
  PlayerSeasonStats,
  PlayerSummary,
  PlayersResult,
  RankedModeStats,
  Season,
  SquadStats,
} from "../shared/types";
import type { Env } from "./env";
import { HttpError } from "./errors";

const BASE = "https://api.pubg.com";
const BATCH = 10; // PUBG cho tối đa 10 tên / id mỗi request

/* --------------------------- Upstream fetch --------------------------- */

// Kiểu JSON:API tối giản mà ta cần đọc
interface JsonApiResource<A = Record<string, unknown>> {
  type: string;
  id: string;
  attributes: A;
  relationships?: Record<string, { data: { type: string; id: string } | { type: string; id: string }[] }>;
}
interface JsonApiDoc<D> {
  data: D;
  included?: JsonApiResource<any>[];
}

async function pubgFetch<T>(env: Env, path: string): Promise<T> {
  if (!env.PUBG_API_KEY) {
    throw new HttpError(500, "Chưa cấu hình PUBG_API_KEY cho Worker.");
  }
  const res = await fetch((env.PUBG_API_BASE || BASE) + path, {
    headers: {
      Accept: "application/vnd.api+json",
      Authorization: `Bearer ${env.PUBG_API_KEY}`,
    },
  });

  if (res.ok) return res.json<T>();

  switch (res.status) {
    case 429: {
      const reset = Number(res.headers.get("X-Ratelimit-Reset"));
      const retryAfter = reset ? Math.max(1, reset - Math.floor(Date.now() / 1000)) : 60;
      throw new HttpError(429, "PUBG API đang giới hạn tần suất, thử lại sau ít phút.", retryAfter);
    }
    case 401:
    case 403:
      throw new HttpError(500, "PUBG API key không hợp lệ hoặc đã hết hạn.");
    case 404:
      throw new HttpError(404, "Không tìm thấy dữ liệu.");
    default:
      throw new HttpError(502, `PUBG API lỗi (${res.status}).`);
  }
}

const chunk = <T>(arr: T[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/* ------------------------------ Players ------------------------------ */

function toPlayer(r: JsonApiResource<any>): PlayerSummary {
  const matches = r.relationships?.matches?.data;
  return {
    id: r.id,
    name: r.attributes.name,
    shard: r.attributes.shardId,
    clanId: r.attributes.clanId || null,
    banType: r.attributes.banType && r.attributes.banType !== "Innocent" ? r.attributes.banType : null,
    matchIds: Array.isArray(matches) ? matches.map((m) => m.id) : [],
  };
}

export async function loadPlayers(env: Env, shard: string, names: string[]): Promise<PlayersResult> {
  const players: PlayerSummary[] = [];
  for (const group of chunk(names, BATCH)) {
    const filter = group.map(encodeURIComponent).join(",");
    try {
      const doc = await pubgFetch<JsonApiDoc<JsonApiResource[]>>(
        env,
        `/shards/${shard}/players?filter[playerNames]=${filter}`,
      );
      players.push(...doc.data.map(toPlayer));
    } catch (err) {
      // 404 = không tên nào trong nhóm tồn tại
      if (!(err instanceof HttpError && err.status === 404)) throw err;
    }
  }

  // Giữ đúng thứ tự người dùng nhập
  const byName = new Map(players.map((p) => [p.name.toLowerCase(), p]));
  const ordered: PlayerSummary[] = [];
  const notFound: string[] = [];
  for (const n of names) {
    const p = byName.get(n.toLowerCase());
    if (p) ordered.push(p);
    else notFound.push(n);
  }
  return { players: ordered, notFound };
}

/* ------------------------------ Seasons ------------------------------ */

export async function loadSeasons(env: Env, shard: string): Promise<Season[]> {
  const doc = await pubgFetch<JsonApiDoc<JsonApiResource<any>[]>>(env, `/shards/${shard}/seasons`);
  const seasons: Season[] = [];
  for (const s of doc.data) {
    const m = /(?:pc-2018|console)-(\d+)$/.exec(s.id);
    if (!m) continue;
    const number = Number(m[1]);
    seasons.push({
      id: s.id,
      number,
      label: `Season ${number}`,
      isCurrent: !!s.attributes.isCurrentSeason,
    });
  }
  return seasons.sort((a, b) => b.number - a.number);
}

/* ------------------------------- Stats ------------------------------- */

const seasonPath = (seasonId: string) => (seasonId === "lifetime" ? "lifetime" : seasonId);

export async function loadSquadStats(
  env: Env,
  shard: string,
  seasonId: string,
  mode: GameMode,
  playerIds: string[],
): Promise<SquadStats> {
  const stats: Record<string, ModeStats | null> = Object.fromEntries(playerIds.map((id) => [id, null]));
  for (const group of chunk(playerIds, BATCH)) {
    try {
      const doc = await pubgFetch<JsonApiDoc<JsonApiResource<any>[]>>(
        env,
        `/shards/${shard}/seasons/${seasonPath(seasonId)}/gameMode/${mode}/players?filter[playerIds]=${group.join(",")}`,
      );
      for (const r of doc.data) {
        const rel = r.relationships?.player?.data;
        const pid = rel && !Array.isArray(rel) ? rel.id : null;
        const s = r.attributes?.gameModeStats?.[mode];
        if (pid && s) stats[pid] = s as ModeStats;
      }
    } catch (err) {
      if (!(err instanceof HttpError && err.status === 404)) throw err;
    }
  }
  return { seasonId, mode, stats };
}

export async function loadPlayerSeason(
  env: Env,
  shard: string,
  playerId: string,
  seasonId: string,
): Promise<PlayerSeasonStats> {
  const doc = await pubgFetch<JsonApiDoc<JsonApiResource<any>>>(
    env,
    `/shards/${shard}/players/${playerId}/seasons/${seasonPath(seasonId)}`,
  );
  return { playerId, seasonId, modes: doc.data.attributes.gameModeStats ?? {} };
}

export async function loadPlayerRanked(
  env: Env,
  shard: string,
  playerId: string,
  seasonId: string,
): Promise<PlayerRanked> {
  if (seasonId === "lifetime") return { playerId, seasonId, modes: {} };
  try {
    const doc = await pubgFetch<JsonApiDoc<JsonApiResource<any>>>(
      env,
      `/shards/${shard}/players/${playerId}/seasons/${seasonId}/ranked`,
    );
    const raw = (doc.data.attributes.rankedGameModeStats ?? {}) as Record<string, RankedModeStats>;
    const modes = Object.fromEntries(Object.entries(raw).filter(([, s]) => s && s.roundsPlayed > 0));
    return { playerId, seasonId, modes };
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) return { playerId, seasonId, modes: {} };
    throw err;
  }
}

/* ------------------------------ Matches ------------------------------ */

export async function loadMatch(env: Env, shard: string, matchId: string): Promise<MatchSummary> {
  const doc = await pubgFetch<JsonApiDoc<JsonApiResource<any>>>(env, `/shards/${shard}/matches/${matchId}`);
  const a = doc.data.attributes;
  const included = doc.included ?? [];

  const byParticipantId = new Map<string, MatchParticipant>();
  for (const inc of included) {
    if (inc.type !== "participant") continue;
    const s = inc.attributes.stats ?? {};
    byParticipantId.set(inc.id, {
      playerId: s.playerId ?? inc.id,
      name: s.name ?? "?",
      isBot: typeof s.playerId === "string" && s.playerId.startsWith("ai."),
      teamId: null,
      kills: num(s.kills),
      assists: num(s.assists),
      dBNOs: num(s.DBNOs),
      damageDealt: num(s.damageDealt),
      headshotKills: num(s.headshotKills),
      longestKill: num(s.longestKill),
      timeSurvived: num(s.timeSurvived),
      walkDistance: num(s.walkDistance),
      rideDistance: num(s.rideDistance),
      swimDistance: num(s.swimDistance),
      revives: num(s.revives),
      heals: num(s.heals),
      boosts: num(s.boosts),
      weaponsAcquired: num(s.weaponsAcquired),
      winPlace: num(s.winPlace),
      killPlace: num(s.killPlace),
      deathType: s.deathType ?? "",
    });
  }

  const teams: MatchTeam[] = [];
  for (const inc of included) {
    if (inc.type !== "roster") continue;
    const teamId = num(inc.attributes.stats?.teamId);
    const refs = inc.relationships?.participants?.data;
    const playerIds: string[] = [];
    for (const ref of Array.isArray(refs) ? refs : []) {
      const p = byParticipantId.get(ref.id);
      if (!p) continue;
      p.teamId = teamId;
      playerIds.push(p.playerId);
    }
    teams.push({
      teamId,
      rank: num(inc.attributes.stats?.rank),
      won: inc.attributes.won === "true" || inc.attributes.won === true,
      playerIds,
    });
  }
  teams.sort((x, y) => x.rank - y.rank);

  return {
    id: doc.data.id,
    createdAt: a.createdAt,
    duration: num(a.duration),
    mapName: a.mapName,
    gameMode: a.gameMode,
    matchType: a.matchType,
    isCustomMatch: !!a.isCustomMatch,
    shard: a.shardId ?? shard,
    teamCount: teams.length,
    participants: [...byParticipantId.values()].sort((x, y) => x.winPlace - y.winPlace || y.kills - x.kills),
    teams,
  };
}
