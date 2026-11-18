/**
 * Bản đồ 2D: ảnh lấy từ https://github.com/pubg/api-assets (Assets/Maps, bản Low_Res đã nén JPEG).
 * `size` = cạnh bản đồ tính bằng cm trong telemetry (toạ độ 0..size, gốc ở góc trên-trái).
 */
export const MAP_2D: Record<string, { image: string; size: number }> = {
  Baltic_Main: { image: "/maps/Erangel_Main.jpg", size: 816_000 },
  Erangel_Main: { image: "/maps/Erangel_Main.jpg", size: 816_000 },
  Desert_Main: { image: "/maps/Miramar_Main.jpg", size: 816_000 },
  Tiger_Main: { image: "/maps/Taego_Main.jpg", size: 816_000 },
  Kiki_Main: { image: "/maps/Deston_Main.jpg", size: 816_000 },
  Neon_Main: { image: "/maps/Rondo_Main.jpg", size: 816_000 },
  // Vikendi bản mới (2023+) là 8x8 km
  DihorOtok_Main: { image: "/maps/Vikendi_Main.jpg", size: 816_000 },
  Savage_Main: { image: "/maps/Sanhok_Main.jpg", size: 408_000 },
  Chimera_Main: { image: "/maps/Paramo_Main.jpg", size: 306_000 },
  Summerland_Main: { image: "/maps/Karakin_Main.jpg", size: 204_000 },
  Range_Main: { image: "/maps/Camp_Jackal_Main.jpg", size: 204_000 },
  Heaven_Main: { image: "/maps/Haven_Main.jpg", size: 102_000 },
};

export const MAP_SIZE_DEFAULT = 816_000;
export const mapSizeOf = (mapName: string) => MAP_2D[mapName]?.size ?? MAP_SIZE_DEFAULT;
