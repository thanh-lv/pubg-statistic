const nf0 = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const compact = new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 });

export const fmtInt = (n: number) => nf0.format(n);
export const fmt1 = (n: number) => nf1.format(n);
export const fmt2 = (n: number) => nf2.format(n);
export const fmtCompact = (n: number) => (Math.abs(n) >= 10_000 ? compact.format(n) : nf0.format(n));
export const fmtPct = (ratio: number) => `${nf1.format(ratio * 100)}%`;
export const fmtMeters = (m: number) => (m >= 1000 ? `${nf1.format(m / 1000)} km` : `${nf0.format(m)} m`);

export function fmtDuration(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

const rtf = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });
export function timeAgo(input: string | number) {
  const diff = (new Date(input).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "vừa xong";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

const df = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" });
export const fmtDate = (input: string | number) => df.format(new Date(input));
