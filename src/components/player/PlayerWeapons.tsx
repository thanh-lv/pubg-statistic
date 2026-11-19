import type { PlayerSummary, WeaponStat } from "@shared/types";
import { ChevronDown, Crosshair } from "lucide-react";
import { useMemo, useState } from "react";
import { useSquadWeapons } from "@/hooks/queries";
import { PLAYER_COLORS } from "@/lib/constants";
import { fmtCompact, fmtInt, fmtMeters, fmtPct } from "@/lib/format";
import { CATEGORY_OF, WEAPON_CATEGORIES, weaponInfo, type WeaponCategory } from "@/lib/weapons";
import { cn } from "@/lib/utils";
import { SignatureCard, WeaponIcon, type PlayerWeaponsRow } from "../squad/WeaponCompare";
import { Segmented } from "../ui/Segmented";
import { Skeleton } from "../ui/Skeleton";
import { InfoTip } from "../ui/Tip";

const PAGE = 10;

type SortKey = "kills" | "knocks" | "damage" | "hsRate" | "longestKill" | "longRangeKills" | "mostKillsInGame" | "level";

const COLS: { key: SortKey; label: string; value: (w: WeaponStat) => number; fmt: (w: WeaponStat) => string; term?: "weaponLevel" | "weaponKnocks" | "weaponLongest" }[] = [
  { key: "level", label: "Lv", term: "weaponLevel", value: (w) => w.level, fmt: (w) => String(w.level) },
  { key: "kills", label: "Kill", value: (w) => w.kills, fmt: (w) => fmtInt(w.kills) },
  { key: "knocks", label: "Knock", term: "weaponKnocks", value: (w) => w.knocks, fmt: (w) => fmtInt(w.knocks) },
  { key: "damage", label: "Sát thương", value: (w) => w.damage, fmt: (w) => fmtCompact(w.damage) },
  {
    key: "hsRate",
    label: "Headshot",
    value: (w) => (w.kills ? w.headshots / w.kills : 0),
    fmt: (w) => (w.kills ? `${fmtInt(w.headshots)} · ${fmtPct(w.headshots / w.kills)}` : "—"),
  },
  { key: "longestKill", label: "Kill xa nhất", term: "weaponLongest", value: (w) => w.longestKill, fmt: (w) => (w.longestKill ? fmtMeters(w.longestKill) : "—") },
  { key: "longRangeKills", label: "Kill tầm xa", value: (w) => w.longRangeKills, fmt: (w) => fmtInt(w.longRangeKills) },
  { key: "mostKillsInGame", label: "Max kill/trận", value: (w) => w.mostKillsInGame, fmt: (w) => fmtInt(w.mostKillsInGame) },
];

/** Weapon Mastery của 1 người chơi: súng tủ + bảng chi tiết từng súng */
export function PlayerWeapons({ player }: { player: PlayerSummary }) {
  const [q] = useSquadWeapons([player.id]);
  const weapons = q?.data?.data.weapons;
  const row: PlayerWeaponsRow = {
    id: player.id,
    name: player.name,
    color: PLAYER_COLORS[0],
    d: null,
    weapons,
    byId: new Map((weapons ?? []).map((w) => [w.id, w])),
    loading: !!q?.isPending,
    error: !!q?.error && !q.data,
  };

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-1.5 font-display text-lg font-semibold">
          <Crosshair className="size-5 text-accent" /> Vũ khí
          <InfoTip term="weaponMastery" />
        </h2>
        <p className="text-xs text-fg-subtle">Theo Weapon Mastery — cộng dồn cả sự nghiệp, không đổi theo mùa/chế độ</p>
      </div>

      {row.loading ? (
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[22rem_1fr]">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : row.error ? (
        <p className="px-5 py-8 text-center text-sm text-fg-muted">
          Không tải được dữ liệu vũ khí ({q?.error?.message ?? "lỗi"}).{" "}
          <button className="text-accent hover:underline" onClick={() => q?.refetch()}>
            Thử lại
          </button>
        </p>
      ) : !weapons?.length ? (
        <p className="px-5 py-8 text-center text-sm text-fg-subtle">Chưa có dữ liệu vũ khí.</p>
      ) : (
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[22rem_1fr]">
          <div className="space-y-3 self-start">
            <SignatureCard p={row} />
            <Totals weapons={weapons} />
          </div>
          <WeaponTable weapons={weapons} />
        </div>
      )}
    </section>
  );
}

