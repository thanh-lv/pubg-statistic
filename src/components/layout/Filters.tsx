import type { GameMode } from "@shared/types";
import { useResolvedSeason } from "@/hooks/queries";
import { useSquad } from "@/hooks/useSquad";
import { Segmented } from "../ui/Segmented";
import { Select } from "../ui/Select";
import { InfoTip } from "../ui/Tip";

type Team = "squad" | "duo" | "solo";

export function ModePicker({ value, onChange }: { value: GameMode; onChange: (m: GameMode) => void }) {
  const team = value.replace("-fpp", "") as Team;
  const fpp = value.endsWith("-fpp");
  const build = (t: Team, f: boolean) => onChange((f ? `${t}-fpp` : t) as GameMode);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented<Team>
        value={team}
        onChange={(t) => build(t, fpp)}
        options={[
          { value: "squad", label: "Squad" },
          { value: "duo", label: "Duo" },
          { value: "solo", label: "Solo" },
        ]}
      />
      <Segmented<"tpp" | "fpp">
        value={fpp ? "fpp" : "tpp"}
        onChange={(v) => build(team, v === "fpp")}
        options={[
          { value: "tpp", label: "TPP" },
          { value: "fpp", label: "FPP" },
        ]}
      />
      <InfoTip term="tppFpp" className="self-center" />
    </div>
  );
}

export function SeasonPicker() {
  const { season, setSeason, seasons } = useResolvedSeason();
  const list = seasons.data?.data ?? [];
  const current = list.find((s) => s.isCurrent);
  const options = [
    { value: "current", label: current ? `Mùa hiện tại · ${current.number}` : "Mùa hiện tại" },
    { value: "lifetime", label: "Toàn thời gian" },
    ...list.filter((s) => !s.isCurrent).slice(0, 15).map((s) => ({ value: s.id, label: s.label })),
  ];
  return <Select label="Mùa giải" value={season} onChange={setSeason} options={options} className="min-w-44" />;
}

export function Filters({ showMode = true }: { showMode?: boolean }) {
  const { mode, setMode } = useSquad();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SeasonPicker />
      {showMode && <ModePicker value={mode} onChange={setMode} />}
    </div>
  );
}
