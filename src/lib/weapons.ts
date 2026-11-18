/**
 * Từ điển vũ khí: tên hiển thị (theo dictionaries/telemetry/item/itemId.json của pubg/api-assets),
 * nhóm súng và ảnh (public/weapons/<id>.webp, thu nhỏ từ Assets/Icons/Item/Weapon).
 */

export type WeaponCategory = "AR" | "DMR" | "SR" | "SMG" | "SG" | "LMG" | "Pistol" | "Other";

export const WEAPON_CATEGORIES: { key: WeaponCategory; label: string; full: string; color: string }[] = [
  { key: "AR", label: "AR", full: "Súng trường tấn công", color: "#f5a524" },
  { key: "DMR", label: "DMR", full: "Súng trường bắn tỉa bán tự động", color: "#38bdf8" },
  { key: "SR", label: "Sniper", full: "Súng bắn tỉa", color: "#a78bfa" },
  { key: "SMG", label: "SMG", full: "Súng tiểu liên", color: "#34d399" },
  { key: "SG", label: "Shotgun", full: "Súng săn / shotgun", color: "#f472b6" },
  { key: "LMG", label: "LMG", full: "Súng máy hạng nhẹ", color: "#fb923c" },
  { key: "Pistol", label: "Lục", full: "Súng lục", color: "#94a3b8" },
  { key: "Other", label: "Khác", full: "Cận chiến, lựu đạn, nỏ…", color: "#64748b" },
];

export const CATEGORY_OF = Object.fromEntries(WEAPON_CATEGORIES.map((c) => [c.key, c])) as Record<
  WeaponCategory,
  (typeof WEAPON_CATEGORIES)[number]
>;

