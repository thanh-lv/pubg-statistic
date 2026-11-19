import type { WeaponStat } from "@shared/types";
import { ChevronDown, Crosshair, Crown } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useSquadWeapons } from "@/hooks/queries";
import { fmtCompact, fmtInt, fmtMeters, fmtPct } from "@/lib/format";
import { CATEGORY_OF, WEAPON_CATEGORIES, weaponInfo, type WeaponCategory } from "@/lib/weapons";
import { cn } from "@/lib/utils";
import { Avatar } from "../ui/Avatar";
import { Segmented } from "../ui/Segmented";
import { Skeleton } from "../ui/Skeleton";
import { InfoTip, Tip } from "../ui/Tip";
import type { SquadRow } from "./types";

/* ------------------------------ chỉ số so sánh ------------------------------ */

type WMetric = "kills" | "knocks" | "damage" | "headshots" | "longestKill" | "mostKillsInGame" | "level";

const W_METRICS: Record<WMetric, { label: string; fmt: (n: number) => string; /** cộng dồn được cho cả đội */ sum: boolean }> = {
  kills: { label: "Kill", fmt: fmtInt, sum: true },
  knocks: { label: "Knock", fmt: fmtInt, sum: true },
  damage: { label: "Sát thương", fmt: fmtCompact, sum: true },
  headshots: { label: "Headshot", fmt: fmtInt, sum: true },
  longestKill: { label: "Kill xa nhất", fmt: fmtMeters, sum: false },
  mostKillsInGame: { label: "Max kill/trận", fmt: fmtInt, sum: false },
  level: { label: "Level", fmt: (n) => `Lv ${n}`, sum: false },
};

const PAGE = 10;

export interface PlayerWeaponsRow extends SquadRow {
  weapons: WeaponStat[] | undefined;
  byId: Map<string, WeaponStat>;
  loading: boolean;
  error: boolean;
}

export function WeaponCompare({ rows }: { rows: SquadRow[] }) {
  const queries = useSquadWeapons(rows.map((r) => r.id));

  const players: PlayerWeaponsRow[] = rows.map((r, i) => {
    const q = queries[i];
    const weapons = q?.data?.data.weapons;
    return {
      ...r,
      weapons,
      byId: new Map((weapons ?? []).map((w) => [w.id, w])),
      loading: !!q?.isPending,
      error: !!q?.error && !q.data,
    };
  });

  const anyData = players.some((p) => p.weapons && p.weapons.length > 0);
  const allLoading = players.every((p) => p.loading);
  const allFailed = players.length > 0 && players.every((p) => p.error);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-white/[0.06] px-4 py-3 sm:px-5">
        <div>
          <h2 className="flex items-center gap-1.5 font-display text-lg font-semibold">
            <Crosshair className="size-5 text-accent" /> Vũ khí
            <InfoTip term="weaponMastery" />
          </h2>
          <p className="text-xs text-fg-subtle">Theo Weapon Mastery — cộng dồn cả sự nghiệp, không đổi theo mùa/chế độ</p>
        </div>
      </div>

      {allFailed ? (
        <p className="px-5 py-8 text-center text-sm text-fg-muted">
          Không tải được dữ liệu vũ khí ({queries.find((q) => q.error)?.error?.message ?? "lỗi"}).{" "}
          <button className="text-accent hover:underline" onClick={() => queries.forEach((q) => q.refetch())}>
            Thử lại
          </button>
        </p>
      ) : allLoading ? (
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
          {rows.map((r) => (
            <Skeleton key={r.id} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
            {players.map((p) => (
              <SignatureCard key={p.id} p={p} />
            ))}
          </div>
          <StyleLegend />
          {anyData && <WeaponTable players={players.filter((p) => p.weapons)} />}
        </>
      )}
    </section>
  );
}

/* ------------------------------ thẻ "súng tủ" ------------------------------ */

export function SignatureCard({ p }: { p: PlayerWeaponsRow }) {
  const head = (
    <Link to={`/player/${encodeURIComponent(p.name)}`} className="group flex min-w-0 items-center gap-2">
      <Avatar name={p.name} size="sm" color={p.color} />
      <span className="truncate font-semibold group-hover:text-accent">{p.name}</span>
    </Link>
  );

  if (p.loading) return <Skeleton className="h-56 rounded-2xl" />;
  if (!p.weapons || p.weapons.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        {head}
        <p className="mt-6 text-center text-sm text-fg-subtle">
          {p.error ? "Không tải được dữ liệu vũ khí." : "Chưa có dữ liệu vũ khí."}
        </p>
      </div>
    );
  }

  const [top, ...rest] = p.weapons;
  const info = weaponInfo(top.id);
  const totalKills = p.weapons.reduce((s, w) => s + w.kills, 0);
  const totalDmg = p.weapons.reduce((s, w) => s + w.damage, 0);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
      style={{ backgroundImage: `radial-gradient(120% 80% at 100% 0%, ${p.color}1c, transparent 60%)` }}
    >
      <div className="flex items-center justify-between gap-2">
        {head}
        <span className="shrink-0 text-xs text-fg-subtle">
          <span className="num font-semibold text-fg-muted">{fmtInt(totalKills)}</span> kill bằng súng
        </span>
      </div>

      {/* Súng tủ */}
      <div className="mt-3 flex items-center gap-3">
        <div className="grid h-16 w-32 shrink-0 place-items-center rounded-xl bg-ink-950/60 px-2">
          <WeaponIcon id={top.id} className="max-h-12" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wider text-accent uppercase">Súng tủ</p>
          <p className="truncate font-display text-lg leading-tight font-bold">{info.name}</p>
          <p className="text-xs text-fg-subtle">
            {CATEGORY_OF[info.category].label} ·{" "}
            <Tip term="weaponLevel" className="cursor-help underline decoration-dotted underline-offset-2">
              Lv {top.level}
            </Tip>
          </p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-4 gap-1.5 text-center">
        <MiniStat label="Kill" value={fmtInt(top.kills)} sub={totalKills ? fmtPct(top.kills / totalKills) : undefined} />
        <MiniStat label="Knock" value={fmtInt(top.knocks)} />
        <MiniStat label="Sát thương" value={fmtCompact(top.damage)} sub={totalDmg ? fmtPct(top.damage / totalDmg) : undefined} />
        <MiniStat label="Headshot" value={fmtInt(top.headshots)} />
      </dl>

      {/* Top 2–4 */}
      {rest.length > 0 && (
        <ul className="mt-3 space-y-1">
          {rest.slice(0, 3).map((w, i) => (
            <li key={w.id} className="flex items-center gap-2 text-sm">
              <span className="w-4 text-xs text-fg-subtle">{i + 2}</span>
              <span className="grid h-6 w-14 shrink-0 place-items-center">
                <WeaponIcon id={w.id} className="max-h-5" />
              </span>
              <span className="min-w-0 flex-1 truncate">{weaponInfo(w.id).name}</span>
              <span className="num text-xs text-fg-muted">{fmtInt(w.kills)} kill</span>
            </li>
          ))}
        </ul>
      )}

      <StyleBar weapons={p.weapons} />
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-ink-950/50 px-1 py-1.5">
      <dt className="text-[10px] text-fg-subtle">{label}</dt>
      <dd className="num text-sm font-semibold">{value}</dd>
      {sub && <dd className="num text-[10px] text-fg-subtle">{sub}</dd>}
    </div>
  );
}

