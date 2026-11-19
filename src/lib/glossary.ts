/**
 * Giải thích các chỉ số — dùng cho tooltip và bảng "Giải thích chỉ số".
 */
export interface Term {
  /** Tên đầy đủ / viết tắt */
  title: string;
  /** Giải thích ngắn gọn */
  desc: string;
  /** Công thức hoặc cách đọc (tuỳ chọn) */
  formula?: string;
  /** Ví dụ cụ thể (tuỳ chọn) */
  example?: string;
}

export const GLOSSARY = {
  kd: {
    title: "K/D — Kill / Death",
    desc: "Số kill trung bình mỗi lần bị hạ. Lớn hơn 1 nghĩa là bạn kill nhiều hơn số lần chết.",
    formula: "Tổng kill ÷ (số trận − số trận thắng)",

    example: "12 kill, chết 6 lần → K/D = 2.0",
  },
  kda: {
    title: "KDA — (Kill + Assist) / Death",
    desc: "Giống K/D nhưng tính cả hỗ trợ, phản ánh tốt hơn mức đóng góp khi đánh cùng đội.",
    formula: "(Kill + Hỗ trợ) ÷ số lần chết",

    example: "10 kill + 5 hỗ trợ, chết 5 lần → KDA = 3.0",
  },
  adr: {
    title: "ADR — Average Damage per Round",
    desc: "Sát thương trung bình gây ra mỗi trận. Chỉ số quan trọng để đánh giá khả năng giao tranh, kể cả khi không lấy được kill.",
    formula: "Tổng sát thương ÷ số trận",

    example: "5 trận gây 1.000 sát thương → ADR = 200. Tham khảo: ~200 là khá, 300+ là rất mạnh.",
  },
  winRate: {
    title: "Win% — Tỉ lệ thắng",
    desc: "Tỉ lệ trận về Top 1 (Chicken Dinner).",
    formula: "Số trận thắng ÷ số trận",

    example: "Thắng 1 trong 10 trận → 10%",
  },
  top10Rate: {
    title: "Top10% — Tỉ lệ vào Top 10",
    desc: "Tỉ lệ trận sống sót tới Top 10. Thể hiện khả năng đọc bo và giữ mạng.",
    formula: "Số lần Top 10 ÷ số trận",

    example: "4 trong 10 trận vào Top 10 → 40%",
  },
  hsRate: {
    title: "HS% — Tỉ lệ headshot",
    desc: "Phần trăm kill bằng phát bắn vào đầu. Cao = tâm ngắm tốt.",
    formula: "Kill headshot ÷ tổng kill",

    example: "20 kill, 5 kill headshot → 25%",
  },
  avgKills: {
    title: "Kill / trận",
    desc: "Số kill trung bình mỗi trận.",
    formula: "Tổng kill ÷ số trận",

    example: "3 trận được 3, 1, 5 kill → 3 kill/trận",
  },
  wins: { title: "Top 1 — Chicken Dinner", desc: "Số trận giành chiến thắng (đội bạn là đội cuối cùng sống sót)." },
  rounds: { title: "Trận", desc: "Số trận đã chơi ở chế độ và mùa đang chọn." },
  kills: { title: "Kill", desc: "Số đối thủ bị bạn kết liễu." },
  dBNOs: {
    title: "Knock — DBNO (Down But Not Out)",
    desc: "Số lần bạn bắn gục đối thủ (ngã xuống nhưng chưa chết). Chỉ có ở Duo/Squad.",
  },
  assists: { title: "Hỗ trợ (Assist)", desc: "Bạn gây sát thương cho đối thủ nhưng đồng đội là người kết liễu." },
  revives: { title: "Cứu đồng đội (Revive)", desc: "Số lần đỡ đồng đội đang bị gục đứng dậy." },
  longestKill: { title: "Kill xa nhất", desc: "Khoảng cách xa nhất bạn từng kill được một đối thủ." },
  roundMostKills: { title: "Max kill", desc: "Số kill nhiều nhất trong một trận." },
  maxKillStreaks: { title: "Chuỗi kill", desc: "Số kill liên tiếp nhiều nhất trong thời gian ngắn (theo cách tính của PUBG)." },
  avgSurvival: {
    title: "Sống sót TB",
    desc: "Thời gian sống trung bình mỗi trận.",
    formula: "Tổng thời gian sống ÷ số trận",
  },
  boosts: { title: "Doping (Boost)", desc: "Vật phẩm tăng lực: nước tăng lực, thuốc giảm đau, adrenaline." },
  heals: { title: "Hồi máu", desc: "Số lần dùng băng gạc, bộ sơ cứu, hộp y tế." },
  rp: {
    title: "RP — Rank Point",
    desc: "Điểm rank. Thắng/top cao và kill nhiều sẽ tăng RP; RP quyết định bậc rank (Bronze → Master).",
  },
  avgRank: { title: "Hạng TB", desc: "Thứ hạng trung bình khi kết thúc trận. Số càng nhỏ càng tốt." },
  tier: {
    title: "Bậc rank",
    desc: "Bronze → Silver → Gold → Platinum → Crystal → Diamond → Master. Mỗi bậc (trừ Master) chia làm 5 → 1.",
  },
  tppFpp: {
    title: "TPP / FPP",
    desc: "TPP: góc nhìn thứ ba (thấy được nhân vật). FPP: góc nhìn thứ nhất (qua mắt nhân vật).",
  },
  humanBot: {
    title: "Người / Bot",
    desc: "Trận thường của PUBG có thêm bot (AI) để lấp chỗ. Telemetry ghi lại từng lần kill/knock/sát thương kèm mã tài khoản nạn nhân — mã bot bắt đầu bằng \"ai.\" nên tách được kill người và kill bot.",
    example: "Kill người 3 · bot 2 → 60% kill là người thật",
  },
  weaponMastery: {
    title: "Weapon Mastery",
    desc: "PUBG ghi lại thống kê riêng cho từng khẩu súng suốt cả sự nghiệp — không chia theo mùa hay chế độ. Đây cũng là nguồn số liệu của mục Vũ khí.",
    example: "Beryl: 412 kill · 380 knock · 61.200 sát thương",
  },
  weaponLevel: {
    title: "Level súng",
    desc: "Cấp thành thạo của khẩu súng (1–100). Tăng dần khi bạn gây sát thương, knock và kill bằng súng đó.",
  },
  weaponKnocks: {
    title: "Knock (theo súng)",
    desc: "Số lần đánh gục (DBNO) đối thủ bằng khẩu súng này. Knock nhiều nhưng kill ít = hay bị đồng đội đối phương cứu hoặc nhường kill cho đồng đội.",
  },
  weaponLongest: {
    title: "Kill xa nhất (theo súng)",
    desc: "Khoảng cách xa nhất bạn từng kill được đối thủ bằng khẩu súng này.",
  },
  weaponStyle: {
    title: "Phong cách",
    desc: "Tỉ lệ kill theo từng nhóm súng: AR (súng trường), DMR (bắn tỉa bán tự động), Sniper (bắn tỉa từng phát), SMG (tiểu liên), Shotgun, LMG (súng máy)… Cho thấy ai thích đánh gần, ai thích bắn xa.",
    formula: "Kill bằng nhóm súng ÷ tổng kill bằng súng",
  },
  together: {
    title: "Chơi chung",
    desc: "Gộp lịch sử ~14 ngày gần nhất của mọi người trong đội hình (giới hạn PUBG lưu). Chỉ tính trận thường & rank battle royale, bỏ custom/arcade. Hai người cùng teamId trong một trận = chơi chung.",
  },
  lineup: {
    title: "Đội hình",
    desc: "Tổ hợp người quen cùng đội trong một trận. Chỗ trống còn lại là người lạ ghép ngẫu nhiên (random).",
    example: "A + B: 12 trận · hạng TB #8 · top 10 58%",
  },
  hotDrop: {
    title: "Nhảy đông",
    desc: "Số người chơi thật (không tính bot, không tính đồng đội) tiếp đất trong bán kính 300 m quanh bạn. Càng cao = càng hay nhảy chỗ \"hot\", đánh nhau ngay đầu trận.",
  },
  earlyDeath: {
    title: "Chết sớm",
    desc: "Tỉ lệ trận bị hạ trong vòng 3 phút sau khi tiếp đất.",
    formula: "Số trận chết ≤ 3 phút sau khi đáp ÷ số trận đã đáp",
  },
  place: { title: "Thứ hạng trận", desc: "#1 là thắng. Số sau dấu / là tổng số đội trong trận." },
  trade: {
    title: "Trả đòn (trade)",
    desc: "Khi 1 thành viên bị địch knock/giết mà vẫn còn đồng đội đứng được, đội có knock hoặc giết lại 1 người của chính đội địch đó trong vòng 10 giây không. Thấp nghĩa là đang bị bắt lẻ từng người.",
    formula: "Số lần trả đòn ÷ số lần bị địch hạ khi còn đồng đội đứng",
    example: "Bị hạ 4 lần, 2 lần đồng đội hạ lại địch ngay → 50%",
  },
  reviveRate: {
    title: "Tỉ lệ được cứu",
    desc: "Trong các lần bị knock, bao nhiêu lần được đồng đội cứu dậy thay vì bị kết liễu / chảy máu chết. Phản ánh khả năng giữ khu vực và dùng smoke để cứu.",
    formula: "Số lần được cứu ÷ số lần bị knock (đã rõ kết cục)",
  },
  mateDistance: {
    title: "Đồng đội gần nhất lúc bị hạ",
    desc: "Khoảng cách từ người bị địch hạ tới đồng đội còn đứng gần nhất, lấy trung vị. Xa quá thì không ai kịp cứu hay bắn hỗ trợ.",
    example: "≤ 25 m: sát cánh · 25–60 m: tạm ổn · > 60 m: quá xa",
  },
  teamSpread: {
    title: "Độ tản đội",
    desc: "Khoảng cách trung bình từ mỗi thành viên tới đồng đội gần nhất, lấy mẫu mỗi 10 giây sau khi cả đội tiếp đất. Kèm % thời gian có người cách đồng đội hơn 150 m (đi lẻ).",
  },
  thirdParty: {
    title: "Bên thứ ba",
    desc: "Bị 1 đội đánh vào trong lúc vừa đọ súng với 1 đội khác (trong vòng 20 giây). Hay bị bên thứ ba nghĩa là giao tranh kéo dài quá lâu hoặc đánh ở chỗ trống trải.",
  },
  fightWin: {
    title: "Thắng giao tranh",
    desc: "Mỗi trận đánh = chuỗi trao đổi sát thương / knock giữa đội bạn và 1 đội địch, cách nhau không quá 30 giây. Thắng khi hạ được nhiều người hơn số người bị mất. Chỉ tính trận có người bị hạ, tách riêng đội người thật và đội bot.",
    formula: "Trận thắng ÷ trận có người bị hạ",
  },
  firstHit: {
    title: "Bắn trước",
    desc: "Trong các trận đánh với đội người thật, bên nào gây sát thương trước. Đội bắn trước thường thắng — chỉ số này phản ánh quan sát, chọn góc và giữ im lặng.",
    example: "Thắng 8/8 khi bắn trước nhưng 2/7 khi bị bắn trước → nên chủ động phát hiện địch sớm hơn",
  },
  dmgRatio: {
    title: "Sát thương gây / nhận",
    desc: "Tổng sát thương đội gây cho đội người thật chia cho sát thương nhận từ họ. ADR chỉ nhìn 1 chiều; tỉ lệ dưới 1 nghĩa là đang thua đọ súng.",
    formula: "Gây ÷ Nhận (chỉ tính đối thủ là người)",
  },
  knockConvert: {
    title: "Knock → kill",
    desc: "Trong các lần đội bạn knock được địch, bao nhiêu lần địch bị kết liễu thay vì được đồng đội họ cứu dậy.",
    formula: "Bị kết liễu ÷ (bị kết liễu + được cứu)",
  },
  rangeSplit: {
    title: "Theo tầm bắn",
    desc: "Sát thương gây/nhận và số knock chia theo khoảng cách giữa người bắn và người trúng. Cho biết đội mạnh/yếu ở tầm nào để chọn súng và cách áp sát.",
  },
  zoneEntry: {
    title: "Vào bo",
    desc: "Mỗi vòng bo: lúc vòng trắng (vùng an toàn kế tiếp) xuất hiện, mỗi thành viên vào được bên trong vòng trắng sớm hơn lúc bo xanh khép tới bao nhiêu giây. Số âm = vào sau khi bo đã khép (chạy bo, mất máu).",
    formula: "Lúc bo khép − lúc lần đầu đứng trong vòng trắng",
    example: "+60s: vào sớm 1 phút · +10s: sát giờ · −30s: chạy bo 30 giây",
  },
  blueDamage: {
    title: "Sát thương bo",
    desc: "Máu mất do đứng ngoài bo xanh, trung bình mỗi thành viên. Cao nghĩa là xoay vị trí muộn hoặc bị kẹt ngoài bo.",
  },
  outsideTime: {
    title: "Thời gian ngoài bo",
    desc: "Tổng thời gian đứng trong vùng xanh (ngoài vùng an toàn), trung bình mỗi thành viên. Lấy mẫu mỗi 10 giây.",
  },
  vehicleTime: {
    title: "Đi xe",
    desc: "Thời gian ngồi xe (không tính máy bay), trung bình mỗi thành viên, kèm số lần bị hạ khi đang trên xe.",
  },
  lootSpeed: {
    title: "Tốc độ loot",
    desc: "Số giây từ lúc tiếp đất tới lúc có súng chính, giáp cấp 2+ và mũ cấp 2+ (trung vị các thành viên). Loot chậm ở điểm nhảy đông người thường dẫn tới chết sớm — cân nhắc đổi điểm nhảy.",
    example: "Súng ≤ 15s, giáp/mũ cấp 2 ≤ 1 phút là nhanh",
  },
  utility: {
    title: "Vật phẩm ném",
    desc: "Số lựu đạn, smoke, molotov, flash đã dùng và sát thương gây bằng chúng. Đội mạnh dùng lựu đạn để ép địch ra khỏi chỗ nấp và smoke để che khi cứu / di chuyển.",
  },
  smokeRevive: {
    title: "Cứu có smoke",
    desc: "Trong các lần cứu đồng đội, bao nhiêu lần có thành viên thả smoke trong vòng 20 giây trước khi cứu xong.",
    formula: "Lần cứu có smoke ÷ tổng lần cứu",
  },
} satisfies Record<string, Term>;

