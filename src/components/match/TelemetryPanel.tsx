import type { MatchSummary } from "@shared/types";
import { Bot, Crosshair, Loader2, Pause, Play, Skull, User, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTelemetry } from "@/hooks/useTelemetry";
import { PLAYER_COLORS } from "@/lib/constants";
import { fmtInt, fmtPct } from "@/lib/format";
import type { Count, FeedEvent, MemberAnalysis } from "@/lib/telemetry/types";
import { cn } from "@/lib/utils";
import { Avatar } from "../ui/Avatar";
import { Segmented } from "../ui/Segmented";
import { Skeleton } from "../ui/Skeleton";
import { ErrorState } from "../ui/States";
import { InfoTip } from "../ui/Tip";
import { MAP_MARK_COLORS, MatchMap } from "./MatchMap";

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
const SPEEDS = [10, 30, 60] as const;

export function TelemetryPanel({
  match,
  team,
  focusId,
}: {
  match: MatchSummary;
  team: { id: string; name: string }[];
  focusId: string | null;
}) {
  const q = useTelemetry(match, team);

  if (!match.telemetryUrl) return null;

  return (
    <section className="card overflow-hidden">
      <header className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-5 py-3">
        <h2 className="font-display text-lg font-semibold">Người hay Bot · Bản đồ trận</h2>
        <InfoTip term="humanBot" />
        <span className="ml-auto text-xs text-fg-subtle">Từ telemetry của PUBG</span>
      </header>

      {q.isPending ? (
        <div className="space-y-4 p-5">
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            <Loader2 className="size-4 animate-spin text-accent" /> Đang tải & phân tích telemetry (file vài MB)…
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((m) => (
              <Skeleton key={m.id} className="h-36 rounded-xl" />
            ))}
          </div>
          <Skeleton className="aspect-square w-full rounded-xl lg:aspect-[2/1]" />
        </div>
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} className="m-5" />
      ) : (
        <Body analysis={q.data} match={match} focusId={focusId} />
      )}
    </section>
  );
}

