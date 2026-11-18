import type {
  ApiErrorBody,
  ApiResponse,
  GameMode,
  MatchSummary,
  PlayerRanked,
  PlayerSeasonStats,
  PlayersResult,
  PlayerWeapons,
  Season,
  SquadStats,
} from "@shared/types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

async function get<T>(path: string, params: Record<string, string | undefined> = {}): Promise<ApiResponse<T>> {
  const qs = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1]));
  const url = qs.size ? `${path}?${qs}` : path;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch {
    throw new ApiError(0, "Không kết nối được tới máy chủ.");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(res.status, body?.error ?? `Lỗi ${res.status}`, body?.retryAfter);
  }
  return res.json();
}

export const api = {
  players: (names: string[], shard: string) => get<PlayersResult>("/api/players", { names: names.join(","), shard }),
  // `v`: tăng khi đổi cách xử lý danh sách mùa để trình duyệt bỏ cache cũ
  seasons: (shard: string) => get<Season[]>("/api/seasons", { shard, v: "2" }),
  squadStats: (ids: string[], season: string, mode: GameMode, shard: string) =>
    get<SquadStats>("/api/squad-stats", { ids: ids.join(","), season, mode, shard }),
  playerSeason: (id: string, season: string, shard: string) =>
    get<PlayerSeasonStats>(`/api/player/${id}/season/${encodeURIComponent(season)}`, { shard }),
  playerRanked: (id: string, season: string, shard: string) =>
    get<PlayerRanked>(`/api/player/${id}/ranked/${encodeURIComponent(season)}`, { shard }),
  weapons: (id: string, shard: string) => get<PlayerWeapons>(`/api/player/${id}/weapons`, { shard, v: "2" }),
  // `v`: tăng khi đổi dạng dữ liệu trận (trình duyệt cache 7 ngày)
  match: (id: string, shard: string) => get<MatchSummary>(`/api/matches/${id}`, { shard, v: "2" }),
};
