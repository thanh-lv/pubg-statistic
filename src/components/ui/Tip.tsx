import { Info } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { GLOSSARY, type TermKey } from "@/lib/glossary";
import { cn } from "@/lib/utils";
import { TermArt, hasArt } from "./TermArt";

const WIDTH = 256;
/** Khoảng cách từ con trỏ tới tooltip */
const OFFSET_X = 16;
const OFFSET_Y = 10;
const EDGE = 8;

type Anchor = { x: number; y: number };

/**
 * Tooltip hiện khi rê chuột (desktop) hoặc chạm/focus (mobile, bàn phím).
 * - Rê chuột: nằm bên phải con trỏ và đi theo chuột; sát mép phải thì lật sang trái.
 * - Chạm/focus: nằm bên phải phần tử.
 * Render qua portal + position: fixed nên không bị cắt bởi vùng cuộn của bảng.
 */
export function Tip({ term, children, className }: { term: TermKey; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  const id = useId();

  const showAtPointer = useCallback((e: ReactPointerEvent) => {
    if (e.pointerType === "mouse") setAnchor({ x: e.clientX, y: e.clientY });
  }, []);
  const showAtElement = useCallback(() => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setAnchor({ x: r.right - OFFSET_X + 4, y: r.top + r.height / 2 - OFFSET_Y });
  }, []);
  const hide = useCallback(() => {
    setAnchor(null);
    setPlace(null);
  }, []);

  // Đo kích thước tooltip rồi đặt bên phải con trỏ, giữ trong khung nhìn
  useLayoutEffect(() => {
    const el = tipRef.current;
    if (!anchor || !el) return;
    const { offsetWidth: w, offsetHeight: h } = el;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = anchor.x + OFFSET_X;
    if (left + w > vw - EDGE) left = anchor.x - OFFSET_X - w; // lật sang trái
    left = Math.max(EDGE, Math.min(left, vw - w - EDGE));
    const top = Math.max(EDGE, Math.min(anchor.y + OFFSET_Y, vh - h - EDGE));
    setPlace((p) => (p && p.left === left && p.top === top ? p : { left, top }));
  }, [anchor]);

  useEffect(() => {
    if (!anchor) return;
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
  }, [anchor, hide]);

  const t = GLOSSARY[term];
  return (
    <span
      ref={ref}
      className={cn("inline-flex", className)}
      onPointerEnter={showAtPointer}
      onPointerMove={showAtPointer}
      onPointerLeave={(e) => e.pointerType === "mouse" && hide()}
      onFocus={() => !anchor && showAtElement()}
      onBlur={hide}
      aria-describedby={anchor ? id : undefined}
    >
      {children}
      {anchor &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            className="pointer-events-none fixed top-0 left-0 z-50 rounded-xl border border-white/10 bg-ink-700/95 p-3 text-left shadow-2xl backdrop-blur transition-opacity duration-150"
            style={{
              width: WIDTH,
              transform: place ? `translate(${place.left}px, ${place.top}px)` : undefined,
              opacity: place ? 1 : 0,
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
