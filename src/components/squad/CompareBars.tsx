import { useState } from "react";
import { Link } from "react-router";
import { COMPARE_METRICS, METRICS, type MetricKey } from "@/lib/stats";
import { GLOSSARY } from "@/lib/glossary";
import { Segmented } from "../ui/Segmented";
import type { SquadRow } from "./types";

export function CompareBars({ rows }: { rows: SquadRow[] }) {
  const [metric, setMetric] = useState<MetricKey>("kd");
  const data = rows
    .filter((r) => r.d)
    .map((r) => ({ ...r, v: r.d![metric] }))
    .sort((a, b) => b.v - a.v);
  const max = Math.max(...data.map((d) => d.v), 0) || 1;

  if (data.length < 2) return null;

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">So sánh</h2>
        <Segmented
          size="sm"
          wrap
          value={metric}
          onChange={setMetric}
          options={COMPARE_METRICS.map((k) => ({ value: k, label: METRICS[k].short }))}
        />
      </div>
      <ul className="space-y-2.5">
        {data.map((d) => (
          <li key={d.id}>
            <Link to={`/player/${encodeURIComponent(d.name)}`} className="group grid grid-cols-[minmax(0,7rem)_1fr_4rem] items-center gap-3">
              <span className="truncate text-sm font-medium group-hover:text-accent">{d.name}</span>
              <div className="h-7 overflow-hidden rounded-lg bg-white/[0.04]">
                <div
                  className="h-full rounded-lg transition-[width] duration-700 ease-out"
                  style={{
                    width: `${Math.max(2, (d.v / max) * 100)}%`,
                    background: `linear-gradient(90deg, ${d.color}55, ${d.color})`,
                  }}
                />
              </div>
              <span className="num text-right text-sm font-semibold">{METRICS[metric].format(d.v)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-fg-subtle">
        <span className="font-semibold text-fg-muted">{GLOSSARY[METRICS[metric].term].title}.</span>{" "}
        {GLOSSARY[METRICS[metric].term].desc}
      </p>
    </div>
  );
}
