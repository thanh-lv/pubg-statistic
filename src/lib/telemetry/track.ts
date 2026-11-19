/** Đang chết tại thời điểm t → trả về lúc chết của lần đó; còn sống (hoặc đã được hồi sinh) → null */
export function deadSince(deaths: [number, number | null][], t: number): number | null {
  for (const [died, back] of deaths) if (t >= died && (back == null || t < back)) return died;
  return null;
}

/** Vị trí nội suy trên vết [t,x,y,…] tại thời điểm t (null nếu chưa xuất hiện / mất dấu quá lâu) */
export function posAt(track: number[], t: number, staleAfter = 25): { x: number; y: number } | null {
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
