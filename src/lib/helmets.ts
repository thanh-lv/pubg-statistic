import { hashString } from "./utils";

/**
 * Ảnh mũ bảo hiểm lấy từ kho tài nguyên chính thức cho PUBG API developer:
 * https://github.com/pubg/api-assets  (Assets/Item/Equipment/Headgear)
 * Đã thu nhỏ về 256px, đặt trong public/avatars/helmets/.
 */
export const HELMETS = [
  { id: "lv1-a", level: 1, label: "Mũ cấp 1 (xanh)" },
  { id: "lv1-b", level: 1, label: "Mũ cấp 1 (xám)" },
  { id: "lv2-a", level: 2, label: "Mũ cấp 2 (camo sa mạc)" },
  { id: "lv2-b", level: 2, label: "Mũ cấp 2 (camo đô thị)" },
  { id: "lv3", level: 3, label: "Mũ cấp 3" },
] as const;

export type HelmetId = (typeof HELMETS)[number]["id"];

export const helmetSrc = (id: HelmetId) => `/avatars/helmets/${id}.png`;
export const helmetInfo = (id: HelmetId) => HELMETS.find((h) => h.id === id) ?? HELMETS[0];
export const isHelmetId = (v: unknown): v is HelmetId => HELMETS.some((h) => h.id === v);

/** Mũ mặc định cố định theo tên (cùng tên → cùng mũ ở mọi máy). */
export const defaultHelmet = (name: string): HelmetId => HELMETS[hashString(name.toLowerCase()) % HELMETS.length].id;

export const nextHelmet = (id: HelmetId): HelmetId => HELMETS[(HELMETS.findIndex((h) => h.id === id) + 1) % HELMETS.length].id;

export const LEVEL_STYLE: Record<number, string> = {
  1: "bg-zinc-300 text-ink-950",
  2: "bg-sky-400 text-ink-950",
  3: "bg-accent text-ink-950",
};
