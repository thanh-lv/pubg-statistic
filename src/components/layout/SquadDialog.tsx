import { SHARDS, type Shard } from "@shared/types";
import { ArrowDown, ArrowUp, Plus, Trash2, Users, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSquad } from "@/hooks/useSquad";
import { parseNames } from "@/lib/utils";
import { Avatar } from "../ui/Avatar";
import { Select } from "../ui/Select";

const SHARD_LABELS: Record<Shard, string> = {
  steam: "PC (Steam)",
  kakao: "PC (Kakao)",
  psn: "PlayStation",
  xbox: "Xbox",
  console: "Console (chung)",
};

export function SquadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { myPlayers, add, remove, move, shard, setShard } = useSquad();
  const [input, setInput] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const names = parseNames(input);
    if (names.length) add(names);
    setInput("");
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(100%-2rem,32rem)] rounded-3xl border border-white/10 bg-ink-850 p-0 text-fg shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
            <Users className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Quản lý đội hình</h2>
            <p className="text-xs text-fg-subtle">Lưu trên trình duyệt này · tối đa 30 người</p>
          </div>
        </div>
        <button onClick={onClose} className="btn-ghost size-9 p-0" aria-label="Đóng">
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-5 p-5">
        <form onSubmit={submit} className="space-y-2">
          <label className="text-sm font-medium" htmlFor="add-names">
            Thêm người chơi
          </label>
          <div className="flex gap-2">
            <input
              id="add-names"
              className="input"
              placeholder="Tên in-game, cách nhau bởi dấu phẩy"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              autoFocus
            />
            <button className="btn-primary shrink-0" disabled={!parseNames(input).length}>
              <Plus className="size-4" /> Thêm
            </button>
          </div>
          <p className="text-xs text-fg-subtle">Tên phân biệt chữ HOA/thường, phải khớp chính xác với tên trong game.</p>
        </form>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Thành viên ({myPlayers.length})</span>
            {myPlayers.length > 0 && <span className="text-xs text-fg-subtle">Bấm vào mũ để đổi</span>}
          </div>
          {myPlayers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-fg-subtle">
              Chưa có ai. Thêm tên của bạn trước nhé!
            </p>
          ) : (
            <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {myPlayers.map((n, i) => (
                <li key={n} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
                  <Avatar name={n} size="md" editable showLevel={false} />
                  <span className="flex-1 truncate font-medium">{n}</span>
                  <div className="flex items-center gap-1 text-fg-subtle">
                    <button className="rounded-lg p-1.5 hover:bg-white/10 hover:text-fg disabled:opacity-30" disabled={i === 0} onClick={() => move(n, -1)} aria-label="Lên">
                      <ArrowUp className="size-4" />
                    </button>
                    <button className="rounded-lg p-1.5 hover:bg-white/10 hover:text-fg disabled:opacity-30" disabled={i === myPlayers.length - 1} onClick={() => move(n, 1)} aria-label="Xuống">
                      <ArrowDown className="size-4" />
                    </button>
                    <button className="rounded-lg p-1.5 hover:bg-loss/15 hover:text-loss" onClick={() => remove(n)} aria-label={`Xoá ${n}`}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <span className="text-sm font-medium">Nền tảng</span>
          <Select
            label="Nền tảng"
            value={shard}
            onChange={(v) => setShard(v as Shard)}
            options={SHARDS.map((s) => ({ value: s, label: SHARD_LABELS[s] }))}
          />
        </div>
      </div>
    </dialog>
  );
}
