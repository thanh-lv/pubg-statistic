import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { buildRecord, clearRecords, loadRecords, recordKey, saveRecord, type InsightRecord } from "@/lib/telemetry/history";
import { analyzeInWorker } from "@/lib/telemetry/runWorker";
import type { Appearance } from "@/lib/together";
import { matchQuery } from "./queries";
import { useSquad } from "./useSquad";

export interface InsightsProgress {
  done: number;
  total: number;
  failed: number;
  running: boolean;
}

/** 1 lượt (đội-trận) cần phân tích: id trận + teamId của đội */
export const appearanceKey = (a: Appearance) => (a.members[0]?.teamId == null ? null : recordKey(a.match.id, a.members[0].teamId));

/**
 * Phân tích telemetry nhiều trận (lần lượt từng trận để không chiếm quá nhiều bộ nhớ / băng thông),
 * lưu bản tóm tắt vào localStorage.
 */
export function useInsightsHistory() {
  const qc = useQueryClient();
  const { shard } = useSquad();
  const [records, setRecords] = useState<Record<string, InsightRecord>>(() => loadRecords());
  const [progress, setProgress] = useState<InsightsProgress | null>(null);
  const cancelled = useRef(false);

  const run = useCallback(
    async (apps: Appearance[]) => {
      cancelled.current = false;
      const cached = loadRecords();
      const todo = apps.filter((a) => {
        const k = appearanceKey(a);
        return k && a.match.telemetryUrl && !cached[k];
      });
      const p: InsightsProgress = { done: 0, total: todo.length, failed: 0, running: true };
      setProgress({ ...p });

      for (const a of todo) {
        if (cancelled.current) break;
        try {
          const m = (await qc.fetchQuery(matchQuery(a.match.id, shard))).data;
          const teamId = a.members[0].teamId!;
          // Cả đội (người thật) theo roster — giống trang chi tiết trận
          const team = m.participants.filter((x) => x.teamId === teamId && !x.isBot).map((x) => ({ id: x.playerId, name: x.name }));
          if (!m.telemetryUrl || !team.length) throw new Error("Không có telemetry");
          const analysis = await analyzeInWorker({ url: m.telemetryUrl, team, mapName: m.mapName });
          const rec = buildRecord(m, teamId, team, analysis);
          saveRecord(rec);
          setRecords((prev) => ({ ...prev, [recordKey(rec.matchId, rec.teamId)]: rec }));
        } catch {
          p.failed++;
        }
        p.done++;
        setProgress({ ...p });
      }
      setProgress({ ...p, running: false });
    },
    [qc, shard],
  );

  const cancel = useCallback(() => {
    cancelled.current = true;
  }, []);

  const clear = useCallback(() => {
    clearRecords();
    setRecords({});
    setProgress(null);
  }, []);

  return { records, progress, run, cancel, clear };
}
