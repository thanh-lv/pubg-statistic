import type { MatchSummary } from "@shared/types";
import { useQuery } from "@tanstack/react-query";
import { analyzeInWorker } from "@/lib/telemetry/runWorker";

/** Phân tích telemetry cho 1 đội trong trận (kill người/bot, đường đi, vòng bo…). */
export function useTelemetry(match: MatchSummary | undefined, team: { id: string; name: string }[]) {
  return useQuery({
    queryKey: ["telemetry", match?.id, team.map((m) => m.id).join(",")],
    queryFn: () => analyzeInWorker({ url: match!.telemetryUrl!, team, mapName: match!.mapName }),
    enabled: !!match?.telemetryUrl && team.length > 0,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: 1,
  });
}