function Body({ analysis, match, focusId }: { analysis: NonNullable<ReturnType<typeof useTelemetry>["data"]>; match: MatchSummary; focusId: string | null }) {
  const colors = useMemo(
    () => Object.fromEntries(analysis.members.map((m, i) => [m.id, PLAYER_COLORS[i % PLAYER_COLORS.length]])),
    [analysis],
  );
  const total = analysis.members.reduce(
    (acc, m) => ({ human: acc.human + m.kills.human, bot: acc.bot + m.kills.bot }),
    { human: 0, bot: 0 },
  );

  return (
    <div className="space-y-5 p-4 sm:p-5">
      {total.human + total.bot > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-white/[0.03] px-4 py-3">
          <span className="text-sm text-fg-muted">Cả đội</span>
          <span className="num text-lg font-semibold">
            <span className="text-loss">{total.human}</span> kill người · <span className="text-fg-muted">{total.bot}</span> kill bot
          </span>
          <SplitBar c={total} className="min-w-40 flex-1" />
          <span className="num text-sm font-semibold text-loss">{fmtPct(total.human / (total.human + total.bot))} là người</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {analysis.members.map((m) => (
          <MemberCard key={m.id} m={m} color={colors[m.id]} focus={m.id === focusId} />
        ))}
      </div>

      <Replay analysis={analysis} match={match} colors={colors} focusId={focusId} />
    </div>
  );
}

function SplitBar({ c, className }: { c: Count; className?: string }) {
  const sum = c.human + c.bot;
  return (
    <div className={cn("flex h-2 overflow-hidden rounded-full bg-white/[0.06]", className)}>
      {sum > 0 && (
        <>
          <div className="h-full bg-loss" style={{ width: `${(c.human / sum) * 100}%` }} />
          <div className="h-full bg-fg-subtle/60" style={{ width: `${(c.bot / sum) * 100}%` }} />
        </>
      )}
    </div>
  );
}

function CountRow({ label, c, format = fmtInt }: { label: string; c: Count; format?: (n: number) => string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-fg-muted">{label}</span>
        <span className="num">
          <span className="inline-flex items-center gap-0.5 font-semibold text-loss">
            <User className="size-3" />
            {format(c.human)}
          </span>
          <span className="mx-1.5 text-fg-subtle">·</span>
          <span className="inline-flex items-center gap-0.5 text-fg-muted">
            <Bot className="size-3" />
            {format(c.bot)}
          </span>
        </span>
      </div>
      <SplitBar c={c} className="mt-1" />
    </div>
  );
}

function MemberCard({ m, color, focus }: { m: MemberAnalysis; color: string; focus: boolean }) {
  const d = m.death;
  return (
    <div className={cn("rounded-xl border bg-white/[0.02] p-3.5", focus ? "border-accent/40" : "border-white/[0.06]")}>
      <div className="mb-3 flex items-center gap-2.5">
        <Avatar name={m.name} size="sm" color={color} />
        <span className="truncate font-semibold">{m.name}</span>
      </div>
      <div className="space-y-2.5">
        <CountRow label="Kill" c={m.kills} />
        <CountRow label="Knock" c={m.knocks} />
        <CountRow label="Sát thương" c={m.damage} />
      </div>
      <div className="mt-3 border-t border-white/[0.05] pt-2.5 text-xs">
        {d ? (
          <span className="text-fg-muted">
            <Skull className="mr-1 inline size-3.5 text-loss" />
            {d.otherId ? (
              <>
                Bị hạ bởi <b className="text-fg">{d.otherName}</b> <BotTag bot={d.otherIsBot} /> · {d.weapon}
                {d.distance > 0 && ` · ${fmtInt(d.distance)} m`}
              </>
            ) : (
              <>Chết vì {d.otherName}</>
            )}
            <span className="text-fg-subtle"> ({clock(d.t)})</span>
          </span>
        ) : (
          <span className="text-win">Sống sót tới cuối trận</span>
        )}
      </div>
    </div>
  );
}

const BotTag = ({ bot }: { bot: boolean }) =>
  bot ? (
    <span className="inline-flex items-center gap-0.5 rounded bg-white/10 px-1 py-px text-[10px] font-semibold text-fg-muted">
      <Bot className="size-3" />
      BOT
    </span>
  ) : (
    <span className="rounded bg-loss/15 px-1 py-px text-[10px] font-semibold text-loss">NGƯỜI</span>
  );

type Filter = "all" | "kill" | "knock" | "death";

function Replay({
  analysis,
  match,
  colors,
  focusId,
}: {
  analysis: NonNullable<ReturnType<typeof useTelemetry>["data"]>;
  match: MatchSummary;
  colors: Record<string, string>;
  focusId: string | null;
}) {
  const end = Math.ceil(analysis.duration);
  const [time, setTime] = useState(end);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(30);
  const [filter, setFilter] = useState<Filter>("all");
  const raf = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTime((t) => {
        const next = t + dt * speed;
        if (next >= end) {
          setPlaying(false);
          return end;
        }
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, speed, end]);

  const togglePlay = () => {
    if (!playing && time >= end) setTime(0);
    setPlaying((p) => !p);
  };

  const feed = analysis.events.filter((e) => filter === "all" || e.kind === filter);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <MatchMap mapName={match.mapName} analysis={analysis} colors={colors} time={time} focusId={focusId} />

        <div className="flex items-center gap-3">
          <button className="btn-primary size-9 shrink-0 p-0" onClick={togglePlay} aria-label={playing ? "Tạm dừng" : "Phát lại trận"}>
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={end}
            step={1}
            value={Math.round(time)}
            onChange={(e) => {
              setPlaying(false);
              setTime(Number(e.target.value));
            }}
            className="h-2 flex-1 cursor-pointer accent-[var(--color-accent)]"
            aria-label="Thời gian trận"
          />
          <span className="num w-24 shrink-0 text-right text-sm text-fg-muted">
            {clock(time)} / {clock(end)}
          </span>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value) as (typeof SPEEDS)[number])}
            className="rounded-lg border border-white/10 bg-ink-950 px-1.5 py-1 text-xs"
            aria-label="Tốc độ phát"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-fg-muted">
          {analysis.members.map((m) => (
            <li key={m.id} className="flex items-center gap-1.5">
              <span className="h-1 w-4 rounded-full" style={{ background: colors[m.id] }} />
              {m.name}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span className="font-bold" style={{ color: MAP_MARK_COLORS.HUMAN }}>✕</span> Kill người
          </li>
          <li className="flex items-center gap-1.5">
            <span className="font-bold" style={{ color: MAP_MARK_COLORS.BOT }}>✕</span> Kill bot
          </li>
          <li className="flex items-center gap-1.5">
            <span style={{ color: MAP_MARK_COLORS.HUMAN }}>◇</span> Knock
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full border border-white" /> Tiếp đất
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-full border-2 border-dashed border-white/80" /> Vùng an toàn kế tiếp
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-full border-2 border-blue-500" /> Bo
          </li>
        </ul>
      </div>

      <div className="flex min-h-0 flex-col lg:h-0 lg:min-h-full">
        <Segmented<Filter>
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `Tất cả · ${analysis.events.length}` },
            { value: "kill", label: "Kill" },
            { value: "knock", label: "Knock" },
            { value: "death", label: "Chết" },
          ]}
        />
        <ol className="mt-3 max-h-[28rem] min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 lg:max-h-none">
          {feed.length === 0 && <li className="py-6 text-center text-sm text-fg-subtle">Không có sự kiện</li>}
          {feed.map((e, i) => (
            <FeedRow
              key={i}
              e={e}
              color={colors[e.memberId]}
              active={e.t <= time}
              onClick={() => {
                setPlaying(false);
                setTime(Math.ceil(e.t));
              }}
            />
          ))}
        </ol>
        <p className="mt-2 text-[11px] text-fg-subtle">Bấm vào một sự kiện để tua bản đồ tới thời điểm đó.</p>
      </div>
    </div>
  );
}

