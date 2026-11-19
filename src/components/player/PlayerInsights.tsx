import type { PlayerSummary } from "@shared/types";
import { Bomb, Crosshair, ScanEye } from "lucide-react";
import { useMemo, useState } from "react";
import { usePlayerInsights } from "@/hooks/usePlayerInsights";
import { attachmentLabel, scopeLabel, scopeOrder, SLOT_ORDER, slotOf, THROW_KINDS } from "@/lib/attachments";
import { fmt1, fmtInt, fmtPct } from "@/lib/format";
import { aggregatePlayer, playerRecordKey, type PlayerAggregate } from "@/lib/telemetry/playerHistory";
import { toneOf } from "@/lib/telemetry/tone";
import { weaponInfo } from "@/lib/weapons";
import { cn } from "@/lib/utils";
import { Chip, Stat } from "../match/TeamInsights";
import { WeaponIcon } from "../squad/WeaponCompare";
import { RunBar } from "../squad/TeamInsightsHistory";
import { Segmented } from "../ui/Segmented";
import { InfoTip } from "../ui/Tip";

type Limit = "10" | "20" | "50";
const pct = (n: number, of: number) => (of ? fmtPct(n / of) : "—");
/** Phụ kiện gắn trong ≥ mức này số viên bắn của 1 súng thì coi là "hay dùng" */
const LOADOUT_SHARE = 0.5;

