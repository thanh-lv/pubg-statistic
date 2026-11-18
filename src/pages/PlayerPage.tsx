import { ArrowLeft, Ban, Check, SearchX, UserPlus } from "lucide-react";
import { Link, useParams } from "react-router";
import { SeasonPicker } from "@/components/layout/Filters";
import { ModeStatsPanel } from "@/components/player/ModeStatsPanel";
import { RankedCard } from "@/components/player/RankedCard";
import { RecentMatches } from "@/components/player/RecentMatches";
import { Avatar } from "@/components/ui/Avatar";
import { Glossary } from "@/components/ui/Glossary";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState, UpdatedAt } from "@/components/ui/States";
import { usePlayerRanked, usePlayerSeason, usePlayers, useResolvedSeason } from "@/hooks/queries";
import { useSquad } from "@/hooks/useSquad";

export function PlayerPage() {
  const { name = "" } = useParams();
  const { myPlayers, add, mode, shard } = useSquad();
  const { resolved, seasons } = useResolvedSeason();

  const playersQ = usePlayers([name]);
  const player = playersQ.data?.data.players[0];
  const seasonQ = usePlayerSeason(player?.id, resolved);
  const rankedQ = usePlayerRanked(player?.id, resolved);

  if (playersQ.isPending) return <PageSkeleton />;
  if (playersQ.error) return <ErrorState error={playersQ.error} onRetry={() => playersQ.refetch()} />;
  if (!player) {
    return (
      <EmptyState
        icon={<SearchX className="size-7" />}
        title={`Không tìm thấy "${name}"`}
        className="mx-auto mt-10 max-w-xl"
        action={
          <Link to="/" className="btn-ghost">
            <ArrowLeft className="size-4" /> Về trang đội hình
          </Link>
        }
      >
        Tên người chơi phân biệt chữ HOA/thường và phải khớp chính xác. Đang tìm trên nền tảng <b>{shard}</b>.
      </EmptyState>
    );
  }

  const inSquad = myPlayers.some((n) => n.toLowerCase() === player.name.toLowerCase());
  const seasonLabel =
    resolved === "lifetime" ? "Toàn thời gian" : seasons.data?.data.find((s) => s.id === resolved)?.label;
  const ranked = Object.entries(rankedQ.data?.data.modes ?? {});

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Đội hình
      </Link>

      <section className="card relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
          <Avatar name={player.name} size="xl" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
              {player.shard} {seasonLabel && `· ${seasonLabel}`}
            </p>
            <h1 className="mt-1 truncate font-display text-3xl font-bold sm:text-4xl">{player.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <UpdatedAt at={seasonQ.data?.meta.fetchedAt} stale={seasonQ.data?.meta.stale} fetching={seasonQ.isFetching} />
              {player.banType && (
                <span className="inline-flex items-center gap-1 rounded-md bg-loss/15 px-2 py-0.5 text-xs font-semibold text-loss">
                  <Ban className="size-3" /> {player.banType}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SeasonPicker />
            {inSquad ? (
              <span className="btn-ghost h-10 cursor-default text-win">
                <Check className="size-4" /> Trong đội
              </span>
            ) : (
              <button className="btn-primary h-10" onClick={() => add([player.name])}>
                <UserPlus className="size-4" /> Thêm vào đội
              </button>
            )}
          </div>
        </div>
      </section>

      {ranked.length > 0 && (
        <section className={ranked.length > 1 ? "grid gap-4 lg:grid-cols-2" : undefined}>
          {ranked.map(([m, s]) => (
            <RankedCard key={m} mode={m} s={s} wide={ranked.length === 1} />
          ))}
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Thống kê trận thường</h2>
        {seasonQ.error ? (
          <ErrorState error={seasonQ.error} onRetry={() => seasonQ.refetch()} />
        ) : !seasonQ.data ? (
          <Skeleton className="h-96 rounded-2xl" />
        ) : (
          <ModeStatsPanel key={`${player.id}:${resolved}`} modes={seasonQ.data.data.modes} preferred={mode} />
        )}
      </section>

      <RecentMatches key={player.id} playerId={player.id} matchIds={player.matchIds} />

      <Glossary />
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
