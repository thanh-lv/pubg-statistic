import type { PlayerSummary } from "@shared/types";
import { Clock3, Crown, Map as MapIcon, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useSquadHistory } from "@/hooks/queries";
import { mapInfo } from "@/lib/constants";
import { fmt1, fmtInt, fmtPct } from "@/lib/format";
import {
  byMap,
  byTime,
  lineups,
  summary,
  toAppearances,
  withVsAlone,
  type AggView,
  type Appearance,
  type MatchFilter,
} from "@/lib/together";
import { cn } from "@/lib/utils";
import { Avatar } from "../ui/Avatar";
import { Segmented } from "../ui/Segmented";
import { InfoTip, Tip } from "../ui/Tip";
import type { SquadRow } from "./types";

const dayFmt = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" });
const dateTimeFmt = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const rankText = (r: number) => `#${fmt1(r)}`;

export function TogetherStats({ rows, players }: { rows: SquadRow[]; players: PlayerSummary[] }) {
  const h = useSquadHistory(players);
  const [filter, setFilter] = useState<MatchFilter>("all");

  const orderKey = rows.map((r) => r.id).join(",");
  const rowOf = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const apps = useMemo(() => toAppearances(h.briefs, orderKey.split(","), filter), [h.briefs, orderKey, filter]);
  const stats = useMemo(
    () => ({
      sum: summary(apps, rows.length),
      lineups: lineups(apps),
      vs: withVsAlone(apps, orderKey.split(",")),
      maps: byMap(apps),
      times: byTime(apps),
    }),
    [apps, rows.length, orderKey],
  );

  if (h.total === 0) return null;
  const { sum } = stats;
  const showVs = stats.vs.some((v) => v.together.n > 0 && v.alone.n > 0);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
        <div>
          <h2 className="flex items-center gap-1.5 font-display text-lg font-semibold">
            <Users className="size-5 text-accent" /> Chơi chung
            <InfoTip term="together" />
          </h2>
          <p className="text-xs text-fg-subtle">
            Lịch sử ~14 ngày gần nhất
            {sum.from && sum.to ? ` · ${dayFmt.format(sum.from)} – ${dayFmt.format(sum.to)}` : ""}
          </p>
        </div>
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Tất cả" },
            { value: "official", label: "Thường" },
            { value: "competitive", label: "Rank" },
          ]}
        />
      </div>

      {h.loading && (
        <div className="px-4 pt-4 sm:px-5">
          <div className="mb-1 flex justify-between text-xs text-fg-subtle">
            <span>Đang tải lịch sử trận…</span>
            <span className="num">
              {h.done}/{h.total}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(h.done / h.total) * 100}%` }} />
          </div>
        </div>
      )}

      {apps.length === 0 ? (
        !h.loading && (
          <p className="px-5 py-10 text-center text-sm text-fg-subtle">
            Không có trận battle royale nào {filter === "competitive" ? "rank " : filter === "official" ? "thường " : ""}trong
            khoảng thời gian này.
          </p>
        )
      ) : (
        <div className="space-y-6 p-4 sm:p-5">
          {/* Tổng quan */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Tile label="Trận" value={fmtInt(sum.matches)} sub={`${fmtInt(apps.length)} lượt của đội`} />
            <Tile
              label="Đi cùng nhau"
              value={fmtInt(sum.together)}
              sub={`${fmtPct(sum.together / apps.length)} số lượt`}
            />
            {rows.length >= 2 ? (
              <Tile label={`Đủ ${rows.length} người`} value={fmtInt(sum.full)} sub="trận cả đội hình" />
            ) : (
              <Tile label="Top 1" value={fmtInt(sum.total.wins)} sub="lượt thắng" />
            )}
            <Tile
              label="Top 10"
              value={fmtPct(sum.total.top10Rate)}
              sub={`${fmtInt(sum.total.wins)} lần Top 1 · hạng TB ${rankText(sum.total.avgRank)}`}
            />
          </div>

          <LineupTable data={stats.lineups} rowOf={rowOf} />

          {showVs && <WithVsAlone data={stats.vs} rowOf={rowOf} />}

          <div className="grid gap-6 lg:grid-cols-2">
            <Breakdown
              title="Theo bản đồ"
              icon={<MapIcon className="size-4" />}
              items={stats.maps.map((m) => ({
                key: m.mapName,
                label: mapInfo(m.mapName).name,
                color: mapInfo(m.mapName).color,
                v: m,
              }))}
            />
            <Breakdown
              title="Theo khung giờ"
              icon={<Clock3 className="size-4" />}
              items={stats.times
                .filter((t) => t.n > 0)
                .map((t) => ({ key: t.key, label: t.label, hint: t.range, color: "#94a3b8", v: t }))}
            />
          </div>

          <FormStrip apps={apps} rowOf={rowOf} />
        </div>
      )}
    </section>
  );
}

/* ------------------------------ phần con ------------------------------ */

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <p className="text-[11px] text-fg-subtle">{label}</p>
      <p className="num font-display text-2xl font-bold">{value}</p>
      {sub && <p className="truncate text-[11px] text-fg-subtle">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children, term }: { children: React.ReactNode; term?: Parameters<typeof InfoTip>[0]["term"] }) {
  return (
    <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold">
      {children}
      {term && <InfoTip term={term} />}
    </h3>
  );
}

function Members({ members, rowOf }: { members: { playerId: string; name: string }[]; rowOf: Map<string, SquadRow> }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex shrink-0 -space-x-2">
        {members.map((p) => (
          <span key={p.playerId} className="rounded-lg ring-2 ring-ink-850">
            <Avatar name={p.name} size="sm" color={rowOf.get(p.playerId)?.color} />
          </span>
        ))}
      </span>
      <span className="min-w-0 truncate font-medium">
        {members.map((p) => p.name).join(" + ")}
        {members.length === 1 && <span className="font-normal text-fg-subtle"> · đi lẻ</span>}
      </span>
    </span>
  );
}

function LineupTable({ data, rowOf }: { data: ReturnType<typeof lineups>; rowOf: Map<string, SquadRow> }) {
  const [all, setAll] = useState(false);
  const shown = all ? data : data.slice(0, 6);
  // Đội hình hiệu quả nhất: hạng TB tốt nhất trong các đội hình chơi ≥ 3 trận
  const eligible = data.filter((d) => d.n >= 3);
  const bestKey = eligible.length > 1 ? eligible.reduce((a, b) => (b.avgRank < a.avgRank ? b : a)).key : null;

  return (
    <div>
      <SectionTitle term="lineup">Đội hình nào mạnh nhất?</SectionTitle>
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="text-right text-xs text-fg-subtle">
              <th className="w-[40%] py-2 pl-4 text-left font-medium sm:pl-0">Đội hình</th>
              <th className="px-2 py-2 font-medium">Trận</th>
              <th className="px-2 py-2 font-medium">Top 1</th>
              <th className="px-2 py-2 font-medium">
                <Tip term="top10Rate">Top 10</Tip>
              </th>
              <th className="px-2 py-2 font-medium">
                <Tip term="avgRank">Hạng TB</Tip>
              </th>
              <th className="px-2 py-2 font-medium">Kill/trận</th>
              <th className="py-2 pr-4 pl-2 font-medium sm:pr-0">Dmg/trận</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((d) => (
              <tr key={d.key} className={cn("border-t border-white/[0.05] text-right", d.key === bestKey && "bg-accent/[0.05]")}>
                <td className="max-w-0 py-2 pl-4 text-left sm:pl-0">
                  <div className="flex items-center gap-1.5">
                    <Members members={d.members} rowOf={rowOf} />
                    {d.key === bestKey && <Crown className="size-3.5 shrink-0 text-accent" aria-label="Hiệu quả nhất" />}
                  </div>
                </td>
                <td className="num px-2 font-semibold">{d.n}</td>
                <td className={cn("num px-2", d.wins > 0 && "text-accent")}>{d.wins}</td>
                <td className="px-2">
                  <RateBar value={d.top10Rate} />
                </td>
                <td className="num px-2">{rankText(d.avgRank)}</td>
                <td className="num px-2">{fmt1(d.teamKills)}</td>
                <td className="num py-2 pr-4 pl-2 sm:pr-0">{fmtInt(d.teamDmg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > 6 && (
        <button onClick={() => setAll((v) => !v)} className="mt-2 text-xs font-medium text-fg-muted hover:text-fg">
          {all ? "Thu gọn" : `Xem cả ${data.length} đội hình`}
        </button>
      )}
      <p className="mt-2 text-[11px] text-fg-subtle">Kill/Dmg tính tổng của những người trong đội hình, mỗi trận.</p>
    </div>
  );
}

function RateBar({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-white/[0.06] sm:block">
        <span className="block h-full rounded-full bg-win" style={{ width: `${value * 100}%` }} />
      </span>
      <span className="num w-12">{fmtPct(value)}</span>
    </span>
  );
}

function WithVsAlone({ data, rowOf }: { data: ReturnType<typeof withVsAlone>; rowOf: Map<string, SquadRow> }) {
  const metrics: { label: string; get: (v: AggView) => number; fmt: (n: number) => string; lowerBetter?: boolean }[] = [
    { label: "Top 10", get: (v) => v.top10Rate, fmt: fmtPct },
    { label: "Hạng TB", get: (v) => v.avgRank, fmt: rankText, lowerBetter: true },
    { label: "Kill/trận", get: (v) => v.killsPP, fmt: fmt1 },
    { label: "Dmg/trận", get: (v) => v.dmgPP, fmt: fmtInt },
  ];
  return (
    <div>
      <SectionTitle>Đi cùng đội vs đi lẻ</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data
          .filter((d) => d.together.n > 0 && d.alone.n > 0)
          .map((d) => {
            const row = rowOf.get(d.id);
            if (!row) return null;
            return (
              <div key={d.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Avatar name={row.name} size="sm" color={row.color} />
                  <span className="truncate font-semibold">{row.name}</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-right text-fg-subtle">
                      <th />
                      <th className="pb-1 font-medium">Cùng đội · {d.together.n}</th>
                      <th className="pb-1 font-medium">Đi lẻ · {d.alone.n}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((m) => {
                      const a = m.get(d.together);
                      const b = m.get(d.alone);
                      const aBetter = m.lowerBetter ? a < b : a > b;
                      const bBetter = m.lowerBetter ? b < a : b > a;
                      return (
                        <tr key={m.label} className="text-right">
                          <td className="py-0.5 text-left text-fg-subtle">{m.label}</td>
                          <td className={cn("num py-0.5", aBetter && "font-semibold text-win")}>{m.fmt(a)}</td>
                          <td className={cn("num py-0.5", bBetter && "font-semibold text-win")}>{m.fmt(b)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function Breakdown({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: { key: string; label: string; hint?: string; color: string; v: AggView }[];
}) {
  const bestRank = items.filter((i) => i.v.n >= 3).reduce((m, i) => Math.min(m, i.v.avgRank), Infinity);
  return (
    <div>
      <SectionTitle>
        <span className="text-fg-subtle">{icon}</span> {title}
      </SectionTitle>
      <div className="space-y-1">
        <div className="grid grid-cols-[minmax(0,1fr)_2.5rem_5.5rem_3.5rem_3rem] gap-2 px-2 text-right text-[11px] text-fg-subtle">
          <span />
          <span>Trận</span>
          <span>Top 10</span>
          <span>Hạng TB</span>
          <span>Kill</span>
        </div>
        {items.map((i) => (
          <div
            key={i.key}
            className={cn(
              "grid grid-cols-[minmax(0,1fr)_2.5rem_5.5rem_3.5rem_3rem] items-center gap-2 rounded-lg px-2 py-1.5 text-right text-sm",
              i.v.n >= 3 && i.v.avgRank === bestRank ? "bg-win/[0.07]" : "bg-white/[0.02]",
            )}
          >
            <span className="flex min-w-0 items-center gap-2 text-left">
              <span className="size-2 shrink-0 rounded-full" style={{ background: i.color }} />
              <span className="truncate font-medium">{i.label}</span>
              {i.hint && <span className="hidden text-[11px] text-fg-subtle sm:inline">{i.hint}</span>}
            </span>
            <span className="num">{i.v.n}</span>
            <RateBar value={i.v.top10Rate} />
            <span className="num">{rankText(i.v.avgRank)}</span>
            <span className="num" title="Kill trung bình mỗi người mỗi trận">
              {fmt1(i.v.killsPP)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormStrip({ apps, rowOf }: { apps: Appearance[]; rowOf: Map<string, SquadRow> }) {
  const recent = apps.slice(0, 30);
  return (
    <div>
      <SectionTitle>Phong độ gần đây</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {recent.map((a) => {
          const kills = a.members.reduce((s, p) => s + p.kills, 0);
          const tone =
            a.rank === 1
              ? "bg-accent text-ink-950"
              : a.rank <= 5
                ? "bg-sky-400/15 text-sky-300 ring-1 ring-sky-400/30"
                : a.rank <= 10
                  ? "bg-white/[0.08] text-fg ring-1 ring-white/10"
                  : "bg-white/[0.03] text-fg-subtle ring-1 ring-white/[0.06]";
          return (
            <Link
              key={`${a.match.id}:${a.key}`}
              to={`/match/${a.match.id}?player=${a.members[0].playerId}`}
              title={`${mapInfo(a.match.mapName).name} · ${dateTimeFmt.format(a.t)} · ${a.members.map((p) => p.name).join(", ")} · ${kills} kill`}
              className={cn("flex w-11 flex-col items-center rounded-lg py-1 transition hover:brightness-125", tone)}
            >
              <span className="num text-xs font-bold">#{a.rank}</span>
              <span className="mt-0.5 flex gap-0.5">
                {a.members.map((p) => (
                  <span key={p.playerId} className="size-1.5 rounded-full" style={{ background: rowOf.get(p.playerId)?.color }} />
                ))}
              </span>
            </Link>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-fg-subtle">
        Mới nhất ở bên trái. Chấm màu = ai có mặt trong trận. Bấm để xem chi tiết trận.
      </p>
    </div>
  );
}