export type TermKey = keyof typeof GLOSSARY;

/** Thứ tự hiển thị trong bảng giải thích */
export const GLOSSARY_GROUPS: { title: string; keys: TermKey[] }[] = [
  { title: "Chỉ số chính", keys: ["kd", "kda", "adr", "winRate", "top10Rate", "hsRate", "avgKills"] },
  { title: "Chiến đấu", keys: ["humanBot", "dBNOs", "assists", "longestKill", "roundMostKills", "maxKillStreaks"] },
  { title: "Sinh tồn & đồng đội", keys: ["avgSurvival", "revives", "heals", "boosts"] },
  { title: "Vũ khí", keys: ["weaponMastery", "weaponLevel", "weaponKnocks", "weaponLongest", "weaponStyle"] },
  { title: "Chơi chung & nhảy dù", keys: ["together", "lineup", "hotDrop", "earlyDeath"] },
  { title: "Rank & chế độ", keys: ["rp", "tier", "avgRank", "tppFpp", "place"] },
  { title: "Phối hợp đội (telemetry)", keys: ["trade", "reviveRate", "mateDistance", "teamSpread", "thirdParty"] },
  { title: "Giao tranh (telemetry)", keys: ["fightWin", "firstHit", "dmgRatio", "knockConvert", "rangeSplit"] },
  { title: "Bo & di chuyển (telemetry)", keys: ["zoneEntry", "blueDamage", "outsideTime", "vehicleTime"] },
  { title: "Loot & vật phẩm (telemetry)", keys: ["lootSpeed", "utility", "smokeRevive"] },
];
