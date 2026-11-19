/// <reference lib="webworker" />
/** Web Worker: tải telemetry 1 trận + phân tích cho 1 người chơi (độ chính xác, ống ngắm, vật phẩm ném…). */
import { fetchEvents } from "./fetchEvents";
import { analyzePlayerTelemetry } from "./player";

export interface PlayerTelemetryRequest {
  url: string;
  playerId: string;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (e: MessageEvent<PlayerTelemetryRequest>) => {
  try {
    const events = (await fetchEvents(e.data.url)) as Parameters<typeof analyzePlayerTelemetry>[0];
    ctx.postMessage({ ok: true, data: analyzePlayerTelemetry(events, e.data.playerId) });
  } catch (err) {
    ctx.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
