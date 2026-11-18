import type { MatchSummary } from "@shared/types";
import { useQuery } from "@tanstack/react-query";
import type { TelemetryAnalysis } from "@/lib/telemetry/types";
import type { TelemetryRequest } from "@/lib/telemetry/telemetry.worker";

function runWorker(req: TelemetryRequest): Promise<TelemetryAnalysis> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../lib/telemetry/telemetry.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ ok: true; data: TelemetryAnalysis } | { ok: false; error: string }>) => {
      worker.terminate();
      if (e.data.ok) resolve(e.data.data);
      else reject(new Error(e.data.error));
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || "Lỗi khi phân tích telemetry."));
    };
    worker.postMessage(req);
  });
}

/** Phân tích telemetry cho 1 đội trong trận (kill người/bot, đường đi, vòng bo…). */
export function useTelemetry(match: MatchSummary | undefined, team: { id: string; name: string }[]) {
  return useQuery({
    queryKey: ["telemetry", match?.id, team.map((m) => m.id).join(",")],
    queryFn: () => runWorker({ url: match!.telemetryUrl!, team, mapName: match!.mapName }),
    enabled: !!match?.telemetryUrl && team.length > 0,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: 1,
  });
}
