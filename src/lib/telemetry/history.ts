/**
 * Phase 5 — Tổng hợp chỉ số đội qua nhiều trận.
 * Mỗi trận phân tích xong chỉ giữ bản tóm tắt (~1 KB) trong localStorage của trình duyệt:
 * lần sau không phải tải lại telemetry (vài MB/trận), và vẫn xem được sau khi PUBG xoá dữ liệu trận (14 ngày).
 */
import type { MatchSummary } from "@shared/types";
import type { TermKey } from "../glossary";
import {
  summarizeCombat,
  summarizeLoot,
  summarizeRotation,
  summarizeTeamplay,
  type CombatSummary,
  type LootSummary,
  type Ratio,
  type RotationSummary,
  type TeamplaySummary,
} from "./insights";
import { toneFor, type LimitKey } from "./tone";
import type { TelemetryAnalysis } from "./types";

/** Tăng khi đổi cách tính → bản cũ trong cache bị bỏ qua và phân tích lại */
export const INSIGHTS_VERSION = 1;
const STORE_KEY = "pubg-insights";
const MAX_RECORDS = 300;

export interface InsightRecord {
  v: number;
  matchId: string;
  createdAt: string;
  mapName: string;
  gameMode: string;
  matchType: string;
  teamId: number;
  rank: number;
  teamCount: number;
  /** Thành viên người thật của đội trong trận */
  members: { id: string; name: string }[];
  teamplay: TeamplaySummary;
  combat: CombatSummary;
  rotation: RotationSummary;
  loot: LootSummary;
}

export const recordKey = (matchId: string, teamId: number) => `${matchId}:${teamId}`;

export function buildRecord(match: MatchSummary, teamId: number, team: { id: string; name: string }[], a: TelemetryAnalysis): InsightRecord {
  const ins = a.insights;
  return {
    v: INSIGHTS_VERSION,
    matchId: match.id,
    createdAt: match.createdAt,
    mapName: match.mapName,
    gameMode: match.gameMode,
    matchType: match.matchType,
    teamId,
    rank: match.teams.find((t) => t.teamId === teamId)?.rank ?? 0,
    teamCount: match.teams.length,
    members: team,
    teamplay: summarizeTeamplay(ins.teamplay),
    combat: summarizeCombat(ins.combat),
    rotation: summarizeRotation(ins.rotation, ins.teamplay.setbacks),
    loot: summarizeLoot(ins.loot),
  };
}

/* ------------------------------ Cache ------------------------------ */

export function loadRecords(): Record<string, InsightRecord> {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, InsightRecord>) : {};
    return Object.fromEntries(Object.entries(all).filter(([, r]) => r?.v === INSIGHTS_VERSION));
  } catch {
    return {};
  }
}

