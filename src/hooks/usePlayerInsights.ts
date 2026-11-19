import { GAME_MODES } from "@shared/types";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import {
  clearPlayerRecords,
  loadPlayerRecords,
  PLAYER_INSIGHTS_VERSION,
  playerRecordKey,
  savePlayerRecord,
  type PlayerRecord,
} from "@/lib/telemetry/playerHistory";
import { analyzePlayerInWorker } from "@/lib/telemetry/runWorker";
import type { InsightsProgress } from "./useInsightsHistory";
import { matchQuery } from "./queries";
import { useSquad } from "./useSquad";

const BR_MODES = new Set<string>(GAME_MODES);

/** Phân tích telemetry các trận của 1 người chơi, lần lượt từng trận, lưu bản tóm tắt vào localStorage. */
export function usePlayerInsights(playerId: string) {
  const qc = useQueryClient();
  const { shard } = useSquad();
  const [records, setRecords] = useState<Record<string, PlayerRecord>>(() => loadPlayerRecords());
  const [progress, setProgress] = useState<InsightsProgress | null>(null);
  const cancelled = useRef(false);

  const save = useCallback((r: PlayerRecord) => {
    savePlayerRecord(r);
    setRecords((prev) => ({ ...prev, [playerRecordKey(r.matchId, r.playerId)]: r }));
  }, []);

  const run = useCallback(
    async (matchIds: string[]) => {
      cancelled.current = false;
      const cached = loadPlayerRecords();
      const todo = matchIds.filter((id) => !cached[playerRecordKey(id, playerId)]);
      const p: InsightsProgress = { done: 0, total: todo.length, failed: 0, running: true };
      setProgress({ ...p });

      for (const id of todo) {
        if (cancelled.current) break;
        try {
          const m = (await qc.fetchQuery(matchQuery(id, shard))).data;
          const me = m.participants.find((x) => x.playerId === playerId);
          const base = {
            v: PLAYER_INSIGHTS_VERSION,
            matchId: m.id,
            playerId,
            createdAt: m.createdAt,
            mapName: m.mapName,
            gameMode: m.gameMode,
            rank: me?.winPlace ?? 0,
          };
          // Chỉ trận battle royale thường / rank có telemetry; trận khác lưu "bỏ qua" để không tải lại
          const isBR = !m.isCustomMatch && BR_MODES.has(m.gameMode) && (m.matchType === "official" || m.matchType === "competitive");
          if (!isBR || !m.telemetryUrl || !me) {
            save({ ...base, skipped: true });
          } else {
            save({ ...base, stats: await analyzePlayerInWorker({ url: m.telemetryUrl, playerId }) });
          }
        } catch {
          p.failed++;
        }
        p.done++;
        setProgress({ ...p });
      }
      setProgress({ ...p, running: false });
    },
    [qc, shard, playerId, save],
  );

  const cancel = useCallback(() => {
    cancelled.current = true;
  }, []);

  const clear = useCallback(() => {
    clearPlayerRecords(playerId);
    setRecords(loadPlayerRecords());
    setProgress(null);
  }, [playerId]);

  return { records, progress, run, cancel, clear };
}
