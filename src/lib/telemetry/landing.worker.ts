/// <reference lib="webworker" />
/**
 * Web Worker: tải telemetry của nhiều trận (mỗi file ~2 MB nén) và chỉ trích điểm nhảy dù.
 * Tải song song tối đa 2 file để vừa nhanh vừa không ngốn RAM (mỗi file giải nén ~25 MB).
 */
import { fetchEvents } from "./fetchEvents";
import { extractLandings, type MatchLandings } from "./landing";

export interface LandingJob {
  matchId: string;
  url: string;
  mapName: string;
  ids: string[];
}

export type LandingMessage =
  | { type: "result"; data: MatchLandings }
  | { type: "error"; matchId: string; error: string }
  | { type: "done" };

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const CONCURRENCY = 2;

ctx.onmessage = async (e: MessageEvent<LandingJob[]>) => {
  const queue = [...e.data];
  const run = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      try {
        const events = (await fetchEvents(job.url)) as Parameters<typeof extractLandings>[0];
        ctx.postMessage({ type: "result", data: extractLandings(events, job.matchId, job.ids, job.mapName) } satisfies LandingMessage);
      } catch (err) {
        ctx.postMessage({
          type: "error",
          matchId: job.matchId,
          error: err instanceof Error ? err.message : String(err),
        } satisfies LandingMessage);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, run));
  ctx.postMessage({ type: "done" } satisfies LandingMessage);
};
