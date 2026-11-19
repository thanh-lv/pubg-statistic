import { Bot, Car, Crosshair, Swords } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { TermKey } from "@/lib/glossary";
import {
  FIGHT_GAP,
  ISOLATED_M,
  summarizeCombat,
  summarizeLoot,
  summarizeRotation,
  summarizeTeamplay,
  TIGHT_ENTRY,
  TRADE_WINDOW,
  type Ratio,
} from "@/lib/telemetry/insights";
import { toneFor, type Tone } from "@/lib/telemetry/tone";
import type { Fight, RangeBucket, Setback, TelemetryAnalysis } from "@/lib/telemetry/types";
import { cn } from "@/lib/utils";
import { Segmented } from "../ui/Segmented";
import { InfoTip } from "../ui/Tip";

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "—");
const rate = (r: Ratio) => (r.of ? r.n / r.of : null);
const fmt = (n: number) => Math.round(n).toLocaleString("vi-VN");
/** Số giây → "8s" hoặc "4:23" */
const dur = (sec: number | null) => (sec == null ? "—" : sec < 60 ? `${Math.round(sec)}s` : clock(sec));

/* ------------------------------ Đánh giá ------------------------------ */

export const TONE: Record<Tone, string> = { good: "text-win", ok: "text-accent", bad: "text-loss", none: "text-fg" };

export function Stat({ label, term, value, sub, tone = "none" }: { label: string; term?: TermKey; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <div className="flex items-center gap-1 text-xs text-fg-muted">
        {label}
        {term && <InfoTip term={term} />}
      </div>
      <div className={cn("num mt-1 text-2xl font-semibold", TONE[tone])}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-fg-subtle">{sub}</div>}
    </div>
  );
}

