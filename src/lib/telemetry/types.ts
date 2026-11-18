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
  death: FeedEvent | null;
  landing: Pt | null;
  /** Đường di chuyển sau khi tiếp đất */
  path: Pt[];
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

export interface TelemetryAnalysis {
  duration: number;
  members: MemberAnalysis[];
  events: FeedEvent[];
  zones: ZoneState[];
}