export function saveRecord(r: InsightRecord) {
  try {
    const all = loadRecords();
    all[recordKey(r.matchId, r.teamId)] = r;
    // Giữ MAX_RECORDS trận mới nhất
    const kept = Object.entries(all)
      .sort(([, a], [, b]) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, MAX_RECORDS);
    localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {
    /* localStorage bị chặn / đầy → bỏ qua, chỉ mất cache */
  }
}

export function clearRecords() {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------ Cộng dồn ------------------------------ */

const pool = (rs: InsightRecord[], get: (r: InsightRecord) => Ratio): Ratio =>
  rs.reduce((acc, r) => ({ n: acc.n + get(r).n, of: acc.of + get(r).of }), { n: 0, of: 0 });

const mean = (rs: InsightRecord[], get: (r: InsightRecord) => number | null | undefined) => {
  const xs = rs.map(get).filter((x): x is number => x != null && Number.isFinite(x));
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
};

/** Trung vị — dùng cho khoảng cách, vì 1 trận có người nhảy riêng cách đội vài km sẽ kéo lệch trung bình */
const med = (rs: InsightRecord[], get: (r: InsightRecord) => number | null | undefined) => {
  const xs = rs
    .map(get)
    .filter((x): x is number => x != null && Number.isFinite(x))
    .sort((a, b) => a - b);
  if (!xs.length) return null;
  const mid = xs.length >> 1;
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
};

const ratio = (r: Ratio) => (r.of ? r.n / r.of : null);

/** Gộp nhiều trận: tỉ lệ cộng dồn tử/mẫu (trận nhiều tình huống nặng ký hơn), khoảng cách lấy trung vị, số đo khác lấy trung bình */
export function aggregate(rs: InsightRecord[]) {
  const dealt = rs.reduce((s, r) => s + r.combat.dealtHuman, 0);
  const taken = rs.reduce((s, r) => s + r.combat.takenHuman, 0);
  return {
    n: rs.length,
    trade: pool(rs, (r) => r.teamplay.trade),
    revive: pool(rs, (r) => r.teamplay.revive),
    mateDistance: med(rs, (r) => r.teamplay.mateDistance),
    spread: med(rs, (r) => r.teamplay.spreadAvg),
    thirdParty: mean(rs, (r) => r.teamplay.thirdParty),
    fightWin: pool(rs, (r) => r.combat.winHuman),
    firstHit: pool(rs, (r) => r.combat.firstHit),
    winWhenFirst: pool(rs, (r) => r.combat.winWhenFirst),
    winWhenSecond: pool(rs, (r) => r.combat.winWhenSecond),
    dmgRatio: taken ? dealt / taken : dealt ? Infinity : null,
    conversion: pool(rs, (r) => r.combat.conversion),
    late: pool(rs, (r) => r.rotation.late),
    blueDamage: mean(rs, (r) => r.rotation.blueDamagePerMember),
    outside: mean(rs, (r) => r.rotation.outsidePerMember),
    firstWeapon: mean(rs, (r) => r.loot.firstWeapon),
    armor: mean(rs, (r) => r.loot.armor2),
    throws: mean(rs, (r) => r.loot.throwsPerMember),
    smokeRevive: pool(rs, (r) => r.loot.smokeRevive),
    avgRank: mean(rs, (r) => r.rank),
  };
}
export type Aggregate = ReturnType<typeof aggregate>;

/* ------------------------------ Định nghĩa chỉ số ------------------------------ */

export type Group = "teamplay" | "combat" | "rotation" | "loot";

export interface MetricDef {
  key: LimitKey;
  group: Group;
  label: string;
  term: TermKey;
  /** Giá trị đã gộp (tỉ lệ 0..1, mét, giây…) */
  value: (a: Aggregate) => number | null;
  /** Mẫu số để biết đủ dữ liệu chưa (null = không áp dụng) */
  sample?: (a: Aggregate) => number;
  /** Giá trị 1 trận (cho bảng từng trận) */
  perMatch: (r: InsightRecord) => number | null;
  format: (v: number) => string;
  /** Gợi ý khi chỉ số ở mức kém */
  advice: string;
}

const pctF = (v: number) => `${Math.round(v * 100)}%`;
const mF = (v: number) => `${Math.round(v)} m`;
const secF = (v: number) => (v < 60 ? `${Math.round(v)}s` : `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, "0")}`);

export const GROUP_LABEL: Record<Group, string> = {
  teamplay: "Phối hợp",
  combat: "Giao tranh",
  rotation: "Bo & di chuyển",
  loot: "Loot & vật phẩm",
};

export const METRICS: MetricDef[] = [
  {
    key: "trade",
    group: "teamplay",
    label: "Trả đòn",
    term: "trade",
    value: (a) => ratio(a.trade),
    sample: (a) => a.trade.of,
    perMatch: (r) => ratio(r.teamplay.trade),
    format: pctF,
    advice: "Ít khi trả đòn được khi đồng đội bị hạ: đi gần nhau hơn, giữ góc bắn chéo để khi 1 người bị bắn thì người khác thấy được kẻ bắn.",
  },
  {
    key: "revive",
    group: "teamplay",
    label: "Được cứu",
    term: "reviveRate",
    value: (a) => ratio(a.revive),
    sample: (a) => a.revive.of,
    perMatch: (r) => ratio(r.teamplay.revive),
    format: pctF,
    advice: "Người bị knock thường không được cứu: ưu tiên hạ / đẩy lùi kẻ vừa bắn trước, thả smoke rồi mới cứu, kéo người bị knock vào chỗ nấp.",
  },
  {
    key: "mateDistance",
    group: "teamplay",
    label: "Đồng đội gần nhất lúc bị hạ",
    term: "mateDistance",
    value: (a) => a.mateDistance,
    perMatch: (r) => r.teamplay.mateDistance,
    format: mF,
    advice: "Lúc bị hạ thường không có đồng đội ở gần: giữ khoảng cách trong ~25 m khi di chuyển và khi vào nhà, tránh 1 người đi loot / trinh sát quá xa.",
  },
  {
    key: "spread",
    group: "teamplay",
    label: "Độ tản đội",
    term: "teamSpread",
    value: (a) => a.spread,
    perMatch: (r) => r.teamplay.spreadAvg,
    format: mF,
    advice: "Đội hay tản quá xa: chọn chung 1 cụm nhà khi loot, hẹn điểm tập trung trước mỗi lần xoay bo.",
  },
  {
    key: "fightWin",
    group: "combat",
    label: "Thắng giao tranh",
    term: "fightWin",
    value: (a) => ratio(a.fightWin),
    sample: (a) => a.fightWin.of,
    perMatch: (r) => ratio(r.combat.winHuman),
    format: pctF,
    advice: "Thua nhiều trận đánh với đội người: chọn trận có lợi thế (chỗ cao, có chỗ nấp, đủ người), đừng giao tranh khi đang thiếu người hoặc đang chạy bo.",
  },
  {
    key: "firstHit",
    group: "combat",
    label: "Bắn trước",
    term: "firstHit",
    value: (a) => ratio(a.firstHit),
    sample: (a) => a.firstHit.of,
    perMatch: (r) => ratio(r.combat.firstHit),
    format: pctF,
    advice: "Hay bị địch bắn trước: di chuyển theo chỗ nấp, dừng lại quan sát trước khi băng qua chỗ trống, chia hướng quan sát cho từng người.",
  },
  {
    key: "dmgRatio",
    group: "combat",
    label: "Sát thương gây / nhận",
    term: "dmgRatio",
    value: (a) => a.dmgRatio,
    perMatch: (r) => (r.combat.takenHuman ? r.combat.dealtHuman / r.combat.takenHuman : r.combat.dealtHuman ? Infinity : null),
    format: (v) => (Number.isFinite(v) ? `${v.toFixed(2)}×` : "∞"),
    advice: "Nhận nhiều sát thương hơn gây ra: tập đọ súng (peek ngắn, đổi góc sau mỗi loạt), dùng chỗ nấp để hồi máu trước khi ló ra lại.",
  },
  {
    key: "conversion",
    group: "combat",
    label: "Knock → kill",
    term: "knockConvert",
    value: (a) => ratio(a.conversion),
    sample: (a) => a.conversion.of,
    perMatch: (r) => ratio(r.combat.conversion),
    format: pctF,
    advice: "Knock được nhưng địch hay được cứu dậy: dồn hoả lực kết liễu ngay, dùng lựu đạn vào chỗ người bị knock đang bò vào.",
  },
  {
    key: "late",
    group: "rotation",
    label: "Vào bo muộn",
    term: "zoneEntry",
    value: (a) => ratio(a.late),
    sample: (a) => a.late.of,
    perMatch: (r) => ratio(r.rotation.late),
    format: pctF,
    advice: "Hay chạy bo: bắt đầu xoay ngay khi vòng trắng mới hiện, chuẩn bị xe từ giữa trận, ưu tiên vị trí gần tâm bo kế tiếp.",
  },
  {
    key: "blueDamage",
    group: "rotation",
    label: "Sát thương bo / người",
    term: "blueDamage",
    value: (a) => a.blueDamage,
    perMatch: (r) => r.rotation.blueDamagePerMember,
    format: (v) => String(Math.round(v)),
    advice: "Mất nhiều máu vì bo: mang đủ đồ hồi máu / tăng lực, xoay sớm thay vì loot nốt, tránh bị kẹt giữa 2 đội ở rìa bo.",
  },
  {
    key: "firstWeapon",
    group: "loot",
    label: "Có súng sau khi đáp",
    term: "lootSpeed",
    value: (a) => a.firstWeapon,
    perMatch: (r) => r.loot.firstWeapon,
    format: secF,
    advice: "Mất lâu mới có súng: nhảy vào cụm nhà nhỏ ít người hơn, mỗi người 1 nhà, ưu tiên nhặt súng trước rồi mới tới đồ khác.",
  },
  {
    key: "armor",
    group: "loot",
    label: "Giáp cấp 2+",
    term: "lootSpeed",
    value: (a) => a.armor,
    perMatch: (r) => r.loot.armor2,
    format: secF,
    advice: "Lâu mới có giáp cấp 2: chọn điểm nhảy có nhiều nhà / quân sự hơn, chia nhau khu vực loot, đổi giáp cho đồng đội thiếu.",
  },
  {
    key: "smokeRevive",
    group: "loot",
    label: "Cứu có smoke",
    term: "smokeRevive",
    value: (a) => ratio(a.smokeRevive),
    sample: (a) => a.smokeRevive.of,
    perMatch: (r) => ratio(r.loot.smokeRevive),
    format: pctF,
    advice: "Hiếm khi thả smoke trước khi cứu: mỗi người nên mang 2–3 smoke và thả che đường bắn trước khi cứu đồng đội.",
  },
];

/** Cần tối thiểu bao nhiêu tình huống thì mới đưa ra gợi ý cho 1 tỉ lệ */
const MIN_SAMPLE = 4;

/** Các chỉ số đang ở mức kém (đủ dữ liệu), xếp theo mức tệ */
export function weakSpots(a: Aggregate) {
  return METRICS.filter((m) => {
    const v = m.value(a);
    if (v == null) return false;
    if (m.sample && m.sample(a) < MIN_SAMPLE) return false;
    return toneFor(m.key, v) === "bad";
  });
}
