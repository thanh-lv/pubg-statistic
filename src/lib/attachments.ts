/** Tên tiếng Việt cho phụ kiện súng & vật phẩm ném trong telemetry. */

export type Slot = "Upper" | "Muzzle" | "Lower" | "Magazine" | "Stock" | "SideRail" | "Other";

export const SLOT_LABEL: Record<Slot, string> = {
  Upper: "Ống ngắm",
  Muzzle: "Đầu nòng",
  Lower: "Tay cầm",
  Magazine: "Băng đạn",
  Stock: "Báng",
  SideRail: "Ray hông",
  Other: "Khác",
};
export const SLOT_ORDER: Slot[] = ["Upper", "Muzzle", "Lower", "Magazine", "Stock", "SideRail"];

/** "Item_Attach_Weapon_Upper_ACOG_01_C" → slot "Upper", tên "ACOG_01" */
function parse(id: string): { slot: Slot; name: string } {
  const m = /^Item_Attach_Weapon_([A-Za-z]+)_(.+?)_C$/.exec(id);
  if (!m) return { slot: "Other", name: id };
  const slot = (["Upper", "Muzzle", "Lower", "Magazine", "Stock", "SideRail"] as Slot[]).includes(m[1] as Slot) ? (m[1] as Slot) : "Other";
  return { slot, name: m[2] };
}

export const slotOf = (id: string) => parse(id).slot;

/** Ống ngắm: tên hiển thị + thứ tự từ gần tới xa */
const SCOPES: Record<string, [string, number]> = {
  DotSight_01: ["Red dot", 1],
  Holosight: ["Holo", 2],
  Aimpoint: ["2x", 3],
  Scope3x: ["3x", 4],
  ACOG_01: ["4x", 5],
  DualOptic_4x1x: ["Kép 4x/1x", 6],
  Scope6x: ["6x", 7],
  CQBSS: ["8x", 8],
  PM2_01: ["15x", 9],
  Thermal: ["Nhiệt 4x", 10],
};
/** Không gắn ống ngắm (ngắm sắt, hoặc súng có ống ngắm liền như Win94, VSS) */
export const NO_SCOPE = "none";

export function scopeLabel(id: string) {
  if (id === NO_SCOPE) return "Ngắm sắt / ngắm liền";
  return SCOPES[parse(id).name]?.[0] ?? pretty(parse(id).name);
}
export const scopeOrder = (id: string) => (id === NO_SCOPE ? 0 : (SCOPES[parse(id).name]?.[1] ?? 50));

const NAMES: [RegExp, string][] = [
  [/^Suppressor/, "Giảm thanh"],
  [/^FlashHider/, "Che lửa"],
  [/^Compensator/, "Bù giật"],
  [/MuzzleBrake/, "Phanh nòng"],
  [/^Choke/, "Choke (shotgun)"],
  [/^Duckbill/, "Mỏ vịt (shotgun)"],
  [/^TiltedGrip/, "Tay cầm nghiêng"],
  [/^LightweightForeGrip/, "Tay cầm nhẹ"],
  [/^ThumbGrip/, "Tay cầm ngón cái"],
  [/^AngledForeGrip/, "Tay cầm góc"],
  [/^HalfGrip/, "Tay cầm nửa"],
  [/^Foregrip/, "Tay cầm dọc"],
  [/^LaserPointer/, "Laser"],
  [/^ExtendedQuickDraw/, "Băng mở rộng + thay nhanh"],
  [/^Extended/, "Băng mở rộng"],
  [/^QuickDraw/, "Băng thay nhanh"],
  [/AR_Composite/, "Báng tactical"],
  [/AR_HeavyStock/, "Báng nặng"],
  [/BulletLoops/, "Đai đạn"],
  [/CheekPad/, "Đệm má"],
  [/^UZI/, "Báng UZI"],
];
/** Loại súng phụ kiện dành cho, theo hậu tố trong id */
const SIZE: [RegExp, string][] = [
  [/_Large$|^AR_/, "AR/DMR"],
  [/_Medium$/, "SMG"],
  [/_SniperRifle$|^SniperRifle_/, "SR/DMR"],
];

const pretty = (s: string) => s.replace(/_\d+$/, "").replace(/_/g, " ");

export function attachmentLabel(id: string) {
  const { slot, name } = parse(id);
  if (slot === "Upper") return scopeLabel(id);
  const base = NAMES.find(([re]) => re.test(name))?.[1] ?? pretty(name);
  const size = slot === "Muzzle" || slot === "Magazine" ? SIZE.find(([re]) => re.test(name))?.[1] : undefined;
  return size ? `${base} (${size})` : base;
}

/* ------------------------------ vật phẩm ném ------------------------------ */

export type ThrowKind = "grenade" | "smoke" | "flash" | "molotov" | "sticky" | "c4" | "bluezone" | "launcher" | "flare" | "other";

export const THROW_KINDS: { key: ThrowKind; label: string }[] = [
  { key: "grenade", label: "Lựu đạn" },
  { key: "smoke", label: "Bom khói" },
  { key: "flash", label: "Lựu đạn choáng" },
  { key: "molotov", label: "Molotov" },
  { key: "sticky", label: "Bom dính" },
  { key: "c4", label: "C4" },
  { key: "bluezone", label: "Lựu đạn bo" },
  { key: "launcher", label: "Súng phóng M79" },
  { key: "flare", label: "Pháo sáng" },
  { key: "other", label: "Khác" },
];

export function throwKindOf(itemId = ""): ThrowKind {
  if (/SmokeBomb/.test(itemId)) return "smoke";
  if (/FlashBang/.test(itemId)) return "flash";
  if (/Molotov/.test(itemId)) return "molotov";
  if (/StickyGrenade/.test(itemId)) return "sticky";
  if (/C4/.test(itemId)) return "c4";
  if (/BluezoneGrenade/.test(itemId)) return "bluezone";
  if (/M79/.test(itemId)) return "launcher";
  if (/Flare/.test(itemId)) return "flare";
  if (/_Grenade_C$/.test(itemId)) return "grenade";
  return "other";
}
