import type { Derived } from "@/lib/stats";

export interface SquadRow {
  id: string;
  name: string;
  color: string;
  d: Derived | null;
}
