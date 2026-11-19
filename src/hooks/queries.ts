import type { GameMode, MatchBrief, PlayerSummary } from "@shared/types";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSquad } from "./useSquad";

const MIN = 60_000;

export function useSeasons() {
  const { shard } = useSquad();
  return useQuery({
    queryKey: ["seasons", shard],
    queryFn: () => api.seasons(shard),
    staleTime: 6 * 60 * MIN,
  });
}

/** Chuyển lựa chọn "current" thành id mùa thật. */
export function useResolvedSeason() {
  const { season, setSeason } = useSquad();
  const seasons = useSeasons();
  const list = seasons.data?.data ?? [];
  let resolved: string | undefined;
  if (season === "lifetime") resolved = "lifetime";
  else if (season === "current") resolved = (list.find((s) => s.isCurrent) ?? list[0])?.id;
  else resolved = list.some((s) => s.id === season) ? season : seasons.isSuccess ? list[0]?.id : season;
  return { season, setSeason, resolved, seasons };
}

export function usePlayers(names: string[]) {
  const { shard } = useSquad();
  return useQuery({
    queryKey: ["players", shard, names],
    queryFn: () => api.players(names, shard),
    enabled: names.length > 0,
    staleTime: 5 * MIN,
    placeholderData: keepPreviousData,
  });
}

export function useSquadStats(ids: string[], season: string | undefined, mode: GameMode) {
  const { shard } = useSquad();
  return useQuery({
    queryKey: ["squad-stats", shard, season, mode, ids],
    queryFn: () => api.squadStats(ids, season!, mode, shard),
    enabled: ids.length > 0 && !!season,
    staleTime: 5 * MIN,
    placeholderData: keepPreviousData,
  });
}

export function usePlayerSeason(id: string | undefined, season: string | undefined) {
  const { shard } = useSquad();
  return useQuery({
    queryKey: ["player-season", shard, id, season],
    queryFn: () => api.playerSeason(id!, season!, shard),
    enabled: !!id && !!season,
    staleTime: 5 * MIN,
    placeholderData: keepPreviousData,
  });
}

export function usePlayerRanked(id: string | undefined, season: string | undefined) {
  const { shard } = useSquad();
  return useQuery({
    queryKey: ["player-ranked", shard, id, season],
    queryFn: () => api.playerRanked(id!, season!, shard),
    enabled: !!id && !!season && season !== "lifetime",
    staleTime: 5 * MIN,
  });
}

export const matchQuery = (id: string, shard: string) => ({
  queryKey: ["match", shard, id],
  queryFn: () => api.match(id, shard),
  staleTime: Infinity,
  gcTime: 60 * MIN,
});

export function useMatch(id: string | undefined) {
  const { shard } = useSquad();
  return useQuery({ ...matchQuery(id ?? "", shard), enabled: !!id });
}

export function useMatches(ids: string[]) {
  const { shard } = useSquad();
  return useQueries({ queries: ids.map((id) => matchQuery(id, shard)) });
}

/** Weapon Mastery của từng người (mỗi người 1 request, cache riêng) */
export function useSquadWeapons(ids: string[]) {
  const { shard } = useSquad();
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ["weapons", shard, id],
      queryFn: () => api.weapons(id, shard),
      staleTime: 30 * MIN,
    })),
  });
}

type BriefResult = { data?: { data: MatchBrief }; isPending: boolean; isError: boolean };

/** Gộp kết quả (hàm cố định → TanStack giữ nguyên tham chiếu khi dữ liệu không đổi) */
function combineBriefs(results: BriefResult[]) {
  const briefs = results.flatMap((q) => (q.data ? [q.data.data] : []));
  const done = results.filter((q) => !q.isPending).length;
  return {
    briefs,
    total: results.length,
    done,
    failed: results.filter((q) => q.isError).length,
    loading: done < results.length,
  };
}

/**
 * Lịch sử trận gần đây (~14 ngày) của cả đội: gộp matchIds của mọi người, mỗi trận lấy 1 bản rút gọn.
 * Endpoint trận của PUBG không bị giới hạn tần suất, trình duyệt cache 7 ngày.
 */
export function useSquadHistory(players: PlayerSummary[]) {
  const { shard } = useSquad();
  const ids = [...new Set(players.map((p) => p.id))].sort();
  const matchIds = [...new Set(players.flatMap((p) => p.matchIds))];
  return useQueries({
    queries: matchIds.map((id) => ({
      queryKey: ["match-brief", shard, id, ids.join(",")],
      queryFn: () => api.matchBrief(id, ids, shard),
      staleTime: Infinity,
      gcTime: 60 * MIN,
      enabled: ids.length > 0,
    })),
    combine: combineBriefs,
  });
}
