import { Maximize2, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { MAP_2D } from "@/lib/maps";
import type { FeedEvent, Pt, TelemetryAnalysis, ZoneState } from "@/lib/telemetry/types";

/** Toạ độ thế giới của SVG: bản đồ = 0..W */
const W = 1000;
/** Ảnh bản đồ chỉ 819px → giới hạn zoom để không quá mờ */
const MIN_VIEW = 110;
const MIN_FIT = 280;
const HUMAN = "#f87171";
const BOT = "#9aa1b2";

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

export function MatchMap({
  mapName,
  analysis,
  colors,
  time,
  focusId,
}: {
  mapName: string;
  analysis: TelemetryAnalysis;
  colors: Record<string, string>;
  time: number;
  focusId?: string | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const initial = useMemo(() => fitView(analysis), [analysis]);
  const [view, setView] = useState<View>(initial);
  const drag = useRef<{ px: number; py: number; view: View } | null>(null);
  const img = MAP_2D[mapName]?.image;

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
          {img ? (
            <image href={img} x={0} y={0} width={W} height={W} preserveAspectRatio="none" />
          ) : (
            <rect width={W} height={W} fill="#10141b" />
          )}

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

          {/* Đường đi */}
          {analysis.members.map((m) => {
            const pts = m.path.filter((p) => p.t <= time);
            if (pts.length < 2) return null;
            const focus = !focusId || focusId === m.id;
            return (
              <polyline
                key={m.id}
                points={pts.map((p) => `${p.x * W},${p.y * W}`).join(" ")}
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

          {/* Kill & knock */}
          {events.map((e, i) => (e.pos ? <EventMark key={i} e={e} s={s} /> : null))}

          {/* Vị trí hiện tại / nơi chết */}
          {analysis.members.map((m) => {
            const dead = m.death && m.death.t <= time;
            const p: Pt | undefined = dead && m.death?.pos ? { t: m.death.t, ...m.death.pos } : lastBefore(m.path, time);
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
                {showName && <text
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
                </text>}
              </g>
            );
          })}
        </svg>

        {!img && (
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

function EventMark({ e, s }: { e: FeedEvent; s: number }) {
  const cx = e.pos!.x * W;
  const cy = e.pos!.y * W;
  const color = e.otherIsBot ? BOT : HUMAN;
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

export const MAP_MARK_COLORS = { HUMAN, BOT };
