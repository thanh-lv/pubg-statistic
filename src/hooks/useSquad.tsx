import type { GameMode, Shard } from "@shared/types";
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { SQUAD_CONFIG } from "@/config/squad";
import { defaultHelmet, isHelmetId, type HelmetId } from "@/lib/helmets";
import { parseNames } from "@/lib/utils";
import { usePersistentState } from "./usePersistentState";

interface SquadContextValue {
  /** Danh sách đang hiển thị (đội của mình hoặc đội được chia sẻ qua link) */
  players: string[];
  /** Đội của chính người xem */
  myPlayers: string[];
  isShared: boolean;
  shard: Shard;
  mode: GameMode;
  season: string; // "current" | "lifetime" | season id
  add: (names: string[]) => void;
  remove: (name: string) => void;
  move: (name: string, dir: -1 | 1) => void;
  saveShared: () => void;
  leaveShared: () => void;
  setShard: (s: Shard) => void;
  setMode: (m: GameMode) => void;
  setSeason: (s: string) => void;
  shareUrl: string;
  manageOpen: boolean;
  setManageOpen: (open: boolean) => void;
  helmetOf: (name: string) => HelmetId;
  setHelmet: (name: string, id: HelmetId) => void;
}

const SquadContext = createContext<SquadContextValue | null>(null);

export function SquadProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const [myPlayers, setMyPlayers] = usePersistentState<string[]>("squad.players", SQUAD_CONFIG.players);
  const [shard, setShard] = usePersistentState<Shard>("squad.shard", SQUAD_CONFIG.shard);
  const [mode, setMode] = usePersistentState<GameMode>("squad.mode", SQUAD_CONFIG.defaultMode);
  const [season, setSeason] = usePersistentState<string>("squad.season", "current");
  const [manageOpen, setManageOpen] = useState(false);
  const [helmets, setHelmets] = usePersistentState<Record<string, HelmetId>>("squad.helmets", {});

  const helmetOf = useCallback(
    (name: string) => {
      const key = name.toLowerCase();
      const own = helmets[key];
      if (isHelmetId(own)) return own;
      const cfg = Object.entries(SQUAD_CONFIG.helmets ?? {}).find(([n]) => n.toLowerCase() === key)?.[1];
      return isHelmetId(cfg) ? cfg : defaultHelmet(name);
    },
    [helmets],
  );
  const setHelmet = useCallback(
    (name: string, id: HelmetId) => setHelmets((prev) => ({ ...prev, [name.toLowerCase()]: id })),
    [setHelmets],
  );

  const shared = useMemo(() => parseNames(params.get("p") ?? ""), [params]);
  const isShared = shared.length > 0;
  const players = isShared ? shared : myPlayers;

  const leaveShared = useCallback(() => {
    setParams(
      (p) => {
        p.delete("p");
        return p;
      },
      { replace: true },
    );
  }, [setParams]);

  const add = useCallback(
    (names: string[]) => setMyPlayers((prev) => [...new Set([...prev, ...names])].slice(0, 30)),
    [setMyPlayers],
  );
  const remove = useCallback(
    (name: string) => setMyPlayers((prev) => prev.filter((n) => n !== name)),
    [setMyPlayers],
  );
  const move = useCallback(
    (name: string, dir: -1 | 1) =>
      setMyPlayers((prev) => {
        const i = prev.indexOf(name);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= prev.length) return prev;
        const next = [...prev];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      }),
    [setMyPlayers],
  );
  const saveShared = useCallback(() => {
    setMyPlayers(shared);
    leaveShared();
  }, [shared, setMyPlayers, leaveShared]);

  const shareUrl = useMemo(() => {
    const url = new URL(window.location.origin);
    if (players.length) url.searchParams.set("p", players.join(","));
    return url.toString().replace(/%2C/g, ",");
  }, [players]);

  const value: SquadContextValue = {
    players,
    myPlayers,
    isShared,
    shard,
    mode,
    season,
    add,
    remove,
    move,
    saveShared,
    leaveShared,
    setShard,
    setMode,
    setSeason,
    shareUrl,
    manageOpen,
    setManageOpen,
    helmetOf,
    setHelmet,
  };
  return <SquadContext value={value}>{children}</SquadContext>;
}

export function useSquad() {
  const ctx = use(SquadContext);
  if (!ctx) throw new Error("useSquad must be used inside <SquadProvider>");
  return ctx;
}
