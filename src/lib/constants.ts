import type { GameMode } from "@shared/types";

export const MODE_LABELS: Record<GameMode, string> = {
  squad: "Squad TPP",
  "squad-fpp": "Squad FPP",
  duo: "Duo TPP",
  "duo-fpp": "Duo FPP",
  solo: "Solo TPP",
  "solo-fpp": "Solo FPP",
};

export const MAPS: Record<string, { name: string; color: string }> = {
  Baltic_Main: { name: "Erangel", color: "#4ade80" },
  Erangel_Main: { name: "Erangel", color: "#4ade80" },
  Desert_Main: { name: "Miramar", color: "#f59e0b" },
  Savage_Main: { name: "Sanhok", color: "#22c55e" },
  DihorOtok_Main: { name: "Vikendi", color: "#93c5fd" },
  Tiger_Main: { name: "Taego", color: "#fb923c" },
  Kiki_Main: { name: "Deston", color: "#38bdf8" },
  Neon_Main: { name: "Rondo", color: "#e879f9" },
  Chimera_Main: { name: "Paramo", color: "#a3a3a3" },
  Heaven_Main: { name: "Haven", color: "#818cf8" },
  Summerland_Main: { name: "Karakin", color: "#fbbf24" },
  Range_Main: { name: "Camp Jackal", color: "#94a3b8" },
};

export const mapInfo = (id: string) => MAPS[id] ?? { name: id.replace(/_Main$/, ""), color: "#94a3b8" };

export const MATCH_TYPES: Record<string, string> = {
  official: "Thường",
  competitive: "Rank",
  custom: "Custom",
  event: "Sự kiện",
  arcade: "Arcade",
  airoyale: "Casual",
  seasonal: "Mùa",
  training: "Luyện tập",
};

export const matchModeLabel = (gameMode: string) =>
  MODE_LABELS[gameMode as GameMode] ?? gameMode.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const TIER_COLORS: Record<string, string> = {
  Bronze: "#c47b4a",
  Silver: "#c0c7d4",
  Gold: "#f5b62e",
  Platinum: "#5eead4",
  Crystal: "#a78bfa",
  Diamond: "#60a5fa",
  Master: "#f472b6",
  Survivor: "#f87171",
};

/** Bảng màu phân biệt người chơi khi so sánh */
export const PLAYER_COLORS = [
  "#f5b62e",
  "#38bdf8",
  "#f472b6",
  "#34d399",
  "#a78bfa",
  "#fb923c",
  "#f87171",
  "#2dd4bf",
  "#facc15",
  "#818cf8",
];