/** Phân tích cá nhân qua telemetry các trận gần đây: ống ngắm, phụ kiện, độ chính xác, vật phẩm ném. */
export function PlayerInsights({ player }: { player: PlayerSummary }) {
  const { records, progress, run, cancel, clear } = usePlayerInsights(player.id);
  const [limit, setLimit] = useState<Limit>("20");
  const n = Number(limit);

  const window = player.matchIds.slice(0, n);
  const pending = window.filter((id) => !records[playerRecordKey(id, player.id)]);
  // Đã phân tích (kể cả trận cũ hơn 14 ngày còn lưu trong trình duyệt), bỏ trận không phải battle royale
  const shown = useMemo(
    () =>
      Object.values(records)
        .filter((r) => r.playerId === player.id && r.stats)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, n),
    [records, player.id, n],
  );
  const agg = useMemo(() => aggregatePlayer(shown), [shown]);
  const hasAny = Object.values(records).some((r) => r.playerId === player.id);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
        <div>
          <h2 className="flex items-center gap-1.5 font-display text-lg font-semibold">
            <ScanEye className="size-5 text-accent" /> Phân tích cá nhân
          </h2>
          <p className="text-xs text-fg-subtle">
            Từ telemetry các trận battle royale gần đây · kết quả lưu trên trình duyệt này nên vẫn xem được sau 14 ngày
          </p>
        </div>
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

      <div className="space-y-5 p-4 sm:p-5">
        <RunBar
          loadingHistory={false}
          pending={pending.length}
          progress={progress}
          onRun={() => run(window)}
          onCancel={cancel}
          onClear={hasAny ? clear : undefined}
        />

        {agg.n === 0 ? (
          !progress?.running && (
            <p className="py-6 text-center text-sm text-fg-subtle">
              {player.matchIds.length ? "Chưa phân tích trận nào. Bấm “Phân tích” để bắt đầu." : "Không có trận nào trong 14 ngày gần đây."}
            </p>
          )
        ) : (
          <>
            <Overview agg={agg} />
            <Scopes agg={agg} />
            <Weapons agg={agg} />
            <Throwables agg={agg} />
            <p className="text-[11px] text-fg-subtle">
              Tính trên {agg.n} trận battle royale. Độ chính xác = số viên trúng đối thủ ÷ số viên đã bắn (shotgun nhiều mảnh trúng tính 1;
              bắn vào xe, bắn đồng đội không tính là trúng).
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function Overview({ agg }: { agg: PlayerAggregate }) {
  const kills = agg.kills.human + agg.kills.bot;
  const deaths = agg.deaths.human + agg.deaths.bot + agg.deaths.env;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Stat
        label="Độ chính xác"
        value={pct(agg.hits, agg.shots)}
        tone={agg.shots ? toneOf(agg.hits / agg.shots, 0.2, 0.12) : "none"}
        sub={`${fmtInt(agg.hits)} trúng / ${fmtInt(agg.shots)} viên`}
      />
      <Stat
        label="Trúng đầu"
        value={pct(agg.headHits, agg.hits)}
        tone={agg.hits ? toneOf(agg.headHits / agg.hits, 0.15, 0.08) : "none"}
        sub="Trên số viên trúng"
      />
      <Stat
        label="Kill người · bot"
        value={
          <>
            <span className="text-loss">{agg.kills.human}</span> · <span className="text-fg-muted">{agg.kills.bot}</span>
          </>
        }
        sub={kills ? `${pct(agg.kills.human, kills)} là người thật · ${fmt1(kills / agg.n)} kill/trận` : "Chưa có kill"}
      />
      <Stat
        label="Bị hạ bởi"
        value={
          <>
            <span className="text-loss">{agg.deaths.human}</span> · <span className="text-fg-muted">{agg.deaths.bot}</span>
            {agg.deaths.env > 0 && <span className="text-accent"> · {agg.deaths.env}</span>}
          </>
        }
        sub={deaths ? `người · bot${agg.deaths.env ? " · bo/ngã/xe" : ""} — ${deaths} lần chết` : "Chưa chết lần nào"}
      />
    </div>
  );
}

function Scopes({ agg }: { agg: PlayerAggregate }) {
  const rows = Object.entries(agg.scopes)
    .filter(([, s]) => s.shots || s.kills || s.knocks)
    .sort(([a], [b]) => scopeOrder(a) - scopeOrder(b));
  const kills = rows.reduce((n, [, s]) => n + s.kills, 0);
  if (!rows.length) return null;
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <Crosshair className="size-4 text-accent" /> Ống ngắm
        <span className="font-normal text-fg-subtle">· theo phụ kiện đang gắn lúc bắn / knock / kill</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="text-xs text-fg-subtle">
            <tr className="border-b border-white/[0.06]">
              <th className="py-1.5 text-left font-medium">Ống ngắm</th>
              <th className="py-1.5 text-right font-medium">Viên bắn</th>
              <th className="py-1.5 text-right font-medium">Chính xác</th>
              <th className="py-1.5 text-right font-medium">Knock</th>
              <th className="py-1.5 text-right font-medium">Kill</th>
              <th className="w-40 py-1.5 pl-4 text-left font-medium">Tỉ lệ kill bằng súng</th>
            </tr>
          </thead>
          <tbody className="num">
            {rows.map(([id, s]) => (
              <tr key={id} className="border-b border-white/[0.04] last:border-0">
                <td className="py-1.5 font-medium">{scopeLabel(id)}</td>
                <td className="py-1.5 text-right text-fg-muted">
                  {fmtInt(s.shots)} <span className="text-xs text-fg-subtle">({pct(s.shots, agg.shots)})</span>
                </td>
                <td className={cn("py-1.5 text-right", s.shots >= 30 ? "" : "text-fg-subtle")}>{pct(s.hits, s.shots)}</td>
                <td className="py-1.5 text-right">{s.knocks}</td>
                <td className="py-1.5 text-right font-semibold">{s.kills}</td>
                <td className="py-1.5 pl-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                      <div className="h-full rounded-full bg-accent" style={{ width: kills ? `${(s.kills / kills) * 100}%` : 0 }} />
                    </div>
                    <span className="w-9 text-right text-xs text-fg-muted">{pct(s.kills, kills)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-[11px] text-fg-subtle">Độ chính xác mờ = dưới 30 viên, chưa đủ để kết luận.</p>
    </div>
  );
}

function Weapons({ agg }: { agg: PlayerAggregate }) {
  const rows = Object.entries(agg.weapons)
    .filter(([, w]) => w.shots > 0)
    .sort(([, a], [, b]) => b.shots - a.shots)
    .slice(0, 8);
  if (!rows.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">
        Súng & bộ phụ kiện hay dùng <span className="font-normal text-fg-subtle">· top {rows.length} súng bắn nhiều nhất</span>
      </h3>
      <ul className="space-y-1.5">
        {rows.map(([id, w]) => {
          const info = weaponInfo(id);
          const atts = Object.entries(agg.loadout[id] ?? {})
            .filter(([, n]) => n >= w.shots * LOADOUT_SHARE)
            .sort(([a], [b]) => SLOT_ORDER.indexOf(slotOf(a)) - SLOT_ORDER.indexOf(slotOf(b)));
          return (
            <li key={id} className="grid gap-x-3 gap-y-1.5 rounded-xl bg-white/[0.02] px-3 py-2 sm:grid-cols-[13rem_1fr]">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-16 shrink-0 place-items-center">
                  <WeaponIcon id={id} className="max-h-6" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{info.name}</span>
                  <span className="num block text-[11px] text-fg-subtle">
                    {fmtInt(w.shots)} viên · chính xác <b className="text-fg-muted">{pct(w.hits, w.shots)}</b> · đầu {pct(w.headHits, w.hits)}
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {atts.length ? (
                  atts.map(([a, cnt]) => (
                    <Chip key={a} tone={slotOf(a) === "Upper" ? "ok" : "none"}>
                      {attachmentLabel(a)}
                      <span className="text-fg-subtle">{Math.round((cnt / w.shots) * 100)}%</span>
                    </Chip>
                  ))
                ) : (
                  <span className="text-xs text-fg-subtle">Không có phụ kiện gắn thường xuyên</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 text-[11px] text-fg-subtle">% = phần số viên bắn khi đang gắn phụ kiện đó; chỉ hiện phụ kiện gắn ≥ {LOADOUT_SHARE * 100}% số viên.</p>
    </div>
  );
}

function Throwables({ agg }: { agg: PlayerAggregate }) {
  const kinds = THROW_KINDS.filter((k) => (agg.throws[k.key] ?? 0) > 0);
  const total = kinds.reduce((n, k) => n + (agg.throws[k.key] ?? 0), 0);
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <Bomb className="size-4 text-accent" /> Vật phẩm ném
        <InfoTip term="utility" />
        <span className="font-normal text-fg-subtle">· {fmt1(total / agg.n)} lần / trận</span>
      </h3>
      {kinds.length === 0 ? (
        <p className="text-sm text-fg-subtle">Chưa ném vật phẩm nào trong các trận đã phân tích.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {kinds.map((k) => {
            const c = agg.throws[k.key] ?? 0;
            return (
              <div key={k.key} className="rounded-xl bg-white/[0.03] px-3 py-2">
                <div className="text-[11px] text-fg-subtle">{k.label}</div>
                <div className="num text-lg font-semibold">{fmtInt(c)}</div>
                <div className="num text-[11px] text-fg-muted">{fmt1(c / agg.n)} / trận</div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs">
        <Chip>
          Sát thương bằng lựu đạn / molotov / bom: <b className="num text-fg">{fmtInt(agg.throwDamage)}</b>
        </Chip>
        <Chip>
          Knock <b className="num text-fg">{agg.throwKnocks}</b> · kill <b className="num text-fg">{agg.throwKills}</b> bằng vật phẩm ném
        </Chip>
        <Chip tone={agg.revives ? toneOf(agg.smokeRevives / agg.revives, 0.5, 0.2) : "none"}>
          Tự thả khói trước khi cứu: <b className="num">{agg.smokeRevives}</b>/{agg.revives} lần cứu
        </Chip>
      </div>
    </div>
  );
}
