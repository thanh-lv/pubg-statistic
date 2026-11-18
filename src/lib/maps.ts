/**
 * Bản đồ 2D: ảnh lấy từ https://github.com/pubg/api-assets (Assets/Maps).
 * `image` = bản Low_Res (819px) làm nền; `tiles` = thư mục tile độ nét cao trong public/maps/tiles/.
 * `size` = cạnh bản đồ tính bằng cm trong telemetry (toạ độ 0..size, gốc ở góc trên-trái).
 */
/** Tile độ nét cao: bản 8192px của api-assets thu về 4096px rồi cắt lưới 4×4 ô 1024px (WebP) */
export const TILE_GRID = 4;

export const MAP_2D: Record<string, { image: string; tiles?: string; size: number }> = {
  Baltic_Main: { image: "/maps/Erangel_Main.jpg", tiles: "Erangel_Main", size: 816_000 },
  Erangel_Main: { image: "/maps/Erangel_Main.jpg", tiles: "Erangel_Main", size: 816_000 },
  Desert_Main: { image: "/maps/Miramar_Main.jpg", tiles: "Miramar_Main", size: 816_000 },
  Tiger_Main: { image: "/maps/Taego_Main.jpg", tiles: "Taego_Main", size: 816_000 },
  Kiki_Main: { image: "/maps/Deston_Main.jpg", tiles: "Deston_Main", size: 816_000 },
  Neon_Main: { image: "/maps/Rondo_Main.jpg", tiles: "Rondo_Main", size: 816_000 },
  // Vikendi bản mới (2023+) là 8x8 km
  DihorOtok_Main: { image: "/maps/Vikendi_Main.jpg", tiles: "Vikendi_Main", size: 816_000 },
  Savage_Main: { image: "/maps/Sanhok_Main.jpg", tiles: "Sanhok_Main", size: 408_000 },
  Chimera_Main: { image: "/maps/Paramo_Main.jpg", tiles: "Paramo_Main", size: 306_000 },
  Summerland_Main: { image: "/maps/Karakin_Main.jpg", tiles: "Karakin_Main", size: 204_000 },
  Range_Main: { image: "/maps/Camp_Jackal_Main.jpg", tiles: "Camp_Jackal_Main", size: 204_000 },
  Heaven_Main: { image: "/maps/Haven_Main.jpg", tiles: "Haven_Main", size: 102_000 },
};

export const MAP_SIZE_DEFAULT = 816_000;
export const mapSizeOf = (mapName: string) => MAP_2D[mapName]?.size ?? MAP_SIZE_DEFAULT;
