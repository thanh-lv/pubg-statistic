import { Info } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { GLOSSARY, type TermKey } from "@/lib/glossary";
import { cn } from "@/lib/utils";
import { TermArt, hasArt } from "./TermArt";

const WIDTH = 256;
const GAP = 8;

/**
 * Tooltip hiện khi rê chuột (desktop) hoặc chạm (mobile).
 * Render qua portal + position: fixed nên không bị cắt bởi vùng cuộn của bảng.
 */
export function Tip({ term, children, className }: { term: TermKey; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const id = useId();

  const show = useCallback(() => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - WIDTH / 2), window.innerWidth - WIDTH - 8);
    const above = r.top > 300;
    setPos({ left, top: above ? r.top - GAP : r.bottom + GAP, above });
  }, []);
  const hide = useCallback(() => setPos(null), []);

  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && hide();
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [pos, hide]);

  const t = GLOSSARY[term];
  return (
    <span
      ref={ref}
      className={cn("inline-flex", className)}
      onPointerEnter={(e) => e.pointerType === "mouse" && show()}
      onPointerLeave={(e) => e.pointerType === "mouse" && hide()}
      onFocus={show}
      onBlur={hide}
      aria-describedby={pos ? id : undefined}
    >
      {children}
      {pos &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            className="pointer-events-none fixed z-50 animate-fade-in rounded-xl border border-white/10 bg-ink-700/95 p-3 text-left shadow-2xl backdrop-blur"
            style={{
              left: pos.left,
              top: pos.top,
              width: WIDTH,
              transform: pos.above ? "translateY(-100%)" : undefined,
            }}
          >
            {hasArt(term) && (
              <div className="mb-2.5 rounded-lg bg-black/25 px-3 py-2">
                <TermArt term={term} className="mx-auto h-20 w-full" />
              </div>
            )}
            <div className="text-xs font-semibold text-accent">{t.title}</div>
            <p className="mt-1 text-xs leading-relaxed font-normal normal-case tracking-normal text-fg">{t.desc}</p>
            {"formula" in t && t.formula && (
              <p className="mt-1.5 rounded-md bg-black/25 px-2 py-1 font-mono text-[11px] normal-case tracking-normal text-fg-muted">
                {t.formula}
              </p>
            )}
            {"example" in t && t.example && (
              <p className="mt-1.5 text-[11px] leading-relaxed font-normal normal-case tracking-normal text-fg-muted">
                <span className="text-fg-subtle">Ví dụ: </span>
                {t.example}
              </p>
            )}
          </div>,
          document.body,
        )}
    </span>
  );
}

/** Icon (i) nhỏ, chạm/rê để xem giải thích. */
export function InfoTip({ term, className }: { term: TermKey; className?: string }) {
  return (
    <Tip term={term} className={className}>
      <button
        type="button"
        aria-label={`Giải thích: ${GLOSSARY[term].title}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          (e.currentTarget as HTMLButtonElement).focus();
        }}
        className="inline-grid size-4 shrink-0 cursor-help place-items-center rounded-full text-fg-subtle transition hover:text-accent focus-visible:text-accent"
      >
        <Info className="size-3.5" />
      </button>
    </Tip>
  );
}

/** Nhãn kèm icon giải thích. */
export function Label({ term, children, className }: { term?: TermKey; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {children}
      {term && <InfoTip term={term} />}
    </span>
  );
}
