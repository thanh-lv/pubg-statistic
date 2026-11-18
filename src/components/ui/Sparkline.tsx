/** Biểu đồ cột nhỏ cho chuỗi giá trị (vd. sát thương theo trận). */
export function BarSpark({
  values,
  highlight,
  height = 56,
  label,
}: {
  values: number[];
  highlight?: (i: number) => boolean;
  height?: number;
  label: string;
}) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const w = 100 / values.length;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label={label}>
      {values.map((v, i) => {
        const h = Math.max(2, (v / max) * (height - 2));
        return (
          <rect
            key={i}
            x={i * w + w * 0.15}
            y={height - h}
            width={w * 0.7}
            height={h}
            rx={0.8}
            className={highlight?.(i) ? "fill-accent" : "fill-white/20"}
          >
            <title>{Math.round(v)}</title>
          </rect>
        );
      })}
    </svg>
  );
}
