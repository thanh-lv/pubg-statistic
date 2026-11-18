import { GAME_MODES, SHARDS, type ApiErrorBody, type ApiResponse, type GameMode, type Shard } from "../shared/types";
import { cached, type CachedResult } from "./cache";
import type { Ctx, Env } from "./env";
import { HttpError } from "./errors";
import { loadMatch, loadPlayerRanked, loadPlayerSeason, loadPlayers, loadSeasons, loadSquadStats } from "./pubg";

/** TTL (giây) cho từng loại dữ liệu */
const TTL = {
  players: 5 * 60,
  seasons: 12 * 3600,
  stats: 10 * 60,
  lifetime: 30 * 60,
  ranked: 10 * 60,
  match: 30 * 24 * 3600, // trận đấu đã kết thúc không đổi nữa
};

const MAX_PLAYERS = 30;
const RE_NAME = /^[\w-]{2,32}$/;
const RE_ACCOUNT = /^account\.[a-f0-9]{16,64}$/;
const RE_SEASON = /^(lifetime|division\.bro\.official\.[\w.-]+)$/;
const RE_MATCH = /^[a-f0-9-]{36}$/;

/* ------------------------------ helpers ------------------------------ */

function json<T>(result: CachedResult<T>, browserMaxAge = 60): Response {
  const body: ApiResponse<T> = {
    data: result.data,
    meta: { fetchedAt: result.fetchedAt, stale: result.stale },
  };
  return Response.json(body, {
    headers: { "Cache-Control": `public, max-age=${result.stale ? 15 : browserMaxAge}` },
  });
}

function errorResponse(err: unknown): Response {
  const e = err instanceof HttpError ? err : new HttpError(500, "Lỗi không xác định.");
  if (!(err instanceof HttpError)) console.error(err);
  const body: ApiErrorBody = { error: e.message, status: e.status, retryAfter: e.retryAfter };
  const headers: HeadersInit = e.retryAfter ? { "Retry-After": String(e.retryAfter) } : {};
  return Response.json(body, { status: e.status, headers });
}

function getShard(url: URL, env: Env): Shard {
  const s = url.searchParams.get("shard") || env.DEFAULT_SHARD || "steam";
  if (!(SHARDS as readonly string[]).includes(s)) throw new HttpError(400, `Shard không hợp lệ: ${s}`);
  return s as Shard;
}

function getMode(url: URL): GameMode {
  const m = url.searchParams.get("mode") || "squad";
  if (!(GAME_MODES as readonly string[]).includes(m)) throw new HttpError(400, `Chế độ không hợp lệ: ${m}`);
  return m as GameMode;
}

function check(value: string | null | undefined, re: RegExp, label: string): string {
  if (!value || !re.test(value)) throw new HttpError(400, `${label} không hợp lệ.`);
  return value;
}

function list(url: URL, key: string, re: RegExp, label: string): string[] {
  const raw = (url.searchParams.get(key) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const unique = [...new Set(raw)];
  if (unique.length === 0) throw new HttpError(400, `Thiếu tham số ${key}.`);
  if (unique.length > MAX_PLAYERS) throw new HttpError(400, `Tối đa ${MAX_PLAYERS} người chơi.`);
  unique.forEach((v) => check(v, re, label));
  return unique;
}

/* ------------------------------- routes ------------------------------- */

type Handler = (ctx: Ctx, url: URL, params: string[]) => Promise<Response>;

const routes: [RegExp, Handler][] = [
  [/^\/api\/health$/, async () => Response.json({ ok: true })],

  // GET /api/players?names=a,b,c
  [
    /^\/api\/players$/,
    async (ctx, url) => {
      const shard = getShard(url, ctx.env);
      const names = list(url, "names", RE_NAME, "Tên người chơi");
      const key = `players:${shard}:${[...names].sort().join(",")}`;
      return json(await cached(ctx, key, TTL.players, () => loadPlayers(ctx.env, shard, names)), 60);
    },
  ],

  // GET /api/seasons
  [
    /^\/api\/seasons$/,
    async (ctx, url) => {
      const shard = getShard(url, ctx.env);
      return json(await cached(ctx, `seasons:v2:${shard}`, TTL.seasons, () => loadSeasons(ctx.env, shard)), 3600);
    },
  ],

  // GET /api/squad-stats?ids=account.x,account.y&season=...&mode=squad
  [
    /^\/api\/squad-stats$/,
    async (ctx, url) => {
      const shard = getShard(url, ctx.env);
      const mode = getMode(url);
      const season = check(url.searchParams.get("season"), RE_SEASON, "Mùa giải");
      const ids = list(url, "ids", RE_ACCOUNT, "Player id");
      const key = `squad:${shard}:${season}:${mode}:${[...ids].sort().join(",")}`;
      const ttl = season === "lifetime" ? TTL.lifetime : TTL.stats;
      return json(await cached(ctx, key, ttl, () => loadSquadStats(ctx.env, shard, season, mode, ids)), 120);
    },
  ],

  // GET /api/player/:id/season/:season
  [
    /^\/api\/player\/([^/]+)\/season\/([^/]+)$/,
    async (ctx, url, [id, season]) => {
      const shard = getShard(url, ctx.env);
      check(id, RE_ACCOUNT, "Player id");
      check(season, RE_SEASON, "Mùa giải");
      const ttl = season === "lifetime" ? TTL.lifetime : TTL.stats;
      const key = `season:${shard}:${id}:${season}`;
      return json(await cached(ctx, key, ttl, () => loadPlayerSeason(ctx.env, shard, id, season)), 120);
    },
  ],

  // GET /api/player/:id/ranked/:season
  [
    /^\/api\/player\/([^/]+)\/ranked\/([^/]+)$/,
    async (ctx, url, [id, season]) => {
      const shard = getShard(url, ctx.env);
      check(id, RE_ACCOUNT, "Player id");
      check(season, RE_SEASON, "Mùa giải");
      const key = `ranked:${shard}:${id}:${season}`;
      return json(await cached(ctx, key, TTL.ranked, () => loadPlayerRanked(ctx.env, shard, id, season)), 120);
    },
  ],

  // GET /api/matches/:id  (endpoint này của PUBG không bị rate-limit → không cần KV)
  [
    /^\/api\/matches\/([^/]+)$/,
    async (ctx, url, [id]) => {
      const shard = getShard(url, ctx.env);
      check(id, RE_MATCH, "Match id");
      const result = await cached(ctx, `match:${shard}:${id}`, TTL.match, () => loadMatch(ctx.env, shard, id), {
        kv: false,
      });
      return json(result, 7 * 24 * 3600);
    },
  ],
];

export default {
  async fetch(request, env, exec): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (request.method !== "GET") return errorResponse(new HttpError(405, "Method not allowed"));

    for (const [re, handler] of routes) {
      const m = re.exec(url.pathname);
      if (!m) continue;
      try {
        return await handler({ env, exec }, url, m.slice(1).map(decodeURIComponent));
      } catch (err) {
        return errorResponse(err);
      }
    }
    return errorResponse(new HttpError(404, "API không tồn tại."));
  },
} satisfies ExportedHandler<Env>;
