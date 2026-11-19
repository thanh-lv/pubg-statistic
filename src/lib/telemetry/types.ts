/** Kết quả phân tích telemetry 1 trận (tính trong Web Worker). */

/** Toạ độ đã chuẩn hoá 0..1 theo kích thước bản đồ; t = giây kể từ đầu trận */
export interface Pt {
  t: number;
  x: number;
  y: number;
}

export interface Count {
  human: number;
  bot: number;
}

export interface FeedEvent {
  t: number;
  kind: "kill" | "knock" | "death";
  /** Thành viên đội liên quan (người kill/knock, hoặc người chết) */
  memberId: string;
  memberName: string;
  /** Đối phương: nạn nhân (kill/knock) hoặc kẻ hạ (death). null = chết do bo, ngã… */
  otherId: string | null;
  otherName: string;
  otherIsBot: boolean;
  weapon: string;
  /** mét */
  distance: number;
  headshot: boolean;
  /** Vị trí nạn nhân (chuẩn hoá) */
  pos: { x: number; y: number } | null;
}

export interface MemberAnalysis {
  id: string;
  name: string;
  kills: Count;
  knocks: Count;
  damage: Count;
  /** Lần chết cuối cùng (không được hồi sinh); null = sống tới cuối trận */
  death: FeedEvent | null;
  /** Mọi lần chết theo thứ tự — nhiều hơn 1 khi bản đồ có hồi sinh (recall) */
  deaths: FeedEvent[];
  /** Lần tiếp đất đầu tiên */
  landing: Pt | null;
  /** Mọi lần tiếp đất (từ lần 2 là sau khi được hồi sinh) */
  landings: Pt[];
  /** Đường di chuyển của từng "mạng": từ lúc tiếp đất tới lúc chết (không nối qua đoạn chết → máy bay) */
  paths: Pt[][];
}

export interface Circle {
  x: number;
  y: number;
  r: number;
}

export interface ZoneState {
  t: number;
  /** Vòng xanh (bo đang co) */
  blue: Circle | null;
  /** Vòng trắng (vùng an toàn kế tiếp) */
  white: Circle | null;
}

/** Mọi người chơi trong trận (để vẽ đối thủ trên bản đồ) */
export interface Actor {
  id: string;
  name: string;
  teamId: number;
  isBot: boolean;
  isTeam: boolean;
  /** Vết di chuyển dạng phẳng [t, x, y, t, x, y, …] (toạ độ chuẩn hoá) — gọn khi gửi từ Web Worker */
  track: number[];
  /** Các lần chết: [lúc chết, lúc được hồi sinh | null] */
  deaths: [number, number | null][];
  /** Lần chết cuối cùng không được hồi sinh (giây); null = sống tới cuối trận */
  deathT: number | null;
}

/** Một phát bắn trúng: dùng vẽ đường đạn & vòng đỏ quanh người mất máu */
export interface Hit {
  t: number;
  attackerId: string;
  victimId: string;
  ax: number;
  ay: number;
  vx: number;
  vy: number;
  damage: number;
}

export interface TelemetryAnalysis {
  duration: number;
  members: MemberAnalysis[];
  events: FeedEvent[];
  zones: ZoneState[];
  actors: Actor[];
  /** Sắp xếp theo t tăng dần */
  hits: Hit[];
  /** Chỉ số giúp đội cải thiện (phối hợp, giao tranh, bo, loot) */
  insights: TeamInsights;
}

/* ------------------------- Insights: phối hợp đội ------------------------- */

/** 1 lần thành viên bị knock hoặc bị giết thẳng (không qua knock) */
export interface Setback {
  t: number;
  memberId: string;
  memberName: string;
  kind: "knock" | "death";
  /** null = chết do môi trường (bo, ngã, xe…) */
  attackerId: string | null;
  attackerName: string;
  attackerTeamId: number | null;
  attackerIsBot: boolean;
  /** Khoảng cách tới đồng đội còn đứng gần nhất (m); null = không còn ai đứng */
  nearestMate: number | null;
  /** Lúc đó còn đồng đội đứng được (không chết, không bị knock) → có thể trả đòn / cứu */
  supported: boolean;
  /** Thời điểm đội knock/kill lại 1 người của đội địch vừa gây ra (trong TRADE_WINDOW giây) */
  tradedAt: number | null;
  /** Chỉ với knock: được cứu hay mất luôn */
  outcome: "revived" | "lost" | null;
  revivedBy: string | null;
  /** Đang bận đánh 1 đội khác thì bị đội này đánh vào (bên thứ ba) */
  thirdParty: boolean;
  inVehicle: boolean;
  pos: { x: number; y: number } | null;
}

