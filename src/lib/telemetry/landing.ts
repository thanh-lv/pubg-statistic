/**
 * Trích điểm tiếp đất (nhảy dù) của các thành viên từ telemetry 1 trận.
 *
 * Sự kiện LogParachuteLanding gần như không có tên khu vực, nhưng các sự kiện khác (nhặt đồ, bắn…)
 * có `character.zone` → tính tâm của từng khu vực từ chính trận đó, rồi gán điểm đáp vào khu gần nhất.
 */
import { IGNORED_ZONE } from "../places";
import { mapSizeOf } from "../maps";

export interface Landing {
  playerId: string;
  name: string;
  /** toạ độ chuẩn hoá 0..1 */
  x: number;
  y: number;
  /** giây kể từ đầu trận */
  t: number;
  /** khoá khu vực trong telemetry (vd. "pochinki"), null = ngoài địa danh */
  place: string | null;
  /** số người chơi thật khác đội tiếp đất trong bán kính 300 m */
  nearby: number;
  /** số giây từ lúc đáp đến lúc chết; null = không chết (sống tới cuối / thắng) */
  survived: number | null;
}

export interface MatchLandings {
  matchId: string;
  mapName: string;
  /** id đã phân tích (để biết khi đội hình đổi thì cần phân tích lại) */
  ids: string[];
  landings: Landing[];
}

/** cm */
const PLACE_RADIUS = 45_000;
const NEARBY_RADIUS = 30_000;

interface Loc {
  x: number;
  y: number;
}
interface Char {
  accountId?: string;
  name?: string;
  teamId?: number;
  location?: Loc;
  zone?: string[];
}
type Ev = Record<string, unknown> & { _T: string; _D?: string };

const CHAR_KEYS = ["character", "attacker", "victim", "reviver", "killer", "finisher", "dBNOMaker"] as const;

export function extractLandings(events: Ev[], matchId: string, ids: string[], mapName: string): MatchLandings {
  const size = mapSizeOf(mapName);
  const want = new Set(ids);
  let t0 = 0;

  const zoneAcc = new Map<string, { x: number; y: number; n: number }>();
  const landings = new Map<string, { char: Char; t: number }>();
  const deaths = new Map<string, number>();

  for (const e of events) {
    const time = e._D ? Date.parse(e._D) : 0;
    if (e._T === "LogMatchStart") t0 = time;

    // Tâm khu vực: chỉ dùng vị trí thuộc đúng 1 khu (tránh vùng giáp ranh)
    for (const k of CHAR_KEYS) {
      const c = e[k] as Char | undefined;
      const z = c?.zone;
      if (!c?.location || !z || z.length !== 1 || IGNORED_ZONE.test(z[0])) continue;
      const a = zoneAcc.get(z[0]) ?? { x: 0, y: 0, n: 0 };
      a.x += c.location.x;
      a.y += c.location.y;
      a.n++;
      zoneAcc.set(z[0], a);
    }

    if (e._T === "LogParachuteLanding") {
      const c = e.character as Char | undefined;
      // Chỉ lấy lần đáp đầu tiên (Taego/Deston có thể nhảy lại)
      if (c?.accountId && c.location && !landings.has(c.accountId)) landings.set(c.accountId, { char: c, t: time });
    } else if (e._T === "LogPlayerKillV2" || e._T === "LogPlayerKill") {
      const v = e.victim as Char | undefined;
      if (v?.accountId && !deaths.has(v.accountId)) deaths.set(v.accountId, time);
    }
  }

  const centers = [...zoneAcc.entries()].filter(([, a]) => a.n >= 3).map(([zone, a]) => ({ zone, x: a.x / a.n, y: a.y / a.n }));
  const all = [...landings.values()];

  const out: Landing[] = [];
  for (const [id, { char, t }] of landings) {
    if (!want.has(id)) continue;
    const { x, y } = char.location!;

    let place: string | null = null;
    let best = PLACE_RADIUS;
    for (const c of centers) {
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < best) {
        best = d;
        place = c.zone;
      }
    }

    const nearby = all.filter(
      (o) =>
        o.char.teamId !== char.teamId &&
        !o.char.accountId!.startsWith("ai.") &&
        Math.hypot(o.char.location!.x - x, o.char.location!.y - y) <= NEARBY_RADIUS,
    ).length;

    const death = deaths.get(id);
    out.push({
      playerId: id,
      name: char.name ?? "?",
      x: x / size,
      y: y / size,
      t: t0 ? Math.max(0, (t - t0) / 1000) : 0,
      place,
      nearby,
      survived: death != null ? Math.max(0, (death - t) / 1000) : null,
    });
  }

  return { matchId, mapName, ids, landings: out };
}
