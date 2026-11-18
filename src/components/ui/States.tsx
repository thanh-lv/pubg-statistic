import { AlertTriangle, Clock, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const e = error instanceof ApiError ? error : null;
  const rateLimited = e?.status === 429;
  return (
    <div className={cn("card flex flex-col items-center gap-3 px-6 py-10 text-center", className)}>
      <div className="grid size-12 place-items-center rounded-2xl bg-loss/10 text-loss">
        {rateLimited ? <Clock className="size-6" /> : <AlertTriangle className="size-6" />}
      </div>
      <div>
        <p className="font-semibold">{rateLimited ? "PUBG API đang bận" : "Không tải được dữ liệu"}</p>
        <p className="mt-1 max-w-md text-sm text-fg-muted">
          {e?.message ?? "Đã xảy ra lỗi."}
          {rateLimited && e?.retryAfter ? ` Thử lại sau khoảng ${e.retryAfter}s.` : ""}
        </p>
      </div>
      {onRetry && (
        <button className="btn-ghost" onClick={onRetry}>
          <RefreshCw className="size-4" /> Thử lại
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card flex flex-col items-center gap-4 px-6 py-14 text-center", className)}>
      <div className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">{icon}</div>
      <div>
        <p className="font-display text-xl font-semibold">{title}</p>
        {children && <div className="mx-auto mt-1.5 max-w-md text-sm text-fg-muted">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function UpdatedAt({ at, stale, fetching }: { at?: number; stale?: boolean; fetching?: boolean }) {
  if (!at) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", stale ? "text-amber-300" : "text-fg-subtle")}>
      <span className={cn("size-1.5 rounded-full", fetching ? "animate-pulse bg-accent" : stale ? "bg-amber-300" : "bg-win")} />
      {stale ? "Dữ liệu cũ · " : "Cập nhật "}
      {timeAgo(at)}
    </span>
  );
}