function Totals({ weapons }: { weapons: WeaponStat[] }) {
  const kills = weapons.reduce((s, w) => s + w.kills, 0);
  const hs = weapons.reduce((s, w) => s + w.headshots, 0);
  const knocks = weapons.reduce((s, w) => s + w.knocks, 0);
  const used = weapons.filter((w) => w.kills > 0).length;
  const longest = weapons.reduce((m, w) => (w.longestKill > m.longestKill ? w : m), weapons[0]);
  return (
    <dl className="grid grid-cols-2 gap-2 text-sm">
      {[
        ["Headshot / kill", kills ? fmtPct(hs / kills) : "—"],
        ["Knock / kill", kills ? (knocks / kills).toFixed(2) : "—"],
        ["Số súng có kill", fmtInt(used)],
        ["Kill xa nhất", longest?.longestKill ? `${fmtMeters(longest.longestKill)} · ${weaponInfo(longest.id).name}` : "—"],
      ].map(([l, v]) => (
        <div key={l} className="rounded-xl bg-white/[0.03] px-3 py-2">
          <dt className="text-[11px] text-fg-subtle">{l}</dt>
          <dd className="num truncate font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function WeaponTable({ weapons }: { weapons: WeaponStat[] }) {
  const [cat, setCat] = useState<WeaponCategory | "all">("all");
  const [sort, setSort] = useState<SortKey>("kills");
  const [expanded, setExpanded] = useState(false);

  const present = useMemo(() => {
    const s = new Set<WeaponCategory>();
    for (const w of weapons) if (w.kills || w.damage) s.add(weaponInfo(w.id).category);
    return WEAPON_CATEGORIES.filter((c) => s.has(c.key));
  }, [weapons]);

  const col = COLS.find((c) => c.key === sort)!;
  const list = useMemo(
    () =>
      weapons
        .filter((w) => (w.kills || w.damage || w.knocks) && (cat === "all" || weaponInfo(w.id).category === cat))
        .sort((a, b) => col.value(b) - col.value(a) || b.kills - a.kills),
    [weapons, cat, col],
  );
  const shown = expanded ? list : list.slice(0, PAGE);
  const max = Math.max(1, ...list.map(col.value));

  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.06]">
      <div className="border-b border-white/[0.06] p-3">
        <Segmented<WeaponCategory | "all">
          size="sm"
          wrap
          value={cat}
          onChange={(v) => (setCat(v), setExpanded(false))}
          options={[{ value: "all", label: "Tất cả" }, ...present.map((c) => ({ value: c.key, label: c.label }))]}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="text-xs text-fg-subtle">
            <tr className="border-b border-white/[0.06]">
              <th className="px-3 py-2 text-left font-medium">Súng</th>
              {COLS.map((c) => (
                <th key={c.key} className="px-2 py-2 text-right font-medium">
                  <span className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSort(c.key)}
                      className={cn("inline-flex items-center gap-0.5 hover:text-fg", sort === c.key && "text-accent")}
                      title={`Sắp xếp theo ${c.label}`}
                    >
                      {c.label}
                      {sort === c.key && <ChevronDown className="size-3" />}
                    </button>
                    {c.term && <InfoTip term={c.term} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="num">
            {shown.map((w) => {
              const info = weaponInfo(w.id);
              return (
                <tr key={w.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-16 shrink-0 place-items-center">
                        <WeaponIcon id={w.id} className="max-h-6" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{info.name}</span>
                        <span className="block text-[11px] font-normal" style={{ color: CATEGORY_OF[info.category].color }}>
                          {CATEGORY_OF[info.category].label}
                        </span>
                      </span>
                    </div>
                  </td>
                  {COLS.map((c) => (
                    <td key={c.key} className={cn("px-2 py-1.5 text-right", c.key === sort ? "font-semibold" : "text-fg-muted")}>
                      {c.fmt(w)}
                      {c.key === sort && (
                        <div className="mt-1 ml-auto h-1 w-14 overflow-hidden rounded-full bg-white/[0.05]">
                          <div className="ml-auto h-full rounded-full bg-accent" style={{ width: `${Math.max(3, (c.value(w) / max) * 100)}%` }} />
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