export function Chip({ tone = "none", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-px text-[11px] font-medium",
        tone === "good" && "bg-win/10 text-win",
        tone === "bad" && "bg-loss/10 text-loss",
        tone === "ok" && "bg-accent-soft text-accent",
        tone === "none" && "bg-white/[0.06] text-fg-muted",
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------ Khung chính ------------------------------ */

type Tab = "teamplay" | "combat" | "rotation" | "loot";

export function TeamInsights({
  analysis,
  colors,
  labels,
  onSeek,
}: {
  analysis: TelemetryAnalysis;
  colors: Record<string, string>;
  /** Nhãn đội theo teamId (đội bot → "B1"…) */
  labels: Record<number, string>;
  /** Tua bản đồ tới thời điểm t, tô nổi bật đội teamId (nếu có) */
  onSeek: (t: number, teamId: number | null) => void;
}) {
  const [tab, setTab] = useState<Tab>("teamplay");
  return (
    <div className="space-y-4 rounded-xl border border-white/[0.06] p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="font-display text-base font-semibold">Phân tích đội</h3>
        <span className="text-xs text-fg-subtle">Màu xanh / vàng / đỏ là ngưỡng tham khảo, nên xem trên nhiều trận.</span>
        <Segmented<Tab> size="sm" className="ml-auto" value={tab} onChange={setTab} options={[
            { value: "teamplay", label: "Phối hợp" },
            { value: "combat", label: "Giao tranh" },
            { value: "rotation", label: "Bo & di chuyển" },
            { value: "loot", label: "Loot & vật phẩm" },
          ]}
        />
      </div>
      {tab === "teamplay" && <TeamplayView analysis={analysis} colors={colors} labels={labels} onSeek={onSeek} />}
      {tab === "combat" && <CombatView analysis={analysis} colors={colors} labels={labels} onSeek={onSeek} />}
      {tab === "rotation" && <RotationView analysis={analysis} colors={colors} onSeek={onSeek} />}
      {tab === "loot" && <LootView analysis={analysis} colors={colors} />}
    </div>
  );
}

/* ------------------------------ Phase 1 ------------------------------ */

function TeamplayView({
  analysis,
  colors,
  labels,
  onSeek,
}: {
  analysis: TelemetryAnalysis;
  colors: Record<string, string>;
  labels: Record<number, string>;
  onSeek: (t: number, teamId: number | null) => void;
}) {
  const tp = analysis.insights.teamplay;
  const s = useMemo(() => summarizeTeamplay(tp), [tp]);

  if (analysis.insights.teamSize < 2) {
    return <p className="text-sm text-fg-muted">Chơi một mình nên không có chỉ số phối hợp đội.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Trả đòn"
          term="trade"
          value={pct(s.trade.n, s.trade.of)}
          tone={s.trade.of ? toneFor("trade", s.trade.n / s.trade.of) : "none"}
          sub={`${s.trade.n}/${s.trade.of} lần bị địch hạ khi còn đồng đội đứng`}
        />
        <Stat
          label="Được cứu"
          term="reviveRate"
          value={pct(s.revive.n, s.revive.of)}
          tone={s.revive.of ? toneFor("revive", s.revive.n / s.revive.of) : "none"}
          sub={`${s.revive.n}/${s.revive.of} lần bị knock`}
        />
        <Stat
          label="Đồng đội gần nhất lúc bị hạ"
          term="mateDistance"
          value={s.mateDistance != null ? `${Math.round(s.mateDistance)} m` : "—"}
          tone={toneFor("mateDistance", s.mateDistance)}
          sub="Trung vị các lần bị địch hạ"
        />
        <Stat
          label="Độ tản đội"
          term="teamSpread"
          value={s.spreadAvg != null ? `${s.spreadAvg} m` : "—"}
          tone={toneFor("spread", s.spreadAvg)}
          sub={s.isolatedPct != null ? `${Math.round(s.isolatedPct * 100)}% thời gian có người cách đồng đội > ${ISOLATED_M} m` : undefined}
        />
      </div>

      {(s.thirdParty > 0 || s.alone > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {s.thirdParty > 0 && (
            <Chip tone="ok">
              <Swords className="size-3" /> Bị bên thứ ba đánh: {s.thirdParty} lần
              <InfoTip term="thirdParty" />
            </Chip>
          )}
          {s.alone > 0 && <Chip tone="none">Bị hạ khi không còn đồng đội nào đứng: {s.alone} lần</Chip>}
        </div>
      )}

      <div>
        <h4 className="mb-2 text-sm font-semibold">
          Các lần bị hạ <span className="font-normal text-fg-subtle">· bấm để tua bản đồ & tô đội địch</span>
        </h4>
        {tp.setbacks.length === 0 ? (
          <p className="py-4 text-center text-sm text-fg-subtle">Không ai trong đội bị hạ 🎉</p>
        ) : (
          <ol className="max-h-[26rem] space-y-1 overflow-y-auto pr-1">
            {tp.setbacks.map((sb, i) => (
              <SetbackRow key={i} sb={sb} color={colors[sb.memberId]} labels={labels} onClick={() => onSeek(sb.t, sb.attackerTeamId)} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function SetbackRow({ sb, color, labels, onClick }: { sb: Setback; color?: string; labels: Record<number, string>; onClick: () => void }) {
  const byEnemy = sb.attackerTeamId != null;
  return (
    <li>
      <button type="button" onClick={onClick} className="w-full rounded-lg px-2.5 py-2 text-left transition hover:bg-white/[0.04]">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="num w-10 shrink-0 text-xs text-fg-subtle">{clock(sb.t)}</span>
          <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />
          <b className="font-semibold">{sb.memberName}</b>
          <span className="text-fg-muted">{sb.kind === "knock" ? "bị knock" : "bị giết"} bởi</span>
          <span className="inline-flex items-center gap-1 font-medium">
            {sb.attackerIsBot && <Bot className="size-3.5 text-fg-muted" />}
            {sb.attackerName}
          </span>
          {byEnemy && <Chip>Đội {labels[sb.attackerTeamId!] ?? sb.attackerTeamId}</Chip>}
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5 pl-12">
          {byEnemy &&
            (!sb.supported ? (
              <Chip>Không còn đồng đội đứng</Chip>
            ) : sb.tradedAt != null ? (
              <Chip tone="good">Đã trả đòn sau {Math.round(sb.tradedAt - sb.t)}s</Chip>
            ) : (
              <Chip tone="bad">Không trả đòn trong {TRADE_WINDOW}s</Chip>
            ))}
          {sb.nearestMate != null && (
            <Chip tone={toneFor("mateDistance", sb.nearestMate)}>Đồng đội gần nhất {sb.nearestMate} m</Chip>
          )}
          {sb.outcome === "revived" && <Chip tone="good">Được cứu{sb.revivedBy ? ` bởi ${sb.revivedBy}` : ""}</Chip>}
          {sb.outcome === "lost" && <Chip tone="bad">Không được cứu</Chip>}
          {sb.thirdParty && <Chip tone="ok">Bên thứ ba</Chip>}
          {sb.inVehicle && (
            <Chip>
              <Car className="size-3" /> Trên xe
            </Chip>
          )}
        </div>
      </button>
    </li>
  );
}

/* ------------------------------ Phase 2 ------------------------------ */

function CombatView({
  analysis,
  colors,
  labels,
  onSeek,
}: {
  analysis: TelemetryAnalysis;
  colors: Record<string, string>;
  labels: Record<number, string>;
  onSeek: (t: number, teamId: number | null) => void;
}) {
  const c = analysis.insights.combat;
  const s = useMemo(() => summarizeCombat(c), [c]);
  const [showMinor, setShowMinor] = useState(false);
  // "Chạm súng": không ai bị hạ và tổng sát thương < 100
  const isMinor = (f: Fight) => f.result === "even" && f.dealt + f.taken < 100;
  const minor = c.fights.filter(isMinor).length;
  const fights = showMinor ? c.fights : c.fights.filter((f) => !isMinor(f));
  const ratio = s.takenHuman ? s.dealtHuman / s.takenHuman : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Thắng giao tranh (với người)"
          term="fightWin"
          value={pct(s.winHuman.n, s.winHuman.of)}
          tone={toneFor("fightWin", rate(s.winHuman))}
          sub={`${s.winHuman.n}/${s.winHuman.of} trận đánh${s.winBot.of ? ` · với bot ${s.winBot.n}/${s.winBot.of}` : ""}`}
        />
        <Stat
          label="Bắn trước (với người)"
          term="firstHit"
          value={pct(s.firstHit.n, s.firstHit.of)}
          tone={toneFor("firstHit", rate(s.firstHit))}
          sub={`Thắng ${s.winWhenFirst.n}/${s.winWhenFirst.of} khi bắn trước · ${s.winWhenSecond.n}/${s.winWhenSecond.of} khi bị bắn trước`}
        />
        <Stat
          label="Sát thương gây / nhận"
          term="dmgRatio"
          value={ratio != null ? `${ratio.toFixed(2)}×` : s.dealtHuman ? "∞" : "—"}
          tone={toneFor("dmgRatio", ratio ?? (s.dealtHuman ? Infinity : null))}
          sub={`${fmt(s.dealtHuman)} gây · ${fmt(s.takenHuman)} nhận (đối thủ là người)`}
        />
        <Stat
          label="Knock → kill"
          term="knockConvert"
          value={pct(s.conversion.n, s.conversion.of)}
          tone={toneFor("conversion", rate(s.conversion))}
          sub={`${s.conversion.n}/${s.conversion.of} lần knock địch không để họ được cứu`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RangeTable ranges={c.ranges} />
        <MemberDamage analysis={analysis} colors={colors} />
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold">
            Các trận đánh <span className="font-normal text-fg-subtle">· bấm để tua bản đồ & tô đội địch</span>
          </h4>
          {minor > 0 && (
            <button type="button" onClick={() => setShowMinor((v) => !v)} className="ml-auto text-xs font-medium text-accent hover:underline">
              {showMinor ? "Ẩn" : "Hiện"} {minor} lần chạm súng nhẹ
            </button>
          )}
        </div>
        {fights.length === 0 ? (
          <p className="py-4 text-center text-sm text-fg-subtle">Không có giao tranh nào với đội khác.</p>
        ) : (
          <ol className="max-h-[26rem] space-y-1 overflow-y-auto pr-1">
            {fights.map((f, i) => (
              <FightRow key={i} f={f} labels={labels} onClick={() => onSeek(f.start, f.enemyTeamId)} />
            ))}
          </ol>
        )}
        <p className="mt-2 text-[11px] text-fg-subtle">
          1 trận đánh = các lần trao đổi sát thương với cùng 1 đội cách nhau không quá {FIGHT_GAP} giây.
        </p>
      </div>
    </div>
  );
}

const RESULT: Record<Fight["result"], { label: string; tone: Tone }> = {
  win: { label: "Thắng", tone: "good" },
  loss: { label: "Thua", tone: "bad" },
  even: { label: "Hoà", tone: "none" },
};

function FightRow({ f, labels, onClick }: { f: Fight; labels: Record<number, string>; onClick: () => void }) {
  const r = RESULT[f.result];
  return (
    <li>
      <button type="button" onClick={onClick} className="w-full rounded-lg px-2.5 py-2 text-left transition hover:bg-white/[0.04]">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="num w-20 shrink-0 text-xs text-fg-subtle">
            {clock(f.start)}
            {f.end - f.start >= 1 && `–${clock(f.end)}`}
          </span>
          <Chip tone={r.tone}>{r.label}</Chip>
          <span className="text-fg-muted">với</span>
          <b className="font-semibold">Đội {labels[f.enemyTeamId] ?? f.enemyTeamId}</b>
          {f.enemyIsBot && (
            <Chip>
              <Bot className="size-3" /> bot
            </Chip>
          )}
          <span className="num ml-auto text-xs text-fg-muted">
            Hạ <b className="text-win">{f.theirLosses}</b> · Mất <b className="text-loss">{f.ourLosses}</b>
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5 pl-[5.5rem]">
          <Chip tone={f.firstHit === "us" ? "good" : "ok"}>
            <Crosshair className="size-3" /> {f.firstHit === "us" ? "Mình bắn trước" : "Bị bắn trước"}
          </Chip>
          <Chip>
            Sát thương {fmt(f.dealt)} gây · {fmt(f.taken)} nhận
          </Chip>
        </div>
      </button>
    </li>
  );
}

function RangeTable({ ranges }: { ranges: RangeBucket[] }) {
  const max = Math.max(1, ...ranges.flatMap((r) => [r.dealt, r.taken]));
  return (
    <div className="rounded-xl border border-white/[0.06] p-3.5">
      <div className="mb-2.5 flex items-center gap-1 text-sm font-semibold">
        Theo tầm bắn <InfoTip term="rangeSplit" />
        <span className="ml-auto flex items-center gap-3 text-[11px] font-normal text-fg-muted">
          <span className="flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-win" /> Gây
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-loss" /> Nhận
          </span>
        </span>
      </div>
      <ul className="space-y-2.5">
        {ranges.map((r) => (
          <li key={r.label} className="grid grid-cols-[4.5rem_1fr] items-center gap-x-3 text-xs">
            <span className="text-fg-muted">{r.label}</span>
            <div className="space-y-1">
              <Bar value={r.dealt} max={max} className="bg-win" label={`${fmt(r.dealt)} · knock ${r.knocks}`} />
              <Bar value={r.taken} max={max} className="bg-loss" label={`${fmt(r.taken)} · bị knock ${r.knocked}`} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bar({ value, max, className, label }: { value: number; max: number; className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
        <div className={cn("h-full rounded-full", className)} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="num w-28 shrink-0 text-[11px] text-fg-muted">{label}</span>
    </div>
  );
}

function MemberDamage({ analysis, colors }: { analysis: TelemetryAnalysis; colors: Record<string, string> }) {
  const taken = analysis.insights.combat.taken;
  return (
    <div className="rounded-xl border border-white/[0.06] p-3.5">
      <div className="mb-2.5 text-sm font-semibold">Sát thương theo thành viên</div>
      <table className="w-full text-xs">
        <thead className="text-fg-subtle">
          <tr>
            <th className="pb-1.5 text-left font-medium">Thành viên</th>
            <th className="pb-1.5 text-right font-medium">Gây</th>
            <th className="pb-1.5 text-right font-medium">Nhận</th>
            <th className="pb-1.5 text-right font-medium">Gây / nhận</th>
          </tr>
        </thead>
        <tbody className="num">
          {analysis.members.map((m) => {
            const dealt = m.damage.human + m.damage.bot;
            const t = taken[m.id] ?? { human: 0, bot: 0 };
            const got = t.human + t.bot;
            const r = got ? dealt / got : null;
            return (
              <tr key={m.id} className="border-t border-white/[0.05]">
                <td className="py-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: colors[m.id] }} />
                    <span className="truncate">{m.name}</span>
                  </span>
                </td>
                <td className="py-1.5 text-right">{fmt(dealt)}</td>
                <td className="py-1.5 text-right">{fmt(got)}</td>
                <td className={cn("py-1.5 text-right font-semibold", TONE[toneFor("dmgRatio", r ?? (dealt ? Infinity : null))])}>
                  {r != null ? `${r.toFixed(2)}×` : dealt ? "∞" : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-fg-subtle">Tính cả đối thủ là bot.</p>
    </div>
  );
}

/* ------------------------------ Phase 3 ------------------------------ */

function marginTone(m: number): Tone {
  return m < 0 ? "bad" : m < TIGHT_ENTRY ? "ok" : "good";
}

function RotationView({
  analysis,
  colors,
  onSeek,
}: {
  analysis: TelemetryAnalysis;
  colors: Record<string, string>;
  onSeek: (t: number, teamId: number | null) => void;
}) {
  const { rotation, teamplay } = analysis.insights;
  const s = useMemo(() => summarizeRotation(rotation, teamplay.setbacks), [rotation, teamplay]);
  const members = analysis.members;
  const phases = rotation.phases.filter((p) => members.some((m) => p.margins[m.id] != null));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Vào bo muộn"
          term="zoneEntry"
          value={pct(s.late.n, s.late.of)}
          tone={toneFor("late", rate(s.late))}
          sub={`${s.late.n}/${s.late.of} lượt · sát giờ (< ${TIGHT_ENTRY}s) ${s.tight.n} lượt`}
        />
        <Stat
          label="Sát thương bo / người"
          term="blueDamage"
          value={fmt(s.blueDamagePerMember)}
          tone={toneFor("blueDamage", s.blueDamagePerMember)}
          sub="Máu mất vì đứng ngoài bo"
        />
        <Stat
          label="Thời gian ngoài bo / người"
          term="outsideTime"
          value={clock(s.outsidePerMember)}
          tone={toneFor("outside", s.outsidePerMember)}
          sub="phút:giây"
        />
        <Stat
          label="Đi xe / người"
          term="vehicleTime"
          value={clock(s.vehiclePerMember)}
          sub={s.vehicleSetbacks ? `Bị hạ trên xe ${s.vehicleSetbacks} lần` : "Không ai bị hạ trên xe"}
        />
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold">
          Từng vòng bo <span className="font-normal text-fg-subtle">· số giây vào vùng trắng trước khi bo khép · bấm để tua tới lúc bo khép</span>
        </h4>
        {phases.length === 0 ? (
          <p className="py-4 text-center text-sm text-fg-subtle">Đội không sống tới lúc vòng bo nào khép.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-xs">
              <thead className="text-fg-subtle">
                <tr>
                  <th className="pb-1.5 text-left font-medium">Bo</th>
                  <th className="pb-1.5 text-left font-medium">Xuất hiện → khép</th>
                  {members.map((m) => (
                    <th key={m.id} className="pb-1.5 text-right font-medium">
                      <span className="inline-flex items-center gap-1">
                        <span className="size-2 rounded-full" style={{ background: colors[m.id] }} />
                        <span className="max-w-24 truncate">{m.name}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="num">
                {phases.map((p) => (
                  <tr
                    key={p.index}
                    onClick={() => onSeek(p.close ?? p.start, null)}
                    className="cursor-pointer border-t border-white/[0.05] hover:bg-white/[0.03]"
                  >
                    <td className="py-1.5 font-semibold">{p.index}</td>
                    <td className="py-1.5 text-fg-muted">
                      {clock(p.start)} → {p.close != null ? clock(p.close) : "—"}
                    </td>
                    {members.map((m) => {
                      const v = p.margins[m.id];
                      return (
                        <td key={m.id} className="py-1.5 text-right">
                          {v == null ? <span className="text-fg-subtle">—</span> : <Chip tone={marginTone(v)}>{v > 0 ? `+${v}s` : `${v}s`}</Chip>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[11px] text-fg-subtle">
          Xanh: vào sớm ≥ {TIGHT_ENTRY}s · vàng: sát giờ · đỏ: vào sau khi bo khép (chạy bo). — : đã chết hoặc chưa có dữ liệu.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.06] p-3.5">
        <div className="mb-2.5 text-sm font-semibold">Theo thành viên</div>
        <table className="w-full min-w-[30rem] text-xs">
          <thead className="text-fg-subtle">
            <tr>
              <th className="pb-1.5 text-left font-medium">Thành viên</th>
              <th className="pb-1.5 text-right font-medium">Sát thương bo</th>
              <th className="pb-1.5 text-right font-medium">Ngoài bo</th>
              <th className="pb-1.5 text-right font-medium">Đi xe</th>
              <th className="pb-1.5 text-right font-medium">Kết cục</th>
            </tr>
          </thead>
          <tbody className="num">
            {members.map((m) => {
              const r = rotation.members[m.id];
              if (!r) return null;
              return (
                <tr key={m.id} className="border-t border-white/[0.05]">
                  <td className="py-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: colors[m.id] }} />
                      <span className="truncate">{m.name}</span>
                    </span>
                  </td>
                  <td className={cn("py-1.5 text-right", TONE[toneFor("blueDamage", r.blueDamage)])}>{fmt(r.blueDamage)}</td>
                  <td className="py-1.5 text-right">{clock(r.outsideSec)}</td>
                  <td className="py-1.5 text-right">{clock(r.vehicleSec)}</td>
                  <td className="py-1.5 text-right">
                    {r.deathPhase == null ? (
                      <span className="text-win">Sống sót</span>
                    ) : (
                      <span className="text-fg-muted">{r.deathPhase === 0 ? "Chết trước bo 1" : `Chết ở bo ${r.deathPhase}`}</span>
                    )}
                    {r.recalls > 0 && <span className="text-fg-subtle"> · hồi sinh {r.recalls} lần</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------ Phase 4 ------------------------------ */

const THROWS: { key: "grenade" | "smoke" | "molotov" | "flash"; label: string }[] = [
  { key: "grenade", label: "Lựu đạn" },
  { key: "smoke", label: "Smoke" },
  { key: "molotov", label: "Molotov" },
  { key: "flash", label: "Flash" },
];

function LootView({ analysis, colors }: { analysis: TelemetryAnalysis; colors: Record<string, string> }) {
  const loot = analysis.insights.loot;
  const s = useMemo(() => summarizeLoot(loot), [loot]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Có súng chính sau khi đáp"
          term="lootSpeed"
          value={dur(s.firstWeapon)}
          tone={toneFor("firstWeapon", s.firstWeapon)}
          sub="Trung vị các thành viên"
        />
        <Stat
          label="Giáp cấp 2+"
          term="lootSpeed"
          value={dur(s.armor2)}
          tone={toneFor("armor", s.armor2)}
          sub={`${s.armor2Got.n}/${s.armor2Got.of} người có · tính từ lúc đáp`}
        />
        <Stat
          label="Mũ cấp 2+"
          term="lootSpeed"
          value={dur(s.helmet2)}
          tone={toneFor("armor", s.helmet2)}
          sub={`${s.helmet2Got.n}/${s.helmet2Got.of} người có · tính từ lúc đáp`}
        />
        <Stat
          label="Cứu có smoke"
          term="smokeRevive"
          value={pct(s.smokeRevive.n, s.smokeRevive.of)}
          tone={s.smokeRevive.of ? toneFor("smokeRevive", rate(s.smokeRevive)) : "none"}
          sub={`${s.smokeRevive.n}/${s.smokeRevive.of} lần cứu đồng đội`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white/[0.03] px-4 py-3 text-sm">
        <span className="flex items-center gap-1 text-fg-muted">
          Vật phẩm ném <InfoTip term="utility" />
        </span>
        {THROWS.map((t) => (
          <Chip key={t.key}>
            {t.label} <b className="num text-fg">{s.thrown[t.key]}</b>
          </Chip>
        ))}
        <span className="num text-xs text-fg-muted">
          · {s.throwsPerMember.toFixed(1)} / người · gây <b className="text-fg">{fmt(s.throwDamage)}</b> sát thương
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.06] p-3.5">
        <div className="mb-2.5 text-sm font-semibold">Theo thành viên</div>
        <table className="w-full min-w-[36rem] text-xs">
          <thead className="text-fg-subtle">
            <tr>
              <th className="pb-1.5 text-left font-medium">Thành viên</th>
              <th className="pb-1.5 text-right font-medium">Súng</th>
              <th className="pb-1.5 text-right font-medium">Giáp 2+</th>
              <th className="pb-1.5 text-right font-medium">Mũ 2+</th>
              {THROWS.map((t) => (
                <th key={t.key} className="pb-1.5 text-right font-medium">
                  {t.label}
                </th>
              ))}
              <th className="pb-1.5 text-right font-medium">ST ném</th>
            </tr>
          </thead>
          <tbody className="num">
            {analysis.members.map((m) => {
              const l = loot.members[m.id];
              if (!l) return null;
              return (
                <tr key={m.id} className="border-t border-white/[0.05]">
                  <td className="py-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: colors[m.id] }} />
                      <span className="truncate">{m.name}</span>
                    </span>
                  </td>
                  <td className={cn("py-1.5 text-right", TONE[toneFor("firstWeapon", l.firstWeapon)])}>{dur(l.firstWeapon)}</td>
                  <td className={cn("py-1.5 text-right", TONE[toneFor("armor", l.armor2)])}>{dur(l.armor2)}</td>
                  <td className={cn("py-1.5 text-right", TONE[toneFor("armor", l.helmet2)])}>{dur(l.helmet2)}</td>
                  {THROWS.map((t) => (
                    <td key={t.key} className={cn("py-1.5 text-right", !l.throwables[t.key] && "text-fg-subtle")}>
                      {l.throwables[t.key]}
                    </td>
                  ))}
                  <td className="py-1.5 text-right">{fmt(l.throwDamage)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-fg-subtle">Thời gian tính từ lần tiếp đất đầu tiên; — = không có trong trận.</p>
      </div>
    </div>
  );
}
