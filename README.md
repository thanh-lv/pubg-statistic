# Squad Stats — Thống kê PUBG cho bạn & đồng đội

Website xem nhanh thống kê PUBG của bạn và bạn bè mà không cần mở game. Chạy trên **Cloudflare Workers** (miễn phí), share link cho cả hội.

**Tính năng**

- **Đội hình**: bảng xếp hạng (K/D, ADR, Win%, Top10%, HS%…), danh hiệu (Sát thủ, Vua gà, Máy dame…), biểu đồ so sánh
- **Người chơi**: rank (tier, RP, KDA), thống kê theo từng chế độ, phong độ ~14 ngày gần nhất, lịch sử trận
- **Trận đấu**: thông tin đồng đội, top sát thủ, top 10 đội
- **Giải thích chỉ số**: tooltip có hình minh hoạ + công thức + ví dụ cho từng chỉ số
- Chọn mùa / toàn thời gian, Squad/Duo/Solo, TPP/FPP; tìm bất kỳ người chơi nào
- Chia sẻ đội hình bằng link `?p=Ten1,Ten2,…`
- Avatar là mũ bảo hiểm PUBG (Lv1/Lv2/Lv3). Bấm vào avatar để đổi mũ, hoặc cố định trong `squad.ts` → `helmets`

## Công nghệ

| Phần     | Công nghệ                                                                 |
| --------- | --------------------------------------------------------------------------- |
| Frontend  | React 19, React Router, TanStack Query, Tailwind CSS v4, Lucide             |
| Backend   | Cloudflare Worker (`worker/`), proxy tới PUBG API, giữ API key bí mật |
| Build/Dev | Vite + `@cloudflare/vite-plugin` (1 lệnh `npm run dev` chạy cả 2)    |

## Cấu trúc thư mục

```
├── worker/              # Cloudflare Worker: /api/*
│   ├── index.ts         #   router + validate input
│   ├── pubg.ts          #   gọi PUBG API & rút gọn dữ liệu
│   └── cache.ts         #   cache 3 tầng (memory → Cache API → KV)
├── shared/types.ts      # kiểu dữ liệu dùng chung worker ↔ frontend
├── src/
│   ├── config/squad.ts  # ⚙️ đội hình mặc định — sửa ở đây
│   ├── pages/           # SquadPage, PlayerPage, MatchPage
│   ├── components/      # layout/ ui/ squad/ player/ match/
│   ├── hooks/           # data hooks (React Query), state đội hình
│   ├── lib/             # api client, format số, công thức chỉ số, glossary
│   └── styles/index.css # theme Tailwind (màu, font, component class)
├── public/              # favicon, avatars/helmets/ (ảnh mũ từ pubg/api-assets)
└── wrangler.jsonc       # cấu hình Cloudflare
```

## Bắt đầu

### 1. Lấy PUBG API key

Đăng ký miễn phí tại [https://developer.pubg.com](https://developer.pubg.com), tạo app và copy API key.

### 2. Chạy local

```bash
npm install
cp .dev.vars.example .dev.vars   # rồi dán API key vào
npm run dev                      # http://localhost:5173
```

### 3. Điền đội hình mặc định

Sửa `src/config/squad.ts`:

```ts
players: ["TenCuaBan", "BanBe1", "BanBe2"],   // tên in-game, phân biệt HOA/thường
shard: "steam",                               // steam | kakao | psn | xbox | console
defaultMode: "squad",                         // squad | squad-fpp | duo | ...
```

Người xem vẫn có thể tự thêm/bớt trên giao diện (nút **Đội hình**). Danh sách đó được lưu trong trình duyệt của họ.

### 4. Deploy lên Cloudflare

```bash
npx wrangler login
npx wrangler secret put PUBG_API_KEY     # dán API key
npm run deploy
```

Xong. Bạn sẽ có link dạng `https://pubg-squad-stats.<tên-bạn>.workers.dev`. Có thể gắn domain riêng trong Cloudflare Dashboard → Workers → Settings → Domains & Routes.

> **API key bị mất sau mỗi lần deploy?** Key phải được lưu dạng **Secret**, không phải biến thường ("Text").
> Dùng `npx wrangler secret put PUBG_API_KEY`, hoặc trên Dashboard: Worker → Settings → Variables and Secrets → Add → Type **Secret**.
> Đừng đặt ở mục *Build variables* (chỉ dùng lúc build, Worker không đọc được). File `wrangler.jsonc` đã bật `keep_vars: true` để deploy không xoá biến trên Dashboard.

### 5. (Khuyến nghị) Bật KV cache

PUBG API giới hạn **10 request/phút**. Worker đã cache trong bộ nhớ, nhưng nên bật KV để cache bền hơn khi nhiều bạn cùng vào:

```bash
npx wrangler kv namespace create PUBG_CACHE
```

Copy `id` vào `wrangler.jsonc` (bỏ comment dòng `kv_namespaces`) rồi `npm run deploy` lại.

> Lưu ý: Cache API của Cloudflare không hoạt động trên domain `*.workers.dev`, nên khi không dùng domain riêng thì KV càng quan trọng.

## API của Worker

| Endpoint                                             | Mô tả                             | Cache    |
| ---------------------------------------------------- | ----------------------------------- | -------- |
| `GET /api/players?names=a,b`                       | Tra người chơi theo tên (≤30)  | 5 phút  |
| `GET /api/seasons`                                 | Danh sách mùa                     | 12 giờ  |
| `GET /api/squad-stats?ids=…&season=…&mode=squad` | Stats cả đội 1 chế độ (batch) | 10 phút |
| `GET /api/player/:id/season/:season`               | Stats 1 người, mọi chế độ     | 10 phút |
| `GET /api/player/:id/ranked/:season`               | Stats rank                          | 10 phút |
| `GET /api/matches/:id`                             | Chi tiết trận (đã rút gọn)    | 30 ngày |

Tất cả đều nhận `?shard=steam|kakao|psn|xbox|console`. `season` là id mùa hoặc `lifetime`. Khi PUBG API trả lỗi 429/5xx, Worker trả lại dữ liệu cache cũ (`meta.stale: true`) thay vì báo lỗi.

## Scripts

| Lệnh               | Việc                                 |
| ------------------- | ------------------------------------- |
| `npm run dev`     | Dev server (frontend + worker)        |
| `npm run build`   | Typecheck + build                     |
| `npm run preview` | Build rồi chạy thử bản production |
| `npm run deploy`  | Build + deploy lên Cloudflare        |

---

Dữ liệu từ PUBG Developer API. Ảnh mũ bảo hiểm lấy từ [pubg/api-assets](https://github.com/pubg/api-assets) — tài nguyên chính thức dành cho developer, sử dụng theo [PUBG API Terms of Use](https://developer.pubg.com/tos). Dự án cá nhân, không liên kết với KRAFTON.
