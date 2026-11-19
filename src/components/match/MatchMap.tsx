import { Maximize2, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { MAP_2D, TILE_GRID } from "@/lib/maps";
import type { Actor, FeedEvent, Hit, TelemetryAnalysis, ZoneState } from "@/lib/telemetry/types";

/** Toạ độ thế giới của SVG: bản đồ = 0..W */
const W = 1000;
const MIN_VIEW = 80;
const MIN_FIT = 280;
/** Zoom vào hơn mức này thì tải tile độ nét cao */
const TILE_THRESHOLD = 700;

export const MAP_COLORS = {
  human: "#f87171",
  bot: "#9aa1b2",
  /** Đối thủ (người & bot) dùng chung 1 màu, phân biệt bằng hình: chấm tròn = người, người máy = bot */
  opponent: "#e2e8f0",
  hitRing: "#ef4444",
  /** Đội đối thủ đang được chọn */
  teamHighlight: "#c084fc",
};

type View = { x: number; y: number; w: number };

const clampView = (v: View): View => {
  const w = Math.min(W, Math.max(MIN_VIEW, v.w));
  return { w, x: Math.min(W - w, Math.max(0, v.x)), y: Math.min(W - w, Math.max(0, v.y)) };
};

/** Khung nhìn ban đầu: vừa khít đường đi & sự kiện của đội */
function fitView(a: TelemetryAnalysis): View {
  const pts: { x: number; y: number }[] = [];
  a.members.forEach((m) => pts.push(...m.path));
  a.events.forEach((e) => e.pos && pts.push(e.pos));
  if (!pts.length) return { x: 0, y: 0, w: W };
  const xs = pts.map((p) => p.x * W);
  const ys = pts.map((p) => p.y * W);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const w = Math.max(MIN_FIT, Math.max(maxX - minX, maxY - minY) * 1.35 + 60);
  return clampView({ w, x: (minX + maxX) / 2 - w / 2, y: (minY + maxY) / 2 - w / 2 });
}

const lastBefore = <T extends { t: number }>(list: T[], t: number) => {
  let found: T | undefined;
  for (const item of list) {
    if (item.t > t) break;
    found = item;
  }
  return found;
};

/** Vị trí nội suy trên vết [t,x,y,…] tại thời điểm t (null nếu chưa xuất hiện / mất dấu quá lâu) */
function posAt(track: number[], t: number, staleAfter = 25): { x: number; y: number } | null {
  const n = track.length / 3;
  if (!n || t < track[0]) return null;
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (track[mid * 3] <= t) lo = mid;
    else hi = mid - 1;
  }
  const i = lo * 3;
  if (lo === n - 1) return t - track[i] > staleAfter ? null : { x: track[i + 1], y: track[i + 2] };
  const k = (t - track[i]) / (track[i + 3] - track[i] || 1);
  return { x: track[i + 1] + (track[i + 4] - track[i + 1]) * k, y: track[i + 2] + (track[i + 5] - track[i + 2]) * k };
}

/** Các phát trúng trong khoảng (t - win, t] */
function hitsIn(hits: Hit[], t: number, win: number): Hit[] {
  let lo = 0;
  let hi = hits.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (hits[mid].t <= t - win) lo = mid + 1;
    else hi = mid;
  }
  const out: Hit[] = [];
  for (let i = lo; i < hits.length && hits[i].t <= t; i++) out.push(hits[i]);
  return out;
}

