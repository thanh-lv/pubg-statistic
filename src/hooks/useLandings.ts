import type { MatchBrief } from "@shared/types";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MatchLandings } from "@/lib/telemetry/landing";
import type { LandingJob, LandingMessage } from "@/lib/telemetry/landing.worker";

const STORAGE_KEY = "landings.v1";
const MAX_CACHED = 300;

function loadCache(): Record<string, MatchLandings> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, MatchLandings>) {
  try {
    const entries = Object.entries(cache);
    // Giữ gọn: bỏ bớt trận cũ nhất theo thứ tự thêm vào
    const trimmed = entries.length > MAX_CACHED ? Object.fromEntries(entries.slice(-MAX_CACHED)) : cache;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* hết dung lượng / chế độ riêng tư → bỏ qua, chỉ mất cache */
  }
}

/** Trận đã phân tích đủ cho mọi thành viên có mặt trong trận */
export const isCovered = (b: MatchBrief, c: MatchLandings | undefined) =>
  !!c && b.players.every((p) => c.ids.includes(p.playerId));

/**
 * Phân tích điểm nhảy dù cho các trận (tải telemetry trong Web Worker).
 * Kết quả lưu trong trình duyệt (localStorage) → lần sau mở lại không phải tải.
 */
export function useLandings() {
  const [cache, setCache] = useState<Record<string, MatchLandings>>(loadCache);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const stop = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setProgress(null);
  }, []);

  useEffect(() => stop, [stop]);

  const analyze = useCallback(
    (briefs: MatchBrief[]) => {
      const jobs: LandingJob[] = briefs
        .filter((b) => b.telemetryUrl)
        .map((b) => ({ matchId: b.id, url: b.telemetryUrl!, mapName: b.mapName, ids: b.players.map((p) => p.playerId) }));
      if (jobs.length === 0) return;

      workerRef.current?.terminate();
      const worker = new Worker(new URL("../lib/telemetry/landing.worker.ts", import.meta.url), { type: "module" });
      workerRef.current = worker;
      setProgress({ done: 0, total: jobs.length, failed: 0 });

      worker.onmessage = (e: MessageEvent<LandingMessage>) => {
        const m = e.data;
        if (m.type === "result") {
          setCache((prev) => {
            const next = { ...prev, [m.data.matchId]: m.data };
            saveCache(next);
            return next;
          });
          setProgress((p) => p && { ...p, done: p.done + 1 });
        } else if (m.type === "error") {
          setProgress((p) => p && { ...p, done: p.done + 1, failed: p.failed + 1 });
        } else {
          worker.terminate();
          workerRef.current = null;
          setProgress(null);
        }
      };
      worker.onerror = () => stop();
      worker.postMessage(jobs);
    },
    [stop],
  );

  return { cache, progress, analyze, stop };
}
