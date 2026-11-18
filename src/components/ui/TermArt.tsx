import type { ReactNode } from "react";
import type { TermKey } from "@/lib/glossary";
import { TIER_COLORS } from "@/lib/constants";

/**
 * Hình minh hoạ dạng sơ đồ cho từng chỉ số (SVG inline, không cần file ảnh).
 * Tất cả dùng chung khung 120×72 để hiển thị đồng nhất.
 */

const ACCENT = "#f5b62e";
const MUTED = "rgb(255 255 255 / 0.16)";
const FAINT = "rgb(255 255 255 / 0.07)";
const TEXT = "#9aa1b2";
const LOSS = "#f87171";
const SKY = "#38bdf8";

/** Người chơi giản lược: đầu + thân. */
function Fig({ x, y, color = MUTED, down }: { x: number; y: number; color?: string; down?: boolean }) {
  return down ? (
    <g fill={color}>
      <circle cx={x - 6} cy={y + 12} r={4.5} />
      <rect x={x - 2} y={y + 9} width={16} height={7} rx={3.5} />
    </g>
  ) : (
    <g fill={color}>
      <circle cx={x} cy={y} r={4.5} />
      <rect x={x - 4} y={y + 6} width={8} height={14} rx={3} />
    </g>
  );
}

const T = ({ x, y, children, color = TEXT, size = 8, anchor = "middle", bold }: { x: number; y: number; children: ReactNode; color?: string; size?: number; anchor?: "start" | "middle" | "end"; bold?: boolean }) => (
  <text x={x} y={y} fill={color} fontSize={size} textAnchor={anchor} fontWeight={bold ? 700 : 500} style={{ fontFamily: "var(--font-display)" }}>
    {children}
  </text>
);

function Dots({ filled, color }: { filled: number; color: string }) {
  return (
    <g>
      {Array.from({ length: 10 }, (_, i) => (
        <circle key={i} cx={14 + (i % 5) * 14} cy={i < 5 ? 22 : 40} r={5} fill={i < filled ? color : FAINT} stroke={i < filled ? "none" : MUTED} strokeWidth={0.8} />
      ))}
    </g>
  );
}

