import type { TelemetryRequest } from "./telemetry.worker";
import type { TelemetryAnalysis } from "./types";

/** Tải + phân tích telemetry 1 trận trong Web Worker riêng (không làm đơ trang). */
export function analyzeInWorker(req: TelemetryRequest): Promise<TelemetryAnalysis> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./telemetry.worker.ts", import.meta.url), { type: "module" });
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