/** [tên, nhóm, ảnh (nếu khác id)] */
const W: Record<string, [string, WeaponCategory, string?]> = {
  // AR
  Item_Weapon_ACE32_C: ["ACE32", "AR"],
  Item_Weapon_AK47_C: ["AKM", "AR"],
  Item_Weapon_AUG_C: ["AUG", "AR"],
  Item_Weapon_BerylM762_C: ["Beryl M762", "AR"],
  Item_Weapon_FAMASG2_C: ["FAMAS", "AR"],
  Item_Weapon_G36C_C: ["G36C", "AR"],
  Item_Weapon_Groza_C: ["Groza", "AR"],
  Item_Weapon_HK416_C: ["M416", "AR"],
  Item_Weapon_Duncans_M416_C: ["M416", "AR", "Item_Weapon_HK416_C"],
  Item_Weapon_K2_C: ["K2", "AR"],
  Item_Weapon_M16A4_C: ["M16A4", "AR"],
  Item_Weapon_Mk47Mutant_C: ["Mk47 Mutant", "AR"],
  Item_Weapon_QBZ95_C: ["QBZ", "AR"],
  "Item_Weapon_SCAR-L_C": ["SCAR-L", "AR"],
  // DMR
  Item_Weapon_Dragunov_C: ["Dragunov", "DMR"],
  Item_Weapon_FNFal_C: ["SLR", "DMR"],
  Item_Weapon_Mini14_C: ["Mini 14", "DMR"],
  Item_Weapon_Mk12_C: ["Mk12", "DMR"],
  Item_Weapon_Mk14_C: ["Mk14 EBR", "DMR"],
  Item_Weapon_QBU88_C: ["QBU", "DMR"],
  Item_Weapon_Mads_QBU88_C: ["QBU", "DMR", "Item_Weapon_QBU88_C"],
  Item_Weapon_SKS_C: ["SKS", "DMR"],
  Item_Weapon_VSS_C: ["VSS", "DMR"],
  // SR
  Item_Weapon_AWM_C: ["AWM", "SR"],
  Item_Weapon_Kar98k_C: ["Kar98k", "SR"],
  Item_Weapon_L6_C: ["Lynx AMR", "SR"],
  Item_Weapon_M24_C: ["M24", "SR"],
  Item_Weapon_Mosin_C: ["Mosin-Nagant", "SR"],
  Item_Weapon_Win1894_C: ["Win94", "SR"],
  // SMG
  Item_Weapon_BizonPP19_C: ["PP-19 Bizon", "SMG"],
  Item_Weapon_JS9_C: ["JS9", "SMG"],
  Item_Weapon_MP5K_C: ["MP5K", "SMG"],
  Item_Weapon_MP9_C: ["MP9", "SMG"],
  Item_Weapon_P90_C: ["P90", "SMG"],
  Item_Weapon_Thompson_C: ["Tommy Gun", "SMG"],
  Item_Weapon_UMP_C: ["UMP45", "SMG"],
  Item_Weapon_UZI_C: ["Micro UZI", "SMG"],
  Item_Weapon_Vector_C: ["Vector", "SMG"],
  // Shotgun
  Item_Weapon_Berreta686_C: ["S686", "SG"],
  Item_Weapon_DP12_C: ["DBS", "SG"],
  Item_Weapon_OriginS12_C: ["O12", "SG"],
  Item_Weapon_Saiga12_C: ["S12K", "SG"],
  Item_Weapon_Winchester_C: ["S1897", "SG"],
  Item_Weapon_Sawnoff_C: ["Sawed-off", "SG"],
  // LMG
  Item_Weapon_DP28_C: ["DP-28", "LMG"],
  Item_Weapon_M249_C: ["M249", "LMG"],
  Item_Weapon_MG3_C: ["MG3", "LMG"],
  Item_Weapon_RPD_C: ["RPD", "LMG"],
  // Pistol
  Item_Weapon_DesertEagle_C: ["Deagle", "Pistol"],
  Item_Weapon_G18_C: ["P18C", "Pistol"],
  Item_Weapon_M1911_C: ["P1911", "Pistol"],
  Item_Weapon_M9_C: ["P92", "Pistol"],
  Item_Weapon_NagantM1895_C: ["R1895", "Pistol"],
  Item_Weapon_Rhino_C: ["R45", "Pistol"],
  Item_Weapon_vz61Skorpion_C: ["Skorpion", "Pistol"],
  Item_Weapon_FlareGun_C: ["Flare Gun", "Pistol"],
  // Khác
  Item_Weapon_Crossbow_C: ["Nỏ (Crossbow)", "Other"],
  Item_Weapon_PanzerFaust100M_C: ["Panzerfaust", "Other"],
  Item_Weapon_M79_C: ["M79", "Other"],
  Item_Weapon_Mortar_C: ["Súng cối", "Other"],
  Item_Weapon_Pan_C: ["Chảo", "Other"],
  Item_Weapon_Machete_C: ["Mã tấu", "Other"],
  Item_Weapon_Cowbar_C: ["Xà beng", "Other"],
  Item_Weapon_Sickle_C: ["Liềm", "Other"],
  Item_Weapon_Grenade_C: ["Lựu đạn", "Other"],
  Item_Weapon_Grenade_Warmode_C: ["Lựu đạn", "Other", "Item_Weapon_Grenade_C"],
  Item_Weapon_Molotov_C: ["Molotov", "Other"],
  Item_Weapon_StickyGrenade_C: ["Bom dính", "Other"],
  Item_Weapon_C4_C: ["C4", "Other"],
};

export interface WeaponInfo {
  id: string;
  name: string;
  category: WeaponCategory;
  /** null = không có ảnh → dùng icon mặc định */
  icon: string | null;
}

const cache = new Map<string, WeaponInfo>();

export function weaponInfo(id: string): WeaponInfo {
  let info = cache.get(id);
  if (info) return info;
  const known = W[id];
  info = known
    ? { id, name: known[0], category: known[1], icon: `/weapons/${known[2] ?? id}.webp` }
    : { id, name: id.replace(/^Item_Weapon_/, "").replace(/_C$/i, "").replace(/_/g, " "), category: "Other", icon: null };
  cache.set(id, info);
  return info;
}
