import type { MatchBrief, PlayerSummary } from "@shared/types";
import { Loader2, PlaneLanding, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useSquadHistory } from "@/hooks/queries";
import { isCovered, useLandings } from "@/hooks/useLandings";
import { mapInfo } from "@/lib/constants";
import { fmt1, fmtInt, fmtPct } from "@/lib/format";
import { MAP_2D, TILE_GRID } from "@/lib/maps";
import { placeName } from "@/lib/places";
import type { Landing } from "@/lib/telemetry/landing";
import { isBattleRoyale } from "@/lib/together";
import { cn } from "@/lib/utils";
import { Avatar } from "../ui/Avatar";
import { Segmented } from "../ui/Segmented";
import { InfoTip, Tip } from "../ui/Tip";
import type { SquadRow } from "./types";

/** Chết trong vòng 3 phút sau khi đáp = chết sớm */
const EARLY = 180;
const COUNTS = ["10", "20", "40"] as const;
type CountOpt = (typeof COUNTS)[number];

interface Point {
  brief: MatchBrief;
  l: Landing;
  rank: number;
}

const dateFmt = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const isEarly = (l: Landing) => l.survived != null && l.survived <= EARLY;

export function LandingSpots({ rows, players }: { rows: SquadRow[]; players: PlayerSummary[] }) {
  const h = useSquadHistory(players);
  const { cache, progress, analyze, stop } = useLandings();
  const [count, setCount] = useState<CountOpt>("20");
  const [mapSel, setMapSel] = useState<string | null>(null);
  const rowOf = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const candidates = useMemo(
    () =>
      h.briefs
        .filter((b) => isBattleRoyale(b) && b.telemetryUrl && b.players.length > 0)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, Number(count)),
    [h.briefs, count],
  );
  const missing = candidates.filter((b) => !isCovered(b, cache[b.id]));

  const points: Point[] = useMemo(
    () =>
      candidates.flatMap((b) => {
        const c = cache[b.id];
        if (!isCovered(b, c)) return [];
        return c!.landings.flatMap((l) => {
          const p = b.players.find((x) => x.playerId === l.playerId);
          return p ? [{ brief: b, l, rank: p.winPlace }] : [];
        });
      }),
    [candidates, cache],
  );

  const maps = useMemo(() => {
    const by = new Map<string, Set<string>>();
    for (const p of points) by.set(p.brief.mapName, (by.get(p.brief.mapName) ?? new Set()).add(p.brief.id));
    return [...by.entries()].map(([mapName, s]) => ({ mapName, n: s.size })).sort((a, b) => b.n - a.n);
  }, [points]);
  const mapName = mapSel && maps.some((m) => m.mapName === mapSel) ? mapSel : maps[0]?.mapName;
  const mapPoints = points.filter((p) => p.brief.mapName === mapName);
  const analyzedCount = candidates.length - missing.length;

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
        <div>
          <h2 className="flex items-center gap-1.5 font-display text-lg font-semibold">
            <PlaneLanding className="size-5 text-accent" /> Điểm nhảy dù
          </h2>
          <p className="text-xs text-fg-subtle">
            Từ telemetry các trận gần nhất · đã phân tích {analyzedCount}/{candidates.length} trận
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-fg-subtle">Số trận</span>
          <Segmented
            size="sm"
            value={count}
            onChange={setCount}
            options={COUNTS.map((c) => ({ value: c, label: c }))}
          />
          {progress ? (
            <button className="btn-ghost h-9" onClick={stop}>
              <X className="size-4" /> Dừng
            </button>
          ) : (
            <button
              className="btn-primary h-9"
              disabled={h.loading || missing.length === 0}
              onClick={() => analyze(missing)}
              title="Tải telemetry (~2 MB/trận) và tìm điểm tiếp đất"
            >
              {h.loading ? <Loader2 className="size-4 animate-spin" /> : <PlaneLanding className="size-4" />}
              {missing.length > 0 ? `Phân tích ${missing.length} trận` : "Đã phân tích đủ"}
            </button>
          )}
        </div>
      </div>

      {progress && (
        <div className="px-4 pt-4 sm:px-5">
          <div className="mb-1 flex justify-between text-xs text-fg-subtle">
            <span>Đang tải telemetry & tìm điểm đáp… (~2 MB/trận)</span>
            <span className="num">
              {progress.done}/{progress.total}
              {progress.failed > 0 && ` · lỗi ${progress.failed}`}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full bg-accent transition-[width]"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {points.length === 0 ? (
        !progress && (
          <div className="px-5 py-10 text-center text-sm text-fg-muted">
            <PlaneLanding className="mx-auto mb-2 size-8 text-fg-subtle" />
            Bấm <b className="text-fg">Phân tích</b> để xem cả đội hay nhảy ở đâu, nhảy chỗ đông hay vắng, và có hay "đi
            sớm" không.
            <p className="mt-1 text-xs text-fg-subtle">Kết quả được lưu trong trình duyệt, lần sau mở lại không phải tải.</p>
          </div>
        )
      ) : (
        <div className="space-y-6 p-4 sm:p-5">
          <PlayerSummaryCards points={points} rows={rows} />

          <div>
            {maps.length > 1 && (
              <Segmented
                size="sm"
                wrap
                className="mb-3"
                value={mapName!}
                onChange={setMapSel}
                options={maps.map((m) => ({ value: m.mapName, label: `${mapInfo(m.mapName).name} · ${m.n}` }))}
              />
            )}
            <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
              <LandingMap mapName={mapName!} points={mapPoints} rowOf={rowOf} />
              <PlaceTable points={mapPoints} rowOf={rowOf} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------ tóm tắt từng người ------------------------------ */

function PlayerSummaryCards({ points, rows }: { points: Point[]; rows: SquadRow[] }) {
  const data = rows
    .map((r) => {
      const mine = points.filter((p) => p.l.playerId === r.id);
      const byPlace = new Map<string, { label: string; n: number }>();
      for (const p of mine) {
        const k = `${p.brief.mapName}:${p.l.place ?? "-"}`;
        const e = byPlace.get(k) ?? { label: `${placeName(p.l.place)} · ${mapInfo(p.brief.mapName).name}`, n: 0 };
        e.n++;
        byPlace.set(k, e);
      }
      // Ưu tiên địa danh có tên; "Ngoài địa danh" chỉ hiện khi không có gì khác
      const ranked = [...byPlace.entries()].sort((a, b) => b[1].n - a[1].n);
      const fav = (ranked.find(([k]) => !k.endsWith(":-")) ?? ranked[0])?.[1];
      return {
        r,
        n: mine.length,
        fav,
        nearby: mine.reduce((s, p) => s + p.l.nearby, 0) / (mine.length || 1),
        early: mine.filter((p) => isEarly(p.l)).length / (mine.length || 1),
      };
    })
    .filter((d) => d.n > 0);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {data.map((d) => (
        <div key={d.r.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="flex items-center gap-2">
            <Avatar name={d.r.name} size="sm" color={d.r.color} />
            <span className="truncate font-semibold">{d.r.name}</span>
            <span className="ml-auto text-xs text-fg-subtle">{d.n} lần đáp</span>
          </div>
          <p className="mt-2 text-[11px] text-fg-subtle">Hay nhảy nhất</p>
          <p className="truncate font-display text-lg font-bold" style={{ color: d.r.color }}>
            {d.fav?.label} <span className="text-sm font-medium text-fg-muted">×{d.fav?.n}</span>
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-ink-950/50 py-1.5">
              <p className="text-[10px] text-fg-subtle">
                <Tip term="hotDrop">Nhảy đông</Tip>
              </p>
              <p className="num text-sm font-semibold">{fmt1(d.nearby)} người</p>
            </div>
            <div className="rounded-lg bg-ink-950/50 py-1.5">
              <p className="text-[10px] text-fg-subtle">
                <Tip term="earlyDeath">Chết sớm</Tip>
              </p>
              <p className={cn("num text-sm font-semibold", d.early >= 0.4 && "text-loss")}>{fmtPct(d.early)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ bảng địa điểm của 1 bản đồ ------------------------------ */

function PlaceTable({ points, rowOf }: { points: Point[]; rowOf: Map<string, SquadRow> }) {
  const data = useMemo(() => {
    const by = new Map<string, { place: string | null; matches: Map<string, number>; who: Set<string>; ls: Landing[] }>();
    for (const p of points) {
      const k = p.l.place ?? "-";
      const e = by.get(k) ?? { place: p.l.place, matches: new Map<string, number>(), who: new Set<string>(), ls: [] as Landing[] };
      e.matches.set(p.brief.id, p.rank);
      e.who.add(p.l.playerId);
      e.ls.push(p.l);
      by.set(k, e);
    }
    return [...by.values()]
      .map((e) => {
        const ranks = [...e.matches.values()];
        return {
          ...e,
          n: e.matches.size,
          avgRank: ranks.reduce((a, b) => a + b, 0) / ranks.length,
          nearby: e.ls.reduce((s, l) => s + l.nearby, 0) / e.ls.length,
          early: e.ls.filter(isEarly).length / e.ls.length,
        };
      })
      .sort((a, b) => b.n - a.n || Number(!a.place) - Number(!b.place) || a.avgRank - b.avgRank);
  }, [points]);

  return (
    <div className="min-w-0">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        Địa điểm hay nhảy
        <InfoTip term="hotDrop" />
      </h3>
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="w-full min-w-[21rem] text-sm">
          <thead>
            <tr className="text-right text-xs text-fg-subtle">
              <th className="py-2 pl-4 text-left font-medium sm:pl-0">Địa điểm</th>
              <th className="px-2 font-medium">Trận</th>
              <th className="px-2 font-medium">
                <Tip term="hotDrop">Đông</Tip>
              </th>
              <th className="px-2 font-medium">
                <Tip term="earlyDeath">Chết sớm</Tip>
              </th>
              <th className="pr-4 pl-2 font-medium sm:pr-0">
                <Tip term="avgRank">Hạng TB</Tip>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.place ?? "-"} className="border-t border-white/[0.05] text-right">
                <td className="py-2 pl-4 text-left sm:pl-0">
                  <span className={cn("font-medium", !d.place && "text-fg-subtle")}>{placeName(d.place)}</span>
                  <span className="ml-2 inline-flex gap-0.5 align-middle">
                    {[...d.who].map((id) => (
                      <span
                        key={id}
                        className="size-2 rounded-full"
                        style={{ background: rowOf.get(id)?.color }}
                        title={rowOf.get(id)?.name}
                      />
                    ))}
                  </span>
                </td>
                <td className="num px-2 font-semibold">{d.n}</td>
                <td className="num px-2">{fmt1(d.nearby)}</td>
                <td className={cn("num px-2", d.early >= 0.4 && "text-loss")}>{fmtPct(d.early)}</td>
                <td className="num pr-4 pl-2 sm:pr-0">#{fmt1(d.avgRank)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-fg-subtle">
        Đông = số người chơi thật khác đội đáp trong 300 m. Chết sớm = bị hạ ≤ 3 phút sau khi đáp.
      </p>
    </div>
  );
}

/* ------------------------------ bản đồ điểm đáp ------------------------------ */

const W = 1000;

function LandingMap({ mapName, points, rowOf }: { mapName: string; points: Point[]; rowOf: Map<string, SquadRow> }) {
  const info = MAP_2D[mapName];

  // Khung nhìn: ôm sát các điểm đáp (vuông, tối thiểu 280 đơn vị)
  const view = useMemo(() => {
    if (points.length === 0) return { x: 0, y: 0, w: W };
    const xs = points.map((p) => p.l.x * W);
    const ys = points.map((p) => p.l.y * W);
    const pad = 70;
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;
    const w = Math.min(W, Math.max(280, maxX - minX, maxY - minY));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return {
      x: Math.min(Math.max(0, cx - w / 2), W - w),
      y: Math.min(Math.max(0, cy - w / 2), W - w),
      w,
    };
  }, [points]);
  const s = view.w / W;

  const tiles = useMemo(() => {
    if (!info?.tiles || view.w >= 700) return [];
    const cell = W / TILE_GRID;
    const out: { r: number; c: number }[] = [];
    for (let r = 0; r < TILE_GRID; r++)
      for (let c = 0; c < TILE_GRID; c++) {
        const x = c * cell;
        const y = r * cell;
        if (x < view.x + view.w && x + cell > view.x && y < view.y + view.w && y + cell > view.y) out.push({ r, c });
      }
    return out;
  }, [info, view]);

  // Nhãn địa danh: đặt ở trung bình các điểm đáp cùng địa danh
  const labels = useMemo(() => {
    const by = new Map<string, { x: number; y: number; n: number }>();
    for (const p of points) {
      if (!p.l.place) continue;
      const e = by.get(p.l.place) ?? { x: 0, y: 0, n: 0 };
      e.x += p.l.x * W;
      e.y += p.l.y * W;
      e.n++;
      by.set(p.l.place, e);
    }
    return [...by.entries()].map(([place, e]) => ({ place, x: e.x / e.n, y: e.y / e.n, n: e.n }));
  }, [points]);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-ink-950 ring-1 ring-white/[0.06]">
      <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.w}`} className="size-full" role="img" aria-label="Bản đồ điểm tiếp đất">
        {info && <image href={info.image} x={0} y={0} width={W} height={W} />}
        {tiles.map(({ r, c }) => (
          <image
            key={`${r}_${c}`}
            href={`/maps/tiles/${info!.tiles}/${r}_${c}.webp`}
            x={(c * W) / TILE_GRID}
            y={(r * W) / TILE_GRID}
            width={W / TILE_GRID + 0.4}
            height={W / TILE_GRID + 0.4}
          />
        ))}
        <rect x={0} y={0} width={W} height={W} fill="#000" opacity={0.25} />

        {points.map((p, i) => {
          const color = rowOf.get(p.l.playerId)?.color ?? "#fff";
          return (
            <g key={`${p.brief.id}:${p.l.playerId}:${i}`}>
              <circle cx={p.l.x * W} cy={p.l.y * W} r={15 * s} fill={color} fillOpacity={0.9} stroke="#0a0c10" strokeWidth={3 * s} />
              {isEarly(p.l) && (
                <circle cx={p.l.x * W} cy={p.l.y * W} r={23 * s} fill="none" stroke="#f87171" strokeWidth={3.5 * s} />
              )}
              <title>
                {`${p.l.name} · ${placeName(p.l.place)} · ${dateFmt.format(new Date(p.brief.createdAt))} · hạng #${p.rank}` +
                  ` · ${p.l.nearby} người đáp gần` +
                  (p.l.survived != null ? ` · chết sau ${Math.round(p.l.survived / 60)} phút` : "")}
              </title>
            </g>
          );
        })}

        {labels.map((lb) => (
          <text
            key={lb.place}
            x={lb.x}
            y={lb.y - 28 * s}
            textAnchor="middle"
            fontSize={30 * s}
            fontWeight={700}
            fill="#fff"
            stroke="#0a0c10"
            strokeWidth={6 * s}
            paintOrder="stroke"
            className="pointer-events-none select-none"
          >
            {placeName(lb.place)}
          </text>
        ))}
      </svg>
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-ink-950/80 px-2 py-1 text-[11px] text-fg-muted backdrop-blur">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-fg-muted" /> Điểm đáp
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-full ring-2 ring-loss" /> Chết sớm
        </span>
        <span className="num">{fmtInt(points.length)} lượt</span>
      </div>
    </div>
  );
}