function FeedRow({ e, color, active, onClick }: { e: FeedEvent; color: string; active: boolean; onClick: () => void }) {
  const icon =
    e.kind === "kill" ? (
      <Crosshair className="size-3.5 text-accent" />
    ) : e.kind === "knock" ? (
      <Zap className="size-3.5 text-sky-300" />
    ) : (
      <Skull className="size-3.5 text-loss" />
    );
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-white/[0.05]",
          e.kind === "death" && "bg-loss/[0.06]",
          !active && "opacity-45",
        )}
      >
        <span className="num w-10 shrink-0 pt-px text-xs text-fg-subtle">{clock(e.t)}</span>
        <span className="pt-0.5">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="font-semibold" style={{ color }}>
            {e.memberName}
          </span>{" "}
          {e.kind === "death" ? (
            e.otherId ? (
              <>
                bị hạ bởi <b>{e.otherName}</b> <BotTag bot={e.otherIsBot} />
              </>
            ) : (
              <>chết vì {e.otherName}</>
            )
          ) : (
            <>
              {e.kind === "kill" ? "kill" : "knock"} <b>{e.otherName}</b> <BotTag bot={e.otherIsBot} />
            </>
          )}
          {e.weapon && (
            <span className="mt-0.5 block text-xs text-fg-subtle">
              {e.weapon}
              {e.distance > 0 && ` · ${fmtInt(e.distance)} m`}
              {e.headshot && <span className="ml-1.5 rounded bg-accent/15 px-1 font-semibold text-accent">HS</span>}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
