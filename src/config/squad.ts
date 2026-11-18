import type { GameMode, Shard } from "@shared/types";

/**
 * ⚙️ CẤU HÌNH ĐỘI HÌNH MẶC ĐỊNH
 *
 * Điền tên in-game (phân biệt HOA/thường) của bạn và bạn bè vào `players`.
 * Đây là danh sách mọi người thấy khi mở website lần đầu.
 * Mỗi người xem vẫn có thể tự thêm/bớt trên giao diện (lưu trong trình duyệt của họ)
 * hoặc chia sẻ link dạng  https://your-site/?p=Name1,Name2
 */
export const SQUAD_CONFIG: {
  title: string;
  shard: Shard;
  defaultMode: GameMode;
  players: string[];
} = {
  title: "Squad Stats",
  shard: "steam",
  defaultMode: "squad",
  players: [
    // "thanhlv2911",
    // "thangq0",
    // "vudzhihi",
  ],
};
