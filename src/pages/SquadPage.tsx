import { Check, Link2, Save, UserPlus, UserX, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Filters } from "@/components/layout/Filters";
import { Awards } from "@/components/squad/Awards";
import { CompareBars } from "@/components/squad/CompareBars";
import { Leaderboard } from "@/components/squad/Leaderboard";
import { WeaponCompare } from "@/components/squad/WeaponCompare";
import type { SquadRow } from "@/components/squad/types";
import { Glossary } from "@/components/ui/Glossary";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState, UpdatedAt } from "@/components/ui/States";
import { usePlayers, useResolvedSeason, useSquadStats } from "@/hooks/queries";
import { useSquad } from "@/hooks/useSquad";
import { MODE_LABELS, PLAYER_COLORS } from "@/lib/constants";
import { derive } from "@/lib/stats";

export function SquadPage() {
  const squad = useSquad();
  const { players, mode, isShared } = squad;
  const { resolved, seasons } = useResolvedSeason();

  const playersQ = usePlayers(players);
  const found = playersQ.data?.data.players ?? [];
  const ids = useMemo(() => found.map((p) => p.id), [found]);
  const statsQ = useSquadStats(ids, resolved, mode);

  const rows: SquadRow[] = useMemo(
    () =>
      found.map((p, i) => ({
        id: p.id,
        name: p.name,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        d: derive(statsQ.data?.data.stats[p.id]),
      })),
    [found, statsQ.data],
  );

  const seasonLabel =
    resolved === "lifetime" ? "Toàn thời gian" : (seasons.data?.data.find((s) => s.id === resolved)?.label ?? "");

  if (players.length === 0) {
    return (
      <EmptyState
        icon={<Users className="size-7" />}
        title="Chưa có ai trong đội hình"
        className="mx-auto mt-10 max-w-xl"
        action={
          <button className="btn-primary" onClick={() => squad.setManageOpen(true)}>
            <UserPlus className="size-4" /> Thêm người chơi
          </button>
        }
      >
        Thêm tên in-game của bạn và bạn bè để xem bảng xếp hạng, so sánh K/D, sát thương, tỉ lệ thắng… Bạn cũng có thể tìm
        một người chơi bất kỳ ở ô tìm kiếm phía trên.
      </EmptyState>
    );
  }

  const error = playersQ.error ?? statsQ.error ?? seasons.error;
  const loading = playersQ.isPending || (ids.length > 0 && (statsQ.isPending || !resolved));
  const meta = statsQ.data?.meta ?? playersQ.data?.meta;

  return (
    <div className="space-y-6">
      {isShared && <SharedBanner />}

      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
            {MODE_LABELS[mode]} · {seasonLabel}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
            {isShared ? "Đội hình được chia sẻ" : "Đội hình của tôi"}
            <span className="ml-2 text-fg-subtle">{players.length}</span>
          </h1>
          <div className="mt-1.5">
            <UpdatedAt at={meta?.fetchedAt} stale={meta?.stale} fetching={playersQ.isFetching || statsQ.isFetching} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filters />
          <ShareButton />
        </div>
      </section>

      {playersQ.data && playersQ.data.data.notFound.length > 0 && <NotFound names={playersQ.data.data.notFound} />}

      {error && !playersQ.data ? (
        <ErrorState error={error} onRetry={() => (playersQ.refetch(), statsQ.refetch())} />
      ) : loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {statsQ.error && <ErrorState error={statsQ.error} onRetry={() => statsQ.refetch()} />}
          <Awards rows={rows} />
          <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
            <Leaderboard rows={rows} />
            <CompareBars rows={rows} />
          </div>
          <WeaponCompare rows={rows} />
          <Glossary />
        </>
      )}
    </div>
  );
}

function SharedBanner() {
  const { saveShared, leaveShared } = useSquad();
  return (
    <div className="card flex flex-col gap-3 border-accent/25 bg-accent/[0.06] p-4 sm:flex-row sm:items-center">
      <Link2 className="size-5 shrink-0 text-accent" />
      <p className="flex-1 text-sm">Bạn đang xem đội hình từ link chia sẻ. Lưu lại để lần sau mở là thấy ngay.</p>
      <div className="flex gap-2">
        <button className="btn-primary" onClick={saveShared}>
          <Save className="size-4" /> Lưu làm đội của tôi
        </button>
        <button className="btn-ghost" onClick={leaveShared}>
          <X className="size-4" /> Đóng
        </button>
      </div>
    </div>
  );
}

function ShareButton() {
  const { shareUrl } = useSquad();
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: "Đội hình PUBG", url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* người dùng huỷ */
    }
  };
  return (
    <button className="btn-ghost h-10" onClick={share} title="Sao chép link đội hình">
      {copied ? <Check className="size-4 text-win" /> : <Link2 className="size-4" />}
      {copied ? "Đã sao chép" : "Chia sẻ"}
    </button>
  );
}

function NotFound({ names }: { names: string[] }) {
  const { remove, isShared } = useSquad();
  return (
    <div className="card flex flex-wrap items-center gap-2 border-loss/20 bg-loss/[0.05] px-4 py-3 text-sm">
      <UserX className="size-4 text-loss" />
      <span className="text-fg-muted">Không tìm thấy (kiểm tra chữ HOA/thường):</span>
      {names.map((n) => (
        <span key={n} className="inline-flex items-center gap-1 rounded-lg bg-white/[0.06] py-0.5 pr-1 pl-2 font-medium">
          {n}
          {!isShared && (
            <button onClick={() => remove(n)} className="rounded p-0.5 text-fg-subtle hover:text-loss" aria-label={`Xoá ${n}`}>
              <X className="size-3.5" />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
