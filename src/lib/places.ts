/**
 * Tên địa danh: telemetry ghi dạng viết liền chữ thường (vd. "sosnovkamilitarybase", "yasnayapolyana").
 * Danh sách dưới đây dùng để hiển thị đẹp; tên lạ sẽ được viết hoa chữ cái đầu.
 */
const NAMES = [
  // Erangel
  "Pochinki", "School", "Rozhok", "Yasnaya Polyana", "Georgopol", "Gatka", "Zharki", "Severny", "Stalber",
  "Kameshki", "Lipovka", "Mylta", "Mylta Power", "Primorsk", "Ferry Pier", "Quarry", "Shooting Range",
  "Prison", "Mansion", "Novorepnoye", "Hospital", "Shelter", "Farm", "Ruins", "Boatyard", "Water Town",
  // Miramar
  "Los Leones", "Pecado", "San Martín", "El Pozo", "El Azahar", "Monte Nuevo", "Chumacera", "Alcantara",
  "Cantera", "Brickyard", "Graveyard", "Power Grid", "Truck Stop", "Valle del Mar", "Water Treatment",
  "Hacienda del Patrón", "La Cobrería", "Impala", "Puerto Paraíso", "Los Higos", "Campo Militar",
  "Torre Ahumada", "Tierra Bronca", "La Bendita", "Junkyard", "Ladrillera",
  // Taego
  "Army Base", "Fishing Camp", "Go Dok", "Ha Po", "Ho San", "Ho San Prison", "Palace", "Shipyard", "Terminal",
  "Yong Cheon", "Kang Neung", "Song Am", "Wol Song", "Buk San Sa", "Airport", "Hae Moo Sa", "Sahwa",
  // Rondo
  "NEOX Factory", "Test Track", "Jadena City", "Yu Lin", "Mey Ran", "Jao Tin", "Lo Hua Xing", "Mu Ho Pan",
  "Fong Tun", "Tin Long Garden", "Rin Jiang", "Stadium",
  // Sanhok
  "Bootcamp", "Paradise Resort", "Camp Alpha", "Camp Bravo", "Camp Charlie", "Pai Nan", "Ha Tinh", "Tat Mok",
  "Khao", "Lakawi", "Kampong", "Ban Tai", "Docks", "Mongnai", "Sahmee", "Na Kham", "Cave", "Tambang",
  // Vikendi
  "Castle", "Dino Park", "Cosmodrome", "Volnova", "Goroka", "Podvosto", "Villa", "Cement Factory", "Trevno",
  "Krichas", "Peshkova", "Zabava", "Port", "Movatra", "Hot Springs", "Abbey", "Lumber Yard", "Dobro Mesto",
  "Milnar", "Tovar", "Coal Mine", "Winery", "Sawmill",
  // Deston
  "Ripton", "Buxley", "Hydroelectric Dam", "Arena", "Assembly", "Lodge", "Barclift", "Holloway", "Wellspring",
  "Turrita", "Los Arcos", "Sandy Port",
];

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const BY_KEY = new Map<string, string>(NAMES.map((n) => [key(n.normalize("NFD").replace(/\p{Diacritic}/gu, "")), n]));
// Biến thể tên trong telemetry
BY_KEY.set("sosnovkamilitarybase", "Military Base");
BY_KEY.set("militarybase", "Military Base");
BY_KEY.set("manisgenerales", "Minas Generales");
BY_KEY.set("hosan", "Ho San");
BY_KEY.set("hosanprison", "Ho San Prison");
BY_KEY.set("neoxfactory", "NEOX Factory");
BY_KEY.set("lawaki", "Lakawi");

/** Khu vực không phải địa danh thật (điểm sự kiện, sân khấu…) */
export const IGNORED_ZONE = /eventspot|emotestage/i;

export function placeName(zone: string | null): string {
  if (!zone) return "Ngoài địa danh";
  return BY_KEY.get(key(zone)) ?? zone.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
