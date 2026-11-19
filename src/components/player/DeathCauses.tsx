import type { MatchParticipant } from "@shared/types";
import { Skull } from "lucide-react";
import { fmt1, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { InfoTip } from "../ui/Tip";

/** Giá trị deathType PUBG ghi cho mỗi người trong trận */
const CAUSES: { key: string; label: string; bar: string }[] = [
  { key: "byplayer", label: "Bị hạ (người hoặc bot)", bar: "bg-loss" },
  { key: "byzone", label: "Chết vì bo", bar: "bg-blue-500" },
  { key: "suicide", label: "Tự sát / ngã / tai nạn", bar: "bg-accent" },
  { key: "logout", label: "Thoát trận", bar: "bg-fg-subtle" },
  { key: "alive", label: "Sống tới cuối trận", bar: "bg-win" },
  { key: "other", label: "Khác", bar: "bg-white/30" },
];
const KNOWN = new Set(CAUSES.map((c) => c.key));

/** Thời điểm chết tính từ đầu trận (giây) */
const PHASES: { label: string; max: number }[] = [
  { label: "< 5 phút", max: 300 },
  { label: "5–15 phút", max: 900 },
  { label: "15–25 phút", max: 1500 },
  { label: "> 25 phút", max: Infinity },
];

export function DeathCauses({ rows }: { rows: MatchParticipant[] }) {
  if (!rows.length) return null;
  const causeOf = (p: MatchParticipant) => (KNOWN.has(p.deathType) ? p.deathType : "other");
  const counts = CAUSES.map((c) => ({ ...c, n: rows.filter((p) => causeOf(p) === c.key).length })).filter((c) => c.n > 0);
  const deaths = rows.filter((p) => causeOf(p) !== "alive");
  const phases = PHASES.map((ph, i) => {
    const min = i ? PHASES[i - 1].max : 0;
    const inPhase = deaths.filter((p) => p.timeSurvived >= min && p.timeSurvived < ph.max);
    return {
      ...ph,
      n: inPhase.length,
      avgPlace: inPhase.length ? inPhase.reduce((s, p) => s + p.winPlace, 0) / inPhase.length : null,
    };
  });
  const maxPhase = Math.max(1, ...phases.map((p) => p.n));
  const early = phases[0].n;

  return (
    <div className="mb-5 grid gap-4 rounded-xl bg-white/[0.02] p-3 sm:p-4 lg:grid-cols-2">
      <div>
        <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold">
          <Skull className="size-4 text-loss" /> Nguyên nhân chết
          <InfoTip term="deathCause" />
          <span className="ml-auto text-xs font-normal text-fg-subtle">{rows.length} trận</span>
        </h3>
        <div className="flex h-3 overflow-hidden rounded-full bg-white/[0.05]" role="img" aria-label="Tỉ lệ nguyên nhân chết">
          {counts.map((c) => (
            <div key={c.key} className={cn("h-full", c.bar)} style={{ width: `${(c.n / rows.length) * 100}%` }} title={`${c.label}: ${c.n}`} />
          ))}
        </div>
        <ul className="mt-3 space-y-1.5 text-sm">
          {counts.map((c) => (
            <li key={c.key} className="flex items-center gap-2">
              <span className={cn("size-2.5 shrink-0 rounded-sm", c.bar)} />
              <span className="flex-1 text-fg-muted">{c.label}</span>
              <span className="num font-semibold">{c.n}</span>
              <span className="num w-12 text-right text-xs text-fg-subtle">{fmtPct(c.n / rows.length)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2.5 flex items-center text-sm font-semibold">
          Chết lúc nào
          <span className="ml-auto text-xs font-normal text-fg-subtle">tính từ đầu trận · {deaths.length} lần chết</span>
        </h3>
        {deaths.length === 0 ? (
          <p className="py-4 text-center text-sm text-fg-subtle">Chưa chết trận nào trong các trận đã tải.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {phases.map((ph) => (
              <li key={ph.label} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3">
                <span className="text-fg-muted">{ph.label}</span>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="h-full rounded-full bg-loss/80" style={{ width: `${(ph.n / maxPhase) * 100}%` }} />
                </div>
                <span className="num w-28 text-right text-xs text-fg-muted">
                  <b className="text-fg">{ph.n}</b>
                  {ph.avgPlace != null && ` · hạng TB #${fmt1(ph.avgPlace)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
        {deaths.length > 0 && (
          <p className={cn("mt-3 text-xs", early / deaths.length >= 0.3 ? "text-loss" : "text-fg-subtle")}>
            {fmtPct(early / deaths.length)} số lần chết xảy ra trong 5 phút đầu
            {early / deaths.length >= 0.3 && " — chết sớm nhiều, cân nhắc đổi điểm nhảy hoặc nhảy chỗ ít người hơn"}.
          </p>
        )}
      </div>
    </div>
  );
}
