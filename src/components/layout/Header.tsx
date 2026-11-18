import { Crosshair, Search, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useSquad } from "@/hooks/useSquad";
import { Link, NavLink, useNavigate } from "react-router";
import { SQUAD_CONFIG } from "@/config/squad";
import { cn } from "@/lib/utils";
import { SquadDialog } from "./SquadDialog";

export function Header() {
  const [q, setQ] = useState("");
  const { manageOpen, setManageOpen } = useSquad();
  const navigate = useNavigate();

  const search = (e: FormEvent) => {
    e.preventDefault();
    const name = q.trim();
    if (!name) return;
    navigate(`/player/${encodeURIComponent(name)}`);
    setQ("");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-900/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-accent text-ink-950 shadow-[0_0_24px_-6px] shadow-accent">
            <Crosshair className="size-5" strokeWidth={2.5} />
          </div>
          <span className="hidden font-display text-lg font-bold tracking-wide sm:block">{SQUAD_CONFIG.title}</span>
        </Link>

        <nav className="ml-2 hidden md:block">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn("rounded-lg px-3 py-1.5 text-sm font-medium transition", isActive ? "bg-white/[0.07] text-fg" : "text-fg-muted hover:text-fg")
            }
          >
            Đội hình
          </NavLink>
        </nav>

        <form onSubmit={search} className="relative ml-auto w-full max-w-xs min-w-0">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
          <input
            className="input h-10 pl-9"
            placeholder="Tìm người chơi…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Tìm người chơi"
          />
        </form>

        <button onClick={() => setManageOpen(true)} className="btn-ghost h-10 shrink-0" aria-label="Quản lý đội hình">
          <Users className="size-4" />
          <span className="hidden sm:inline">Đội hình</span>
        </button>
      </div>
      <SquadDialog open={manageOpen} onClose={() => setManageOpen(false)} />
    </header>
  );
}
