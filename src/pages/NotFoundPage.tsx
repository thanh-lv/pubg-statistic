import { Compass } from "lucide-react";
import { Link } from "react-router";
import { EmptyState } from "@/components/ui/States";

export function NotFoundPage() {
  return (
    <EmptyState
      icon={<Compass className="size-7" />}
      title="Lạc vào vùng bo rồi!"
      className="mx-auto mt-10 max-w-xl"
      action={<Link to="/" className="btn-primary">Về trang chủ</Link>}
    >
      Trang bạn tìm không tồn tại.
    </EmptyState>
  );
}