/* ------------------------------ phong cách (tỉ lệ kill theo nhóm súng) ------------------------------ */

function StyleBar({ weapons }: { weapons: WeaponStat[] }) {
  const parts = useMemo(() => {
    const by = new Map<WeaponCategory, number>();
    for (const w of weapons) {
      const c = weaponInfo(w.id).category;
      by.set(c, (by.get(c) ?? 0) + w.kills);
    }
    const total = [...by.values()].reduce((a, b) => a + b, 0);
    return WEAPON_CATEGORIES.map((c) => ({ ...c, v: by.get(c.key) ?? 0, ratio: total ? (by.get(c.key) ?? 0) / total : 0 })).filter(
      (c) => c.v > 0,
    );
  }, [weapons]);

  if (parts.length === 0) return null;
  const main = [...parts].sort((a, b) => b.v - a.v)[0];

  return (
    <div className="mt-4">
      <div className="mb-1 flex items-center justify-between text-[11px] text-fg-subtle">
        <Tip term="weaponStyle" className="cursor-help underline decoration-dotted underline-offset-2">
          Phong cách
        </Tip>
        <span>
          Thiên về <span className="font-semibold" style={{ color: main.color }}>{main.label}</span> {fmtPct(main.ratio)}
        </span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-white/[0.04]">
        {parts.map((c) => (
          <div
            key={c.key}
            title={`${c.full}: ${fmtInt(c.v)} kill (${fmtPct(c.ratio)})`}
            style={{ width: `${c.ratio * 100}%`, background: c.color }}
            className="h-full border-r border-ink-900 last:border-r-0"
          />
        ))}
      </div>
    </div>
  );
}