export interface Teamplay {
  setbacks: Setback[];
  /** TB khoảng cách mỗi thành viên tới đồng đội gần nhất, lấy mẫu mỗi 10s sau khi cả đội tiếp đất (m) */
  spreadAvg: number | null;
  /** % mẫu có ít nhất 1 thành viên cách đồng đội gần nhất > ISOLATED_M */
  isolatedPct: number | null;
}

/* ------------------------- Insights: giao tranh ------------------------- */

/** 1 trận đánh với 1 đội địch: chuỗi trao đổi sát thương / knock / kill cách nhau ≤ FIGHT_GAP giây */
export interface Fight {
  start: number;
  end: number;
  enemyTeamId: number;
  /** Mọi đối thủ tham gia đều là bot */
  enemyIsBot: boolean;
  /** Bên gây sát thương trước */
  firstHit: "us" | "them";
  /** Sát thương đội mình gây ra / nhận vào trong trận đánh */
  dealt: number;
  taken: number;
  /** Số người bị hạ (knock, hoặc chết thẳng không qua knock) */
  ourLosses: number;
  theirLosses: number;
  /** Có người bị hạ thì mới phân thắng/thua; không ai bị hạ = "even" (chỉ chạm súng) */
  result: "win" | "loss" | "even";
  pos: { x: number; y: number } | null;
}

export interface RangeBucket {
  label: string;
  /** m */
  min: number;
  max: number;
  dealt: number;
  taken: number;
  /** Đội mình knock địch / bị địch knock ở tầm này */
  knocks: number;
  knocked: number;
}

export interface Combat {
  fights: Fight[];
  ranges: RangeBucket[];
  /** Các lần đội mình knock địch: bị kết liễu / được đồng đội họ cứu / chưa rõ (hết trận) */
  knockConversion: { finished: number; revived: number; open: number };
  /** Sát thương mỗi thành viên nhận từ địch (người / bot) */
  taken: Record<string, Count>;
}

/* ---------------------- Insights: bo & di chuyển ---------------------- */

export interface ZonePhase {
  /** Bo số mấy (1 = vòng trắng đầu tiên) */
  index: number;
  /** Lúc vòng trắng (vùng an toàn kế tiếp) xuất hiện */
  start: number;
  /** Lúc bo xanh khép tới vòng trắng; null = trận kết thúc trước */
  close: number | null;
  /**
   * Mỗi thành viên vào vùng trắng sớm hơn lúc bo khép bao nhiêu giây.
   * > 0 vào kịp, < 0 vào muộn (chạy bo); null = đã chết / chưa có dữ liệu.
   */
  margins: Record<string, number | null>;
}

export interface MemberRotation {
  /** Sát thương nhận từ bo xanh */
  blueDamage: number;
  /** Số giây đứng ngoài bo (trong vùng xanh) */
  outsideSec: number;
  /** Đang ở bo số mấy lúc chết (0 = trước bo 1); null = sống sót */
  deathPhase: number | null;
  /** Số giây ngồi xe (không tính máy bay) */
  vehicleSec: number;
  /** Số lần được hồi sinh (recall) sau khi chết */
  recalls: number;
}

export interface Rotation {
  phases: ZonePhase[];
  members: Record<string, MemberRotation>;
}

/* ---------------------- Insights: loot & vật phẩm ---------------------- */

export interface Throwables {
  grenade: number;
  smoke: number;
  molotov: number;
  flash: number;
  other: number;
}

export interface MemberLoot {
  /** Số giây sau khi tiếp đất (lần đầu) tới lúc nhặt súng chính đầu tiên; null = không nhặt được */
  firstWeapon: number | null;
  /** … tới lúc mặc giáp cấp ≥ 2 */
  armor2: number | null;
  /** … tới lúc đội mũ cấp ≥ 2 */
  helmet2: number | null;
  throwables: Throwables;
  /** Sát thương gây cho địch bằng lựu đạn, molotov, bom dính… */
  throwDamage: number;
}

export interface Loot {
  members: Record<string, MemberLoot>;
  /** Số lần thành viên cứu đồng đội */
  revives: number;
  /** … trong đó có thả smoke ngay trước đó */
  smokeRevives: number;
}

export interface TeamInsights {
  teamSize: number;
  teamplay: Teamplay;
  combat: Combat;
  rotation: Rotation;
  loot: Loot;
}
