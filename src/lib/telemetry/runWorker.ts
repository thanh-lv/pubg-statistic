import type { PlayerMatchStats } from "./player";
import type { PlayerTelemetryRequest } from "./player.worker";
import type { TelemetryRequest } from "./telemetry.worker";
import type { TelemetryAnalysis } from "./types";

/** Gửi 1 yêu cầu cho worker, nhận 1 kết quả rồi tắt worker */
function runOnce<T>(worker: Worker, req: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<{ ok: true; data: T } | { ok: false; error: string }>) => {
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

/** Tải + phân tích telemetry 1 trận cho 1 đội, trong Web Worker riêng (không làm đơ trang). */
export function analyzeInWorker(req: TelemetryRequest): Promise<TelemetryAnalysis> {
  return runOnce(new Worker(new URL("./telemetry.worker.ts", import.meta.url), { type: "module" }), req);
}

/** Tải + phân tích telemetry 1 trận cho 1 người chơi. */
export function analyzePlayerInWorker(req: PlayerTelemetryRequest): Promise<PlayerMatchStats> {
  return runOnce(new Worker(new URL("./player.worker.ts", import.meta.url), { type: "module" }), req);
}
