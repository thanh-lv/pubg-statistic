import type { Ctx } from "./env";
import { isRecoverable } from "./errors";

/**
 * Cache 3 tầng để sống sót với rate-limit 10 request/phút của PUBG API:
 *   1. Bộ nhớ isolate (nhanh nhất, mất khi isolate bị thu hồi)
 *   2. Cache API của Cloudflare (theo data center; không hoạt động trên *.workers.dev)
 *   3. KV (tuỳ chọn, bền và toàn cầu) — chỉ dùng cho các endpoint bị rate-limit
 *
 * Dữ liệu được giữ lại lâu hơn TTL ("stale") để có cái trả về khi PUBG API trả 429/5xx.
 */

interface Entry<T> {
  v: T;
  /** fetchedAt (ms) */
  t: number;
}

export interface CachedResult<T> {
  data: T;
  fetchedAt: number;
  stale: boolean;
}

const STALE_KEEP_SECONDS = 7 * 24 * 3600;
const MEM_MAX = 500;

const mem = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<Entry<unknown>>>();

const cacheUrl = (key: string) => `https://pubg-cache.internal/${encodeURIComponent(key)}`;

function memSet(key: string, entry: Entry<unknown>) {
  mem.delete(key);
  mem.set(key, entry);
  if (mem.size > MEM_MAX) mem.delete(mem.keys().next().value!);
}

async function lookup<T>(ctx: Ctx, key: string, ttlMs: number, useKv: boolean) {
  const now = Date.now();
  let stale: Entry<T> | undefined;
  const consider = (e: Entry<T> | null | undefined) => {
    if (!e) return false;
    if (now - e.t < ttlMs) return true;
    if (!stale || e.t > stale.t) stale = e;
    return false;
  };

  const m = mem.get(key) as Entry<T> | undefined;
  if (consider(m)) return { fresh: m!, stale };

  try {
    const res = await caches.default.match(cacheUrl(key));
    if (res) {
      const e = await res.json<Entry<T>>();
      if (consider(e)) {
        memSet(key, e);
        return { fresh: e, stale };
      }
    }
  } catch {
    /* Cache API không khả dụng (vd. workers.dev) */
  }

  if (useKv && ctx.env.PUBG_CACHE) {
    try {
      const e = await ctx.env.PUBG_CACHE.get<Entry<T>>(key, "json");
      if (consider(e)) {
        memSet(key, e!);
        return { fresh: e!, stale };
      }
    } catch {
      /* ignore */
    }
  }

  return { fresh: undefined, stale };
}

function persist(ctx: Ctx, key: string, entry: Entry<unknown>, useKv: boolean) {
  memSet(key, entry);
  const body = JSON.stringify(entry);
  ctx.exec.waitUntil(
    caches.default
      .put(
        cacheUrl(key),
        new Response(body, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `max-age=${STALE_KEEP_SECONDS}`,
          },
        }),
      )
      .catch(() => {}),
  );
  if (useKv && ctx.env.PUBG_CACHE) {
    ctx.exec.waitUntil(
      ctx.env.PUBG_CACHE.put(key, body, { expirationTtl: STALE_KEEP_SECONDS }).catch(() => {}),
    );
  }
}

export async function cached<T>(
  ctx: Ctx,
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
  opts: { kv?: boolean } = {},
): Promise<CachedResult<T>> {
  const useKv = opts.kv ?? true;
  const { fresh, stale } = await lookup<T>(ctx, key, ttlSeconds * 1000, useKv);
  if (fresh) return { data: fresh.v, fetchedAt: fresh.t, stale: false };

  let pending = inflight.get(key) as Promise<Entry<T>> | undefined;
  if (!pending) {
    pending = loader()
      .then((v) => {
        const entry: Entry<T> = { v, t: Date.now() };
        persist(ctx, key, entry, useKv);
        return entry;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }

  try {
    const e = await pending;
    return { data: e.v, fetchedAt: e.t, stale: false };
  } catch (err) {
    if (stale && isRecoverable(err)) return { data: stale.v, fetchedAt: stale.t, stale: true };
    throw err;
  }
}
