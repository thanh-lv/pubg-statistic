/** Đánh giá 1 chỉ số theo ngưỡng tham khảo: tốt / tạm / kém */
export type Tone = "good" | "ok" | "bad" | "none";

/** higherBetter = true → ≥ good là tốt, ≥ ok là tạm; ngược lại ≤ good là tốt, ≤ ok là tạm */
export function toneOf(v: number | null | undefined, good: number, ok: number, higherBetter = true): Tone {
  if (v == null || Number.isNaN(v)) return "none";
  if (higherBetter) return v >= good ? "good" : v >= ok ? "ok" : "bad";
  return v <= good ? "good" : v <= ok ? "ok" : "bad";
}

/** Ngưỡng tham khảo dùng chung cho trang trận và trang đội: [tốt, tạm, cao hơn là tốt?] */
export const LIMITS = {
  trade: [0.5, 0.25, true],
  revive: [0.5, 0.25, true],
  mateDistance: [25, 60, false],
  spread: [40, 80, false],
  fightWin: [0.6, 0.4, true],
  firstHit: [0.6, 0.4, true],
  dmgRatio: [1.2, 0.9, true],
  conversion: [0.8, 0.6, true],
  late: [0.1, 0.25, false],
  blueDamage: [30, 80, false],
  outside: [60, 150, false],
  firstWeapon: [15, 40, false],
  armor: [60, 180, false],
  smokeRevive: [0.5, 0.2, true],
  throws: [3, 1.5, true],
} as const satisfies Record<string, readonly [number, number, boolean]>;

export type LimitKey = keyof typeof LIMITS;

export function toneFor(key: LimitKey, v: number | null | undefined): Tone {
  const [good, ok, higherBetter] = LIMITS[key];
  return toneOf(v, good, ok, higherBetter);
}
