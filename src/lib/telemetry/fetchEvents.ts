/** Tải file telemetry (JSON mảng sự kiện) từ CDN của PUBG — CORS mở, không cần API key. */
export async function fetchEvents(url: string): Promise<unknown[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Không tải được telemetry (${res.status}).`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let text: string;
  // Một số file trả về dạng gzip thô (không có Content-Encoding) → tự giải nén
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
    text = await new Response(stream).text();
  } else {
    text = new TextDecoder().decode(buf);
  }
  const events = JSON.parse(text);
  if (!Array.isArray(events)) throw new Error("Telemetry không đúng định dạng.");
  return events;
}