const ART: Partial<Record<TermKey, ReactNode>> = {
  kd: (
    <>
      <rect x={14} y={12} width={16} height={44} rx={3} fill={ACCENT} />
      <rect x={46} y={34} width={16} height={22} rx={3} fill={LOSS} opacity={0.85} />
      <T x={22} y={66}>Kill 12</T>
      <T x={54} y={66}>Chết 6</T>
      <T x={38} y={30} size={12} color={TEXT}>÷</T>
      <T x={94} y={40} size={16} color={ACCENT} bold>2.0</T>
    </>
  ),
  kda: (
    <>
      <rect x={10} y={22} width={14} height={34} rx={3} fill={ACCENT} />
      <rect x={28} y={40} width={14} height={16} rx={3} fill={SKY} />
      <T x={17} y={66}>K</T>
      <T x={35} y={66}>A</T>
      <T x={52} y={36} size={12}>÷</T>
      <rect x={62} y={36} width={14} height={20} rx={3} fill={LOSS} opacity={0.85} />
      <T x={69} y={66}>D</T>
      <T x={100} y={40} size={14} color={ACCENT} bold>KDA</T>
    </>
  ),
  adr: (
    <>
      {[30, 14, 40, 22, 34].map((h, i) => (
        <rect key={i} x={10 + i * 15} y={56 - h} width={10} height={h} rx={2} fill={MUTED} />
      ))}
      <line x1={6} x2={84} y1={28} y2={28} stroke={ACCENT} strokeWidth={1.5} strokeDasharray="3 2" />
      <T x={10} y={66} anchor="start">5 trận</T>
      <T x={104} y={31} size={11} color={ACCENT} bold>TB</T>
    </>
  ),
  winRate: (
    <>
      <Dots filled={1} color={ACCENT} />
      <T x={42} y={62}>1 thắng / 10 trận</T>
      <T x={102} y={36} size={14} color={ACCENT} bold>10%</T>
    </>
  ),
  top10Rate: (
    <>
      <Dots filled={4} color={SKY} />
      <T x={42} y={62}>4 lần Top 10 / 10</T>
      <T x={102} y={36} size={14} color={SKY} bold>40%</T>
    </>
  ),
  hsRate: (
    <>
      <Fig x={40} y={20} color={MUTED} />
      <circle cx={40} cy={20} r={10} fill="none" stroke={ACCENT} strokeWidth={1.4} />
      <line x1={40} x2={40} y1={6} y2={14} stroke={ACCENT} strokeWidth={1.4} />
      <line x1={40} x2={40} y1={26} y2={34} stroke={ACCENT} strokeWidth={1.4} />
      <line x1={26} x2={34} y1={20} y2={20} stroke={ACCENT} strokeWidth={1.4} />
      <line x1={46} x2={54} y1={20} y2={20} stroke={ACCENT} strokeWidth={1.4} />
      <T x={40} y={60}>Bắn vào đầu</T>
      <T x={96} y={36} size={13} color={ACCENT} bold>HS</T>
    </>
  ),
  avgKills: (
    <>
      {[3, 1, 5].map((k, i) => (
        <g key={i}>
          <rect x={8 + i * 34} y={14} width={28} height={36} rx={4} fill={FAINT} stroke={MUTED} strokeWidth={0.8} />
          {Array.from({ length: k }, (_, j) => (
            <line key={j} x1={13 + i * 34 + j * 4.5} x2={13 + i * 34 + j * 4.5} y1={24} y2={40} stroke={ACCENT} strokeWidth={2} />
          ))}
        </g>
      ))}
      <T x={56} y={64}>(3 + 1 + 5) ÷ 3 = 3 kill/trận</T>
    </>
  ),
  dBNOs: (
    <>
      <Fig x={22} y={20} color={MUTED} />
      <path d="M40 34 h22" stroke={ACCENT} strokeWidth={1.5} markerEnd="url(#arrow)" />
      <Fig x={84} y={26} color={LOSS} down />
      <T x={22} y={62}>Đối thủ</T>
      <T x={88} y={62} color={LOSS}>Bị gục</T>
    </>
  ),
  assists: (
    <>
      <Fig x={14} y={14} color={SKY} />
      <Fig x={14} y={44} color={ACCENT} />
      <Fig x={98} y={28} color={LOSS} />
      <line x1={22} x2={88} y1={22} y2={34} stroke={SKY} strokeWidth={1.2} strokeDasharray="3 2" />
      <line x1={22} x2={88} y1={52} y2={40} stroke={ACCENT} strokeWidth={1.4} />
      <T x={46} y={14} color={SKY}>Bạn: gây dame</T>
      <T x={50} y={68} color={ACCENT}>Đồng đội: kết liễu</T>
    </>
  ),
  revives: (
    <>
      <Fig x={30} y={18} color={ACCENT} />
      <Fig x={66} y={26} color={MUTED} down />
      <g stroke={ACCENT} strokeWidth={3} strokeLinecap="round">
        <line x1={100} x2={100} y1={18} y2={34} />
        <line x1={92} x2={108} y1={26} y2={26} />
      </g>
      <T x={60} y={64}>Đỡ đồng đội đang gục</T>
    </>
  ),
  longestKill: (
    <>
      <circle cx={14} cy={30} r={7} fill="none" stroke={ACCENT} strokeWidth={1.3} />
      <circle cx={14} cy={30} r={1.5} fill={ACCENT} />
      <Fig x={104} y={20} color={LOSS} />
      <line x1={24} x2={96} y1={30} y2={30} stroke={ACCENT} strokeWidth={1} strokeDasharray="2 3" />
      <path d="M24 50 h72 M24 46 v8 M96 46 v8" stroke={TEXT} strokeWidth={1} fill="none" />
      <T x={60} y={64} color={ACCENT} bold size={10}>420 m</T>
    </>
  ),
  roundMostKills: (
    <>
      {[2, 4, 9, 3].map((k, i) => (
        <rect key={i} x={12 + i * 22} y={56 - k * 5} width={14} height={k * 5} rx={2} fill={k === 9 ? ACCENT : MUTED} />
      ))}
      <T x={63} y={8} color={ACCENT} bold>9</T>
      <T x={56} y={68}>Trận nhiều kill nhất</T>
    </>
  ),
  maxKillStreaks: (
    <>
      {[0, 1, 2].map((i) => (
        <g key={i} stroke={ACCENT} strokeWidth={3} strokeLinecap="round">
          <line x1={14 + i * 24} x2={28 + i * 24} y1={20} y2={34} />
          <line x1={28 + i * 24} x2={14 + i * 24} y1={20} y2={34} />
        </g>
      ))}
      <path d="M14 46 h64" stroke={TEXT} strokeWidth={1} markerEnd="url(#arrow)" />
      <T x={46} y={62}>liên tiếp, rất nhanh</T>
      <T x={102} y={32} size={15} color={ACCENT} bold>x3</T>
    </>
  ),
  avgSurvival: (
    <>
      <circle cx={36} cy={34} r={28} fill="none" stroke={SKY} strokeWidth={1.2} strokeDasharray="3 2" opacity={0.6} />
      <circle cx={42} cy={38} r={14} fill="rgb(255 255 255 / 0.05)" stroke="#fff" strokeWidth={1.2} />
      <circle cx={44} cy={36} r={3} fill={ACCENT} />
      <T x={92} y={30} size={11} color={ACCENT} bold>16m</T>
      <T x={92} y={44}>sống / trận</T>
    </>
  ),
  heals: (
    <>
      <rect x={34} y={18} width={52} height={36} rx={6} fill={FAINT} stroke={MUTED} />
      <g stroke={LOSS} strokeWidth={4} strokeLinecap="round">
        <line x1={60} x2={60} y1={26} y2={46} />
        <line x1={50} x2={70} y1={36} y2={36} />
      </g>
    </>
  ),
  boosts: (
    <>
      <rect x={36} y={14} width={18} height={42} rx={4} fill={FAINT} stroke={MUTED} />
      <rect x={40} y={10} width={10} height={6} rx={1} fill={MUTED} />
      <path d="M46 24 l-5 10 h6 l-4 10" stroke={ACCENT} strokeWidth={2} fill="none" strokeLinejoin="round" />
      <rect x={64} y={30} width={22} height={10} rx={5} fill={SKY} opacity={0.8} />
    </>
  ),
  rp: (
    <>
      <polyline points="8,56 30,48 48,52 70,32 90,26 112,12" fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" />
      {[[30, 48], [70, 32], [112, 12]].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r={2.5} fill={ACCENT} />
      ))}
      <T x={30} y={68}>Thắng, Top cao, kill → RP tăng</T>
    </>
  ),
  tier: (
    <>
      {(["Bronze", "Silver", "Gold", "Platinum", "Crystal", "Diamond", "Master"] as const).map((t, i) => (
        <rect key={t} x={6 + i * 16} y={56 - (i + 1) * 6.5} width={13} height={(i + 1) * 6.5} rx={2} fill={TIER_COLORS[t]} opacity={0.9} />
      ))}
      <T x={12} y={66} size={7}>Bronze</T>
      <T x={108} y={66} size={7}>Master</T>
    </>
  ),
  avgRank: (
    <>
      <rect x={44} y={20} width={30} height={36} rx={2} fill={ACCENT} />
      <rect x={12} y={32} width={30} height={24} rx={2} fill={MUTED} />
      <rect x={76} y={40} width={30} height={16} rx={2} fill={FAINT} stroke={MUTED} />
      <T x={59} y={42} color="#0a0c10" bold size={12}>1</T>
      <T x={27} y={48} bold size={11}>2</T>
      <T x={91} y={52} bold size={10}>3</T>
      <T x={60} y={68}>Càng nhỏ càng tốt</T>
    </>
  ),
  tppFpp: (
    <>
      {/* TPP */}
      <Fig x={34} y={24} color={MUTED} />
      <circle cx={14} cy={14} r={4} fill={SKY} />
      <path d="M17 15 L52 6 M17 15 L52 42" stroke={SKY} strokeWidth={0.8} opacity={0.7} />
      <T x={30} y={64} color={SKY} bold>TPP</T>
      {/* FPP */}
      <Fig x={86} y={24} color={MUTED} />
      <circle cx={86} cy={24} r={2} fill={ACCENT} />
      <path d="M88 24 L116 12 M88 24 L116 36" stroke={ACCENT} strokeWidth={0.8} opacity={0.8} />
      <T x={92} y={64} color={ACCENT} bold>FPP</T>
      <line x1={60} x2={60} y1={6} y2={66} stroke={FAINT} />
    </>
  ),
  place: (
    <>
      <rect x={34} y={10} width={52} height={44} rx={10} fill={ACCENT} />
      <T x={60} y={36} color="#0a0c10" bold size={16}>#1</T>
      <T x={60} y={48} color="#0a0c10" size={8}>/25 đội</T>
    </>
  ),
};

export const hasArt = (term: TermKey) => term in ART;

export function TermArt({ term, className }: { term: TermKey; className?: string }) {
  const art = ART[term];
  if (!art) return null;
  return (
    <svg viewBox="0 0 120 72" className={className} role="img" aria-hidden>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill={ACCENT} />
        </marker>
      </defs>
      {art}
    </svg>
  );
}
