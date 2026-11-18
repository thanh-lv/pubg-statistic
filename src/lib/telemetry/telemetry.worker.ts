/// <reference lib="webworker" />
/**
 * Web Worker: tải file telemetry (vài MB) + phân tích ở luồng riêng
 * để trang không bị đơ. File được tải thẳng từ CDN của PUBG (CORS mở, không cần API key).
 */
import { analyzeTelemetry } from "./analyze";

export interface TelemetryRequest {
  url: string;
  team: { id: string; name: string }[];
  mapName: string;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

async function readJson(res: Response): Promise<unknown> {
  const buf = new Uint8Array(await res.arrayBuffer());
  // Một số file trả về dạng gzip thô (không có Content-Encoding) → tự giải nén
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
    return JSON.parse(await new Response(stream).text());
  }
  return JSON.parse(new TextDecoder().decode(buf));
}

ctx.onmessage = async (e: MessageEvent<TelemetryRequest>) => {
  const { url, team, mapName } = e.data;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Không tải được telemetry (${res.status}).`);
    const events = await readJson(res);
    if (!Array.isArray(events)) throw new Error("Telemetry không đúng định dạng.");
    ctx.postMessage({ ok: true, data: analyzeTelemetry(events, team, mapName) });
  } catch (err) {
    ctx.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