function StyleLegend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 px-4 pb-4 text-[11px] text-fg-subtle sm:px-5">
      {WEAPON_CATEGORIES.map((c) => (
        <span key={c.key} className="inline-flex items-center gap-1" title={c.full}>
          <span className="size-2 rounded-full" style={{ background: c.color }} />
          {c.label}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------ bảng so sánh theo súng ------------------------------ */

function WeaponTable({ players }: { players: PlayerWeaponsRow[] }) {
  const [metric, setMetric] = useState<WMetric>("kills");
  const [cat, setCat] = useState<WeaponCategory | "all">("all");
  const [expanded, setExpanded] = useState(false);
  const m = W_METRICS[metric];

  // Nhóm súng có dữ liệu
  const cats = useMemo(() => {
    const present = new Set<WeaponCategory>();
    for (const p of players) for (const w of p.weapons ?? []) if (w.kills || w.damage) present.add(weaponInfo(w.id).category);
    return WEAPON_CATEGORIES.filter((c) => present.has(c.key));
  }, [players]);

  const { list, cellMax } = useMemo(() => {
    const ids = new Set<string>();
    for (const p of players) for (const w of p.weapons ?? []) if (w.kills || w.damage || w.knocks) ids.add(w.id);
    const scored = [...ids]
      .filter((id) => cat === "all" || weaponInfo(id).category === cat)
      .map((id) => {
        const vals = players.map((p) => p.byId.get(id)?.[metric] ?? 0);
        const score = m.sum ? vals.reduce((a, b) => a + b, 0) : Math.max(...vals);
        // phụ: tổng kill của cả đội để xếp hạng khi bằng nhau
        const kills = players.reduce((s, p) => s + (p.byId.get(id)?.kills ?? 0), 0);
        return { id, vals, score, kills, best: Math.max(...vals) };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || b.kills - a.kills);
    return { list: scored, cellMax: Math.max(1, ...scored.map((r) => r.best)) };
  }, [players, metric, cat, m.sum]);

  const shown = expanded ? list : list.slice(0, PAGE);
  const showCrown = players.length > 1;

  return (
    <div className="border-t border-white/[0.06]">
      <div className="flex flex-col gap-2.5 px-4 pt-4 sm:px-5">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-semibold">So sánh theo từng súng</h3>
        </div>
        <Segmented
          size="sm"
          wrap
          value={metric}
          onChange={setMetric}
          options={(Object.keys(W_METRICS) as WMetric[]).map((k) => ({ value: k, label: W_METRICS[k].label }))}
        />
        {cats.length > 1 && (
          <Segmented
            size="sm"
            wrap
            value={cat}
            onChange={(v) => (setCat(v), setExpanded(false))}
            options={[{ value: "all" as const, label: "Tất cả" }, ...cats.map((c) => ({ value: c.key, label: c.label }))]}
          />
        )}
      </div>

      {list.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-fg-subtle">Chưa có dữ liệu cho nhóm súng này.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: `${6.5 + players.length * 5}rem` }}>
            <thead>
              <tr className="text-left text-xs text-fg-subtle">
                <th className="sticky left-0 z-10 bg-ink-850 py-2.5 pr-2 pl-4 font-medium sm:pl-5">Súng</th>
                {players.map((p) => (
                  <th key={p.id} className="px-2 py-2.5 text-right font-medium sm:px-3">
                    <span className="inline-flex max-w-16 items-center gap-1 sm:max-w-28 sm:gap-1.5">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: p.color }} />
                      <span className="truncate">{p.name}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const info = weaponInfo(r.id);
                const winners = r.vals.filter((v) => v === r.best).length;
                return (
                  <tr key={r.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="sticky left-0 z-10 bg-ink-850 py-2 pr-3 pl-4 sm:pl-5">
                      <div className="flex items-center gap-2.5">
                        <span className="hidden h-7 w-16 shrink-0 place-items-center sm:grid">
                          <WeaponIcon id={r.id} className="max-h-6" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{info.name}</span>
                          <span className="block text-[10px]" style={{ color: CATEGORY_OF[info.category].color }}>
                            {CATEGORY_OF[info.category].label}
                          </span>
                        </span>
                      </div>
                    </td>
                    {players.map((p, i) => {
                      const v = r.vals[i];
                      const isBest = showCrown && v > 0 && v === r.best && winners === 1;
                      return (
                        <td key={p.id} className="px-2 py-2 text-right align-middle sm:px-3">
                          {v > 0 ? (
                            <>
                              <span className={cn("num inline-flex items-center gap-1 font-semibold", isBest && "text-accent")}>
                                {isBest && <Crown className="size-3" />}
                                {m.fmt(v)}
                              </span>
                              <div className="mt-1 ml-auto h-1 w-14 overflow-hidden sm:w-24 rounded-full bg-white/[0.05]">
                                <div
                                  className="ml-auto h-full rounded-full"
                                  style={{ width: `${Math.max(3, (v / cellMax) * 100)}%`, background: p.color }}
                                />
                              </div>
                            </>
                          ) : (
                            <span className="text-fg-subtle">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {list.length > PAGE && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex w-full items-center justify-center gap-1 border-t border-white/[0.06] py-2.5 text-xs font-medium text-fg-muted hover:text-fg"
        >
          {expanded ? "Thu gọn" : `Xem tất cả ${list.length} súng`}
          <ChevronDown className={cn("size-4 transition", expanded && "rotate-180")} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------ ảnh súng ------------------------------ */

export function WeaponIcon({ id, className }: { id: string; className?: string }) {
  const { icon, name } = weaponInfo(id);
  const [broken, setBroken] = useState(false);
  if (!icon || broken) return <Crosshair className="size-5 text-fg-subtle" aria-label={name} />;
  return (
    <img
      src={icon}
      alt={name}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className={cn("w-auto max-w-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]", className)}
    />
  );
}
