import type { PlayerSummary } from "@shared/types";
import { ArrowDownRight, ArrowUpRight, Lightbulb, Loader2, Play, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useSquadHistory } from "@/hooks/queries";
import { appearanceKey, useInsightsHistory } from "@/hooks/useInsightsHistory";
import { mapInfo } from "@/lib/constants";
import { aggregate, GROUP_LABEL, METRICS, weakSpots, type Aggregate, type Group, type InsightRecord, type MetricDef } from "@/lib/telemetry/history";
import { LIMITS, toneFor } from "@/lib/telemetry/tone";
import { toAppearances } from "@/lib/together";
import { cn } from "@/lib/utils";
import { Stat, TONE } from "../match/TeamInsights";
import { Segmented } from "../ui/Segmented";
import type { SquadRow } from "./types";

const dateTimeFmt = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const GROUPS: Group[] = ["teamplay", "combat", "rotation", "loot"];
/** Cột hiển thị trong bảng từng trận */
const TABLE_KEYS = ["trade", "revive", "fightWin", "firstHit", "dmgRatio", "late", "blueDamage", "firstWeapon"] as const;
const RECENT = 5;

type Together = "together" | "all";
type Limit = "10" | "20" | "50";

export function TeamInsightsHistory({ rows, players }: { rows: SquadRow[]; players: PlayerSummary[] }) {
  const h = useSquadHistory(players);
  const { records, progress, run, cancel, clear } = useInsightsHistory();
  const [together, setTogether] = useState<Together>(rows.length >= 2 ? "together" : "all");
  const [limit, setLimit] = useState<Limit>("20");
  const n = Number(limit);
  const minTogether = together === "together" ? 2 : 1;

  const orderKey = rows.map((r) => r.id).join(",");
  const idSet = useMemo(() => new Set(orderKey.split(",")), [orderKey]);

  // Lượt chơi gần đây (≤ 14 ngày) có telemetry
  const apps = useMemo(
    () =>
      toAppearances(h.briefs, orderKey.split(","), "all")
        .filter((a) => a.members.length >= minTogether && a.match.telemetryUrl)
        .slice(0, n),
    [h.briefs, orderKey, minTogether, n],
  );
  const pending = apps.filter((a) => {
    const k = appearanceKey(a);
    return k && !records[k];
  });

  // Đã phân tích (kể cả trận cũ hơn 14 ngày còn trong bộ nhớ trình duyệt)
  const shown = useMemo(
    () =>
      Object.values(records)
        .filter((r) => r.members.filter((m) => idSet.has(m.id)).length >= minTogether)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, n),
    [records, idSet, minTogether, n],
  );
  const agg = useMemo(() => aggregate(shown), [shown]);
  const trend = useMemo(
    () => (shown.length >= RECENT + 3 ? { recent: aggregate(shown.slice(0, RECENT)), older: aggregate(shown.slice(RECENT)) } : null),
    [shown],
  );
  const weak = useMemo(() => weakSpots(agg).slice(0, 3), [agg]);
  const running = !!progress?.running;

  if (h.total === 0) return null;

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
        <div>
          <h2 className="font-display text-lg font-semibold">Phân tích đội qua nhiều trận</h2>
          <p className="text-xs text-fg-subtle">
            Từ telemetry từng trận · kết quả lưu trên trình duyệt này nên vẫn xem được sau khi PUBG xoá dữ liệu trận (14 ngày)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {rows.length >= 2 && (
            <Segmented<Together>
              size="sm"
              value={together}
              onChange={setTogether}
              options={[
                { value: "together", label: "Chơi chung ≥ 2 người" },
                { value: "all", label: "Mọi trận" },
              ]}
            />
          )}
          <Segmented<Limit>
            size="sm"
            value={limit}
            onChange={setLimit}
            options={[
              { value: "10", label: "10 trận" },
              { value: "20", label: "20 trận" },
              { value: "50", label: "50 trận" },
            ]}
          />
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <RunBar
          loadingHistory={h.loading}
          pending={pending.length}
          progress={progress}
          onRun={() => run(apps)}
          onCancel={cancel}
          onClear={Object.keys(records).length ? clear : undefined}
        />

        {shown.length === 0 ? (
          !running && (
            <p className="py-6 text-center text-sm text-fg-subtle">
              Chưa có trận nào được phân tích{minTogether > 1 ? " (chơi chung từ 2 người trong đội hình)" : ""}. Bấm “Phân tích” để bắt đầu.
            </p>
          )
        ) : (
          <>
            {weak.length > 0 && <WeakSpots weak={weak} agg={agg} />}
            {GROUPS.map((g) => (
              <div key={g}>
                <h3 className="mb-2 text-sm font-semibold">{GROUP_LABEL[g]}</h3>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {METRICS.filter((m) => m.group === g).map((m) => (
                    <MetricTile key={m.key} m={m} agg={agg} trend={trend} />
                  ))}
                </div>
              </div>
            ))}
            <MatchTable records={shown} idSet={idSet} />
            <p className="text-[11px] text-fg-subtle">
              Tỉ lệ được cộng dồn tử/mẫu qua {shown.length} trận (trận nhiều tình huống nặng ký hơn); khoảng cách lấy trung vị, các số đo khác lấy trung bình mỗi trận.
              {trend && ` Mũi tên so sánh ${RECENT} trận gần nhất với các trận trước đó.`}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function RunBar({
  loadingHistory,
  pending,
  progress,
  onRun,
  onCancel,
  onClear,
}: {
  loadingHistory: boolean;
  pending: number;
  progress: ReturnType<typeof useInsightsHistory>["progress"];
  onRun: () => void;
  onCancel: () => void;
  onClear?: () => void;
}) {
  if (progress?.running) {
    return (
      <div className="space-y-2 rounded-xl bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin text-accent" />
          Đang phân tích trận {Math.min(progress.done + 1, progress.total)}/{progress.total}…
          <button type="button" onClick={onCancel} className="btn-ghost ml-auto px-2 py-1 text-xs">
            <X className="size-3.5" /> Dừng
          </button>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3 text-sm">
      {loadingHistory ? (
        <span className="flex items-center gap-2 text-fg-muted">
          <Loader2 className="size-4 animate-spin" /> Đang tải danh sách trận gần đây…
        </span>
      ) : pending > 0 ? (
        <>
          <button type="button" className="btn-primary" onClick={onRun}>
            <Play className="size-4" /> Phân tích {pending} trận
          </button>
          <span className="text-xs text-fg-subtle">Mỗi trận tải khoảng 5–10 MB telemetry từ PUBG, chỉ tải 1 lần.</span>
        </>
      ) : (
        <span className="text-fg-muted">Đã phân tích hết các trận gần đây.</span>
      )}
      {progress && progress.failed > 0 && <span className="text-xs text-loss">{progress.failed} trận lỗi (telemetry đã hết hạn hoặc lỗi mạng).</span>}
      {onClear && (
        <button type="button" onClick={onClear} className="ml-auto inline-flex items-center gap-1 text-xs text-fg-subtle hover:text-loss">
          <Trash2 className="size-3.5" /> Xoá kết quả đã lưu
        </button>
      )}
    </div>
  );
}

function WeakSpots({ weak, agg }: { weak: MetricDef[]; agg: Aggregate }) {
  return (
    <div className="rounded-xl border border-loss/25 bg-loss/[0.05] p-4">
      <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold">
        <Lightbulb className="size-4 text-accent" /> Nên cải thiện trước
      </h3>
      <ul className="space-y-2.5">
        {weak.map((m) => (
          <li key={m.key} className="text-sm">
            <span className="font-semibold">{m.label}</span>{" "}
            <span className="num font-semibold text-loss">{m.format(m.value(agg)!)}</span>
            <span className="text-fg-subtle"> · {GROUP_LABEL[m.group]}</span>
            <p className="mt-0.5 text-fg-muted">{m.advice}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetricTile({ m, agg, trend }: { m: MetricDef; agg: Aggregate; trend: { recent: Aggregate; older: Aggregate } | null }) {
  const v = m.value(agg);
  const sample = m.sample?.(agg);
  const r = trend ? m.value(trend.recent) : null;
  const o = trend ? m.value(trend.older) : null;
  const higherBetter = LIMITS[m.key][2];
  const delta = r != null && o != null && Number.isFinite(r) && Number.isFinite(o) && Math.abs(r - o) > 1e-9 ? r - o : null;
  const better = delta != null && (higherBetter ? delta > 0 : delta < 0);

  return (
    <Stat
      label={m.label}
      term={m.term}
      value={v == null ? "—" : m.format(v)}
      tone={toneFor(m.key, v)}
      sub={
        <span className="flex flex-wrap items-center gap-x-2">
          {sample != null && <span>{sample} tình huống</span>}
          {delta != null && (
            <span className={cn("inline-flex items-center gap-0.5 font-medium", better ? "text-win" : "text-loss")}>
              {delta > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {RECENT} trận gần nhất: {m.format(r!)}
            </span>
          )}
        </span>
      }
    />
  );
}

function MatchTable({ records, idSet }: { records: InsightRecord[]; idSet: Set<string> }) {
  const cols = TABLE_KEYS.map((k) => METRICS.find((m) => m.key === k)!);
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">
        Từng trận <span className="font-normal text-fg-subtle">· bấm để xem chi tiết</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-xs">
          <thead className="text-fg-subtle">
            <tr>
              <th className="pb-1.5 text-left font-medium">Trận</th>
              <th className="pb-1.5 text-left font-medium">Đội hình</th>
              <th className="pb-1.5 text-right font-medium">Hạng</th>
              {cols.map((c) => (
                <th key={c.key} className="pb-1.5 text-right font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="num">
            {records.map((r) => {
              const tracked = r.members.filter((m) => idSet.has(m.id));
              return (
                <tr key={`${r.matchId}:${r.teamId}`} className="border-t border-white/[0.05] hover:bg-white/[0.03]">
                  <td className="py-1.5">
                    <Link to={`/match/${r.matchId}?player=${tracked[0]?.id ?? r.members[0]?.id}`} className="hover:text-accent">
                      <span className="text-fg-muted">{dateTimeFmt.format(new Date(r.createdAt))}</span> · {mapInfo(r.mapName).name}
                    </Link>
                  </td>
                  <td className="max-w-48 truncate py-1.5 text-fg-muted" title={r.members.map((m) => m.name).join(", ")}>
                    {tracked.map((m) => m.name).join(", ")}
                    {r.members.length > tracked.length && <span className="text-fg-subtle"> +{r.members.length - tracked.length}</span>}
                  </td>
                  <td className={cn("py-1.5 text-right font-semibold", r.rank === 1 ? "text-accent" : r.rank <= 10 ? "text-fg" : "text-fg-muted")}>
                    #{r.rank}
                  </td>
                  {cols.map((c) => {
                    const v = c.perMatch(r);
                    return (
                      <td key={c.key} className={cn("py-1.5 text-right", v == null ? "text-fg-subtle" : TONE[toneFor(c.key, v)])}>
                        {v == null ? "—" : c.format(v)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
