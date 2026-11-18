import { ArrowDownWideNarrow, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { LEADERBOARD_COLUMNS, METRICS, type MetricKey } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { Avatar } from "../ui/Avatar";
import { Tip } from "../ui/Tip";
import type { SquadRow } from "./types";

export function Leaderboard({ rows }: { rows: SquadRow[] }) {
  const [sortKey, setSortKey] = useState<MetricKey>("kd");

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (!a.d && !b.d) return 0;
        if (!a.d) return 1;
        if (!b.d) return -1;
        return b.d[sortKey] - a.d[sortKey];
      }),
    [rows, sortKey],
  );

  const best = useMemo(() => {
    const out: Partial<Record<MetricKey, number>> = {};
    if (rows.filter((r) => r.d).length < 2) return out;
    for (const k of LEADERBOARD_COLUMNS) out[k] = Math.max(...rows.map((r) => r.d?.[k] ?? -Infinity));
    return out;
  }, [rows]);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
        <h2 className="font-display text-lg font-semibold">Bảng xếp hạng</h2>
        <label className="flex items-center gap-2 text-xs text-fg-muted md:hidden">
          <ArrowDownWideNarrow className="size-4" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as MetricKey)}
            className="rounded-lg border border-white/10 bg-ink-950 px-2 py-1 text-fg"
          >
            {LEADERBOARD_COLUMNS.map((k) => (
              <option key={k} value={k}>
                {METRICS[k].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Desktop: bảng */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-fg-subtle">
              <th className="w-12 py-3 pl-5 font-medium">#</th>
              <th className="py-3 pr-4 font-medium">Người chơi</th>
              {LEADERBOARD_COLUMNS.map((k) => (
                <th key={k} className="px-2 py-3 text-right font-medium whitespace-nowrap">
                  <Tip term={METRICS[k].term}>
                  <button
                    onClick={() => setSortKey(k)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition hover:text-fg",
                      sortKey === k && "bg-accent-soft text-accent",
                    )}
                  >
                    {METRICS[k].short}
                  </button>
                  </Tip>
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.id} className="group border-t border-white/[0.04] transition hover:bg-white/[0.025]">
                <td className="py-3 pr-2 pl-5">
                  <span className={cn("num font-semibold", i === 0 && r.d ? "text-accent" : "text-fg-subtle")}>{i + 1}</span>
                </td>
                <td className="py-3 pr-4">
                  <Link to={`/player/${encodeURIComponent(r.name)}`} className="flex items-center gap-3">
                    <Avatar name={r.name} size="sm" color={r.color} />
                    <span className="font-medium group-hover:text-accent">{r.name}</span>
                  </Link>
                </td>
                {LEADERBOARD_COLUMNS.map((k) => {
                  const v = r.d?.[k];
                  const isBest = v !== undefined && best[k] === v && v > 0;
                  return (
                    <td
                      key={k}
                      className={cn(
                        "num px-3 py-3 text-right whitespace-nowrap",
                        !r.d && "text-fg-subtle",
                        sortKey === k && "bg-white/[0.02]",
                        isBest && "font-bold text-accent",
                      )}
                    >
                      {v === undefined ? "—" : METRICS[k].format(v)}
                    </td>
                  );
                })}
                <td className="pr-3">
                  <ChevronRight className="size-4 text-fg-subtle opacity-0 transition group-hover:opacity-100" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: thẻ */}
      <ul className="divide-y divide-white/[0.05] md:hidden">
        {sorted.map((r, i) => (
          <li key={r.id}>
            <Link to={`/player/${encodeURIComponent(r.name)}`} className="flex items-center gap-3 px-4 py-3 active:bg-white/[0.03]">
              <span className={cn("num w-5 text-center font-semibold", i === 0 && r.d ? "text-accent" : "text-fg-subtle")}>{i + 1}</span>
              <Avatar name={r.name} size="md" color={r.color} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.name}</div>
                {r.d ? (
                  <div className="num mt-0.5 flex gap-3 text-xs text-fg-muted">
                    <span>K/D {METRICS.kd.format(r.d.kd)}</span>
                    <span>ADR {METRICS.avgDamage.format(r.d.avgDamage)}</span>
                    <span>Win {METRICS.winRate.format(r.d.winRate)}</span>
                  </div>
                ) : (
                  <div className="mt-0.5 text-xs text-fg-subtle">Chưa chơi chế độ này</div>
                )}
              </div>
              {r.d && (
                <div className="text-right">
                  <div className="num text-lg font-bold text-accent">{METRICS[sortKey].format(r.d[sortKey])}</div>
                  <div className="text-[10px] text-fg-subtle">{METRICS[sortKey].short}</div>
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