export function MatchMap({
  mapName,
  analysis,
  colors,
  time,
  focusId,
  showHumans = true,
  showBots = true,
  showTeamNumbers = true,
  teamLabels,
  highlightTeam = null,
  showShots = true,
  hitWindow = 2,
}: {
  mapName: string;
  analysis: TelemetryAnalysis;
  colors: Record<string, string>;
  time: number;
  focusId?: string | null;
  /** Hiện đối thủ là người chơi */
  showHumans?: boolean;
  /** Hiện đối thủ là bot */
  showBots?: boolean;
  /** Ghi số đội cạnh mỗi đối thủ */
  showTeamNumbers?: boolean;
  /** Nhãn hiển thị theo teamId (vd đội bot → "B1"); thiếu thì dùng chính teamId */
  teamLabels?: Record<number, string>;
  /** Đội đối thủ đang chọn: tô nổi bật (luôn hiện, kể cả khi bị lọc), các đội khác làm mờ */
  highlightTeam?: number | null;
  showShots?: boolean;
  /** Đường đạn / vòng đỏ hiển thị trong bao nhiêu giây (theo thời gian trận) */
  hitWindow?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const initial = useMemo(() => fitView(analysis), [analysis]);
  const [view, setView] = useState<View>(initial);
  const drag = useRef<{ px: number; py: number; view: View } | null>(null);
  const mapInfo = MAP_2D[mapName];

  const actorById = useMemo(() => new Map(analysis.actors.map((a) => [a.id, a])), [analysis]);
  // Đội đang chọn vẽ sau cùng để nằm trên các đội khác
  const opponents = useMemo(() => {
    const list = analysis.actors.filter((a) => !a.isTeam);
    return highlightTeam == null ? list : [...list.filter((a) => a.teamId !== highlightTeam), ...list.filter((a) => a.teamId === highlightTeam)];
  }, [analysis, highlightTeam]);

  const zoomAt = useCallback((factor: number, fx = 0.5, fy = 0.5) => {
    setView((v) => {
      const w = Math.min(W, Math.max(MIN_VIEW, v.w * factor));
      return clampView({ w, x: v.x + fx * v.w - fx * w, y: v.y + fy * v.w - fy * w });
    });
  }, []);

  // Wheel zoom (listener thường, không passive, để chặn cuộn trang)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY > 0 ? 1.18 : 1 / 1.18, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onDown = (e: ReactPointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, view };
  };
  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    const el = box.current;
    if (!d || !el) return;
    const scale = d.view.w / el.getBoundingClientRect().width;
    setView(clampView({ ...d.view, x: d.view.x - (e.clientX - d.px) * scale, y: d.view.y - (e.clientY - d.py) * scale }));
  };
  const onUp = () => (drag.current = null);

  // Kích thước ký hiệu không đổi trên màn hình khi zoom
  const s = view.w / W;
  const zone: ZoneState | undefined = lastBefore(analysis.zones, time);
  const events = analysis.events.filter((e) => e.t <= time && e.kind !== "death");
  const recentHits = showShots ? hitsIn(analysis.hits, time, hitWindow) : [];

  // Tile độ nét cao: chỉ các ô nằm trong khung nhìn
  const tiles: { r: number; c: number }[] = [];
  if (mapInfo?.tiles && view.w < TILE_THRESHOLD) {
    const ts = W / TILE_GRID;
    for (let r = 0; r < TILE_GRID; r++)
      for (let c = 0; c < TILE_GRID; c++)
        if (c * ts < view.x + view.w && (c + 1) * ts > view.x && r * ts < view.y + view.w && (r + 1) * ts > view.y)
          tiles.push({ r, c });
  }

  const teamPos = (id: string, deathT: number | null) => {
    const a = actorById.get(id);
    if (!a) return null;
    return posAt(a.track, deathT !== null ? Math.min(time, deathT) : time, Infinity);
  };

  return (
    <div className="relative">
      <div
        ref={box}
        className="relative aspect-square w-full cursor-grab touch-none overflow-hidden rounded-xl bg-ink-950 select-none active:cursor-grabbing"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.w}`} className="size-full" role="img" aria-label="Bản đồ trận đấu">
          {mapInfo ? (
            <image href={mapInfo.image} x={0} y={0} width={W} height={W} preserveAspectRatio="none" />
          ) : (
            <rect width={W} height={W} fill="#10141b" />
          )}
          {tiles.map(({ r, c }) => (
            <image
              key={`${r}_${c}`}
              href={`/maps/tiles/${mapInfo!.tiles}/${r}_${c}.webp`}
              x={(c * W) / TILE_GRID}
              y={(r * W) / TILE_GRID}
              // phủ chồng 0.4 đơn vị để không lộ khe giữa các ô
              width={W / TILE_GRID + 0.4}
              height={W / TILE_GRID + 0.4}
              preserveAspectRatio="none"
            />
          ))}

          {/* Vòng bo */}
          {zone?.blue && (
            <>
              <path
                fillRule="evenodd"
                fill="rgb(56 120 248 / 0.18)"
                d={`M-2000,-2000 H3000 V3000 H-2000 Z M${zone.blue.x * W},${zone.blue.y * W} m-${zone.blue.r * W},0 a${zone.blue.r * W},${zone.blue.r * W} 0 1,0 ${zone.blue.r * W * 2},0 a${zone.blue.r * W},${zone.blue.r * W} 0 1,0 -${zone.blue.r * W * 2},0`}
              />
              <circle cx={zone.blue.x * W} cy={zone.blue.y * W} r={zone.blue.r * W} fill="none" stroke="#3b82f6" strokeWidth={2.5 * s} />
            </>
          )}
          {zone?.white && (
            <circle cx={zone.white.x * W} cy={zone.white.y * W} r={zone.white.r * W} fill="none" stroke="#fff" strokeWidth={2 * s} strokeDasharray={`${6 * s} ${4 * s}`} />
          )}

          {/* Đường đi của đội */}
          {analysis.members.map((m) => {
            const pts = m.path.filter((p) => p.t <= time).map((p) => `${p.x * W},${p.y * W}`);
            const now = teamPos(m.id, m.death?.t ?? null);
            if (now && (!m.death || time < m.death.t)) pts.push(`${now.x * W},${now.y * W}`);
            if (pts.length < 2) return null;
            const focus = !focusId || focusId === m.id;
            return (
              <polyline
                key={m.id}
                points={pts.join(" ")}
                fill="none"
                stroke={colors[m.id]}
                strokeWidth={(focus ? 3 : 2) * s}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={focus ? 0.95 : 0.6}
              />
            );
          })}

          {/* Điểm tiếp đất */}
          {analysis.members.map(
            (m) =>
              m.landing &&
              m.landing.t <= time && (
                <circle key={`land-${m.id}`} cx={m.landing.x * W} cy={m.landing.y * W} r={5 * s} fill="none" stroke={colors[m.id]} strokeWidth={2 * s}>
                  <title>{m.name} tiếp đất</title>
                </circle>
              ),
          )}

          {/* Kill & knock của đội */}
          {events.map((e, i) => (e.pos ? <EventMark key={i} e={e} s={s} /> : null))}

          {/* Đối thủ: người = chấm tròn, bot = người máy, kèm số đội */}
          {opponents.map((a) => {
            const hl = highlightTeam === a.teamId;
            if (!hl && !(a.isBot ? showBots : showHumans)) return null;
            const state = highlightTeam == null ? "normal" : hl ? "highlight" : "dim";
            return (
              <OpponentDot
                key={a.id}
                a={a}
                time={time}
                s={s}
                label={showTeamNumbers}
                num={teamLabels?.[a.teamId] ?? String(a.teamId)}
                state={state}
              />
            );
          })}

          {/* Đường đạn: người bắn → người trúng, mờ dần */}
          {recentHits.map((h, i) => {
            const fade = 1 - (time - h.t) / hitWindow;
            const shooter = actorById.get(h.attackerId);
            const color = shooter?.isTeam
              ? (colors[h.attackerId] ?? MAP_COLORS.opponent)
              : highlightTeam != null && shooter?.teamId === highlightTeam
                ? MAP_COLORS.teamHighlight
                : MAP_COLORS.opponent;
            return (
              <line
                key={`shot-${i}`}
                x1={h.ax * W}
                y1={h.ay * W}
                x2={h.vx * W}
                y2={h.vy * W}
                stroke={color}
                strokeWidth={1.6 * s}
                strokeLinecap="round"
                strokeDasharray={`${5 * s} ${3 * s}`}
                opacity={0.25 + 0.75 * fade}
              />
            );
          })}

          {/* Vị trí hiện tại / nơi chết của đội */}
          {analysis.members.map((m) => {
            const dead = !!m.death && m.death.t <= time;
            const p = dead && m.death?.pos ? m.death.pos : teamPos(m.id, m.death?.t ?? null);
            if (!p) return null;
            const cx = p.x * W;
            const cy = p.y * W;
            const showName = !focusId || focusId === m.id;
            return (
              <g key={`me-${m.id}`}>
                <title>{`${m.name}${dead ? " (đã chết)" : ""}`}</title>
                {dead ? (
                  <g stroke="#fff" strokeWidth={2.2 * s} strokeLinecap="round">
                    <circle cx={cx} cy={cy} r={8 * s} fill="#0a0c10" stroke={colors[m.id]} />
                    <line x1={cx - 4 * s} y1={cy - 4 * s} x2={cx + 4 * s} y2={cy + 4 * s} />
                    <line x1={cx + 4 * s} y1={cy - 4 * s} x2={cx - 4 * s} y2={cy + 4 * s} />
                  </g>
                ) : (
                  <circle cx={cx} cy={cy} r={7 * s} fill={colors[m.id]} stroke="#fff" strokeWidth={2 * s} />
                )}
                {showName && (
                  <text
                    x={cx}
                    y={cy - 12 * s}
                    textAnchor="middle"
                    fontSize={12 * s}
                    fontWeight={700}
                    fill="#fff"
                    stroke="#000"
                    strokeWidth={3 * s}
                    paintOrder="stroke"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {m.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* Vòng đỏ quanh người vừa bị bắn trúng (đang mất máu) */}
          {recentHits.map((h, i) => {
            const age = (time - h.t) / hitWindow;
            return (
              <circle
                key={`hit-${i}`}
                cx={h.vx * W}
                cy={h.vy * W}
                r={(8 + 8 * age) * s}
                fill="none"
                stroke={MAP_COLORS.hitRing}
                strokeWidth={Math.min(4, 1.6 + h.damage / 25) * s}
                opacity={1 - age}
              >
                <title>{`${actorById.get(h.victimId)?.name ?? "?"} mất ${Math.round(h.damage)} máu`}</title>
              </circle>
            );
          })}
        </svg>

        {!mapInfo && (
          <div className="pointer-events-none absolute inset-x-0 top-3 text-center text-xs text-fg-subtle">Chưa có ảnh cho bản đồ này</div>
        )}
      </div>

      <div className="absolute top-2 right-2 flex flex-col gap-1">
        {[
          { icon: <Plus className="size-4" />, label: "Phóng to", on: () => zoomAt(1 / 1.5) },
          { icon: <Minus className="size-4" />, label: "Thu nhỏ", on: () => zoomAt(1.5) },
          { icon: <Maximize2 className="size-4" />, label: "Vừa khung đội", on: () => setView(initial) },
        ].map((b) => (
          <button
            key={b.label}
            type="button"
            onClick={b.on}
            aria-label={b.label}
            title={b.label}
            className="grid size-8 place-items-center rounded-lg border border-white/10 bg-ink-900/85 text-fg backdrop-blur hover:bg-ink-700"
          >
            {b.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

const DARK = "#0a0c10";

function OpponentDot({
  a,
  time,
  s,
  label,
  num,
  state,
}: {
  a: Actor;
  time: number;
  s: number;
  /** Ghi số đội */
  label: boolean;
  /** Nhãn đội: "12" hoặc "B3" */
  num: string;
  state: "normal" | "highlight" | "dim";
}) {
  const hl = state === "highlight";
  const color = hl ? MAP_COLORS.teamHighlight : MAP_COLORS.opponent;
  const fade = state === "dim" ? 0.3 : 1;
  const title = `${a.name}${a.isBot ? " (bot)" : ""} · Đội ${num}`;

  if (a.deathT !== null && time > a.deathT) {
    // Đã chết: dấu ✕ mờ dần trong 10s (đội đang chọn thì giữ luôn để thấy nơi bị loại)
    const age = time - a.deathT;
    if (!hl && age > 10) return null;
    const p = posAt(a.track, a.deathT, Infinity);
    if (!p) return null;
    const r = 3.5 * s;
    return (
      <g stroke={color} strokeWidth={1.6 * s} opacity={hl ? 0.9 : 0.8 * (1 - age / 10) * fade}>
        <title>{`${title} (đã chết)`}</title>
        <line x1={p.x * W - r} y1={p.y * W - r} x2={p.x * W + r} y2={p.y * W + r} />
        <line x1={p.x * W + r} y1={p.y * W - r} x2={p.x * W - r} y2={p.y * W + r} />
      </g>
    );
  }
  const p = posAt(a.track, time);
  if (!p) return null;
  const cx = p.x * W;
  const cy = p.y * W;

  if (a.isBot) {
    return (
      <g opacity={fade}>
        <BotGlyph x={cx} y={cy} s={s} title={title} color={color} opacity={hl ? 1 : 0.7} />
        {label && (
          // Số đội bên phải icon bot
          <text
            x={cx + 6.5 * s}
            y={cy}
            dy="0.35em"
            fontSize={8 * s}
            fontWeight={800}
            fill={color}
            stroke={DARK}
            strokeWidth={2.4 * s}
            paintOrder="stroke"
            opacity={hl ? 1 : 0.8}
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {num}
          </text>
        )}
      </g>
    );
  }
  return (
    // Người chơi: chấm to, đậm, có quầng sáng để nổi hơn bot; số đội nằm trong chấm
    <g opacity={fade}>
      <title>{title}</title>
      <circle cx={cx} cy={cy} r={9.5 * s} fill={color} opacity={0.22} />
      <circle cx={cx} cy={cy} r={6.5 * s} fill={color} stroke={DARK} strokeWidth={2 * s} />
      {label && (
        <text
          x={cx}
          y={cy}
          dy="0.35em"
          textAnchor="middle"
          fontSize={(num.length > 2 ? 5.5 : 7.5) * s}
          fontWeight={800}
          fill={DARK}
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {num}
        </text>
      )}
    </g>
  );
}

/** Hình người máy (đầu + ăng-ten + 2 mắt), tâm tại (x, y), kích thước không đổi trên màn hình.
 *  Nhỏ & mờ hơn chấm người chơi để người chơi nổi bật hơn. */
function BotGlyph({ x, y, s, title, color, opacity }: { x: number; y: number; s: number; title: string; color: string; opacity: number }) {
  const dark = DARK;
  return (
    <g transform={`translate(${x} ${y}) scale(${s * 0.85})`} opacity={opacity}>
      <title>{title}</title>
      <line x1={0} y1={-4} x2={0} y2={-7} stroke={dark} strokeWidth={3} strokeLinecap="round" />
      <line x1={0} y1={-4} x2={0} y2={-7} stroke={color} strokeWidth={1.3} strokeLinecap="round" />
      <circle cx={0} cy={-7.6} r={1.6} fill={color} stroke={dark} strokeWidth={0.9} />
      <rect x={-6} y={-4} width={12} height={9} rx={2.2} fill={color} stroke={dark} strokeWidth={1.3} />
      <circle cx={-2.4} cy={0.4} r={1.3} fill={dark} />
      <circle cx={2.4} cy={0.4} r={1.3} fill={dark} />
    </g>
  );
}

function EventMark({ e, s }: { e: FeedEvent; s: number }) {
  const cx = e.pos!.x * W;
  const cy = e.pos!.y * W;
  const color = e.otherIsBot ? MAP_COLORS.bot : MAP_COLORS.human;
  const title = `${e.memberName} ${e.kind === "kill" ? "kill" : "knock"} ${e.otherName}${e.otherIsBot ? " (bot)" : ""} · ${e.weapon}`;
  if (e.kind === "knock") {
    const r = 5 * s;
    return (
      <path d={`M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z`} fill="none" stroke={color} strokeWidth={1.8 * s}>
        <title>{title}</title>
      </path>
    );
  }
  const r = 5.5 * s;
  return (
    <g stroke={color} strokeWidth={2.6 * s} strokeLinecap="round">
      <title>{title}</title>
      <line x1={cx - r} y1={cy - r} x2={cx + r} y2={cy + r} />
      <line x1={cx + r} y1={cy - r} x2={cx - r} y2={cy + r} />
    </g>
  );
}
