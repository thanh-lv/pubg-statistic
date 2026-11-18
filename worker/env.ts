export interface Env {
  /** Secret: `wrangler secret put PUBG_API_KEY` (hoặc .dev.vars khi chạy local) */
  PUBG_API_KEY: string;
  DEFAULT_SHARD?: string;
  /** Chỉ dùng khi test: trỏ tới mock server thay cho https://api.pubg.com */
  PUBG_API_BASE?: string;
  /** KV tuỳ chọn để cache bền giữa các isolate / data center */
  PUBG_CACHE?: KVNamespace;
  ASSETS: Fetcher;
}

export interface Ctx {
  env: Env;
  exec: ExecutionContext;
}
