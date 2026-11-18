/**
 * Contract giữa Worker (/api/*) và frontend React.
 * Worker chuẩn hoá & rút gọn dữ liệu từ PUBG API trước khi trả về.
 */

export const SHARDS = ["steam", "kakao", "psn", "xbox", "console"] as const;
export type Shard = (typeof SHARDS)[number];

export const GAME_MODES = ["squad", "squad-fpp", "duo", "duo-fpp", "solo", "solo-fpp"] as const;
export type GameMode = (typeof GAME_MODES)[number];

/** "lifetime" hoặc id mùa của PUBG, ví dụ "division.bro.official.pc-2018-36" */
export type SeasonId = string;

export interface ApiMeta {
  /** Thời điểm (ms) Worker lấy dữ liệu này từ PUBG API */
  fetchedAt: number;
  /** true nếu PUBG API đang lỗi / rate-limit và đây là dữ liệu cache cũ */
  stale: boolean;
}

export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorBody {
  error: string;
  status: number;
  /** Số giây nên đợi trước khi thử lại (khi bị rate-limit) */
  retryAfter?: number;
}

/* ----------------------------- Players ----------------------------- */

export interface PlayerSummary {
  id: string;
  name: string;
  shard: string;
  clanId: string | null;
  banType: string | null;
  /** Các trận gần đây (PUBG chỉ giữ ~14 ngày) */
  matchIds: string[];
}

export interface PlayersResult {
  players: PlayerSummary[];
  notFound: string[];
}

/* ----------------------------- Seasons ----------------------------- */

export interface Season {
  id: SeasonId;
  label: string;
  number: number;
  isCurrent: boolean;
}

/* ------------------------------ Stats ------------------------------ */

export interface ModeStats {
  assists: number;
  boosts: number;
  dBNOs: number;
  dailyKills: number;
  dailyWins: number;
  damageDealt: number;
  days: number;
  headshotKills: number;
  heals: number;
  kills: number;
  longestKill: number;
  longestTimeSurvived: number;
  losses: number;
  maxKillStreaks: number;
  revives: number;
  rideDistance: number;
  roadKills: number;
  roundMostKills: number;
  roundsPlayed: number;
  suicides: number;
  swimDistance: number;
  teamKills: number;
  timeSurvived: number;
  top10s: number;
  vehicleDestroys: number;
  walkDistance: number;
  weaponsAcquired: number;
  weeklyKills: number;
  weeklyWins: number;
  wins: number;
}

export interface PlayerSeasonStats {
  playerId: string;
  seasonId: SeasonId;
  modes: Partial<Record<GameMode, ModeStats>>;
}

export interface SquadStats {
  seasonId: SeasonId;
  mode: GameMode;
  /** playerId -> stats (null nếu không có dữ liệu) */
  stats: Record<string, ModeStats | null>;
}

export interface RankedTier {
  tier: string;
  subTier: string;
}

export interface RankedModeStats {
  currentTier: RankedTier;
  currentRankPoint: number;
  bestTier: RankedTier;
  bestRankPoint: number;
  roundsPlayed: number;
  avgRank: number;
  top10Ratio: number;
  winRatio: number;
  assists: number;
  wins: number;
  kda: number;
  kills: number;
  deaths: number;
  roundMostKills: number;
  longestKill: number;
  headshotKills: number;
  damageDealt: number;
  dBNOs: number;
  revives: number;
}

export interface PlayerRanked {
  playerId: string;
  seasonId: SeasonId;
  modes: Record<string, RankedModeStats>;
}

/* ------------------------------ Matches ----------------------------- */

export interface MatchParticipant {
  playerId: string;
  name: string;
  isBot: boolean;
  teamId: number | null;
  kills: number;
  assists: number;
  dBNOs: number;
  damageDealt: number;
  headshotKills: number;
  longestKill: number;
  timeSurvived: number;
  walkDistance: number;
  rideDistance: number;
  swimDistance: number;
  revives: number;
  heals: number;
  boosts: number;
  weaponsAcquired: number;
  winPlace: number;
  killPlace: number;
  deathType: string;
}

export interface MatchTeam {
  teamId: number;
  rank: number;
  won: boolean;
  playerIds: string[];
}

export interface MatchSummary {
  id: string;
  createdAt: string;
  duration: number;
  mapName: string;
  gameMode: string;
  matchType: string;
  isCustomMatch: boolean;
  shard: string;
  teamCount: number;
  /** Link file telemetry (log sự kiện chi tiết) — không cần API key, CORS mở */
  telemetryUrl: string | null;
  participants: MatchParticipant[];
  teams: MatchTeam[];
}

/* ------------------------------ Weapons ----------------------------- */

/** Thống kê 1 khẩu súng theo Weapon Mastery (cộng dồn cả sự nghiệp, không chia mùa/chế độ) */
export interface WeaponStat {
  /** vd. "Item_Weapon_AK47_C" */
  id: string;
  level: number;
  tier: number;
  xp: number;
  kills: number;
  /** Số lần hạ gục (knock) */
  knocks: number;
  damage: number;
  headshots: number;
  /** mét */
  longestKill: number;
  longRangeKills: number;
  mostKillsInGame: number;
  mostDamageInGame: number;
}

export interface PlayerWeapons {
  playerId: string;
  /** Sắp xếp theo kill giảm dần */
  weapons: WeaponStat[];
}
