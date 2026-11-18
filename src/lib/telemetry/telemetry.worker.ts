/// <reference lib="webworker" />
/**
 * Web Worker: tải file telemetry (vài MB) + phân tích ở luồng riêng
 * để trang không bị đơ. File được tải thẳng từ CDN của PUBG (CORS mở, không cần API key).
 */
import { analyzeTelemetry } from "./analyze";
import { fetchEvents } from "./fetchEvents";

export interface TelemetryRequest {
  url: string;
  team: { id: string; name: string }[];
  mapName: string;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (e: MessageEvent<TelemetryRequest>) => {
  const { url, team, mapName } = e.data;
  try {
    const events = (await fetchEvents(url)) as Parameters<typeof analyzeTelemetry>[0];
    ctx.postMessage({ ok: true, data: analyzeTelemetry(events, team, mapName) });
  } catch (err) {
    ctx.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
