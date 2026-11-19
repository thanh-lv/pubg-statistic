import { Outlet } from "react-router";
import { Header } from "./Header";

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="border-t border-white/5 py-6 text-center text-xs text-fg-subtle">
        Dữ liệu & hình ảnh vật phẩm từ PUBG Developer API · Trang không liên kết với KRAFTON
      </footer>
    </div>
  );
}
