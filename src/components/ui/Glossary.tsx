import { BookOpen, ChevronDown } from "lucide-react";
import { GLOSSARY, GLOSSARY_GROUPS } from "@/lib/glossary";
import { TermArt, hasArt } from "./TermArt";

/** Bảng giải thích toàn bộ chỉ số (có hình minh hoạ), gập/mở được. */
export function Glossary() {
  return (
    <details className="card group overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 select-none sm:px-5 [&::-webkit-details-marker]:hidden">
        <div className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent">
          <BookOpen className="size-4" />
        </div>
        <div className="flex-1">
          <div className="font-display font-semibold">Giải thích chỉ số</div>
          <div className="text-xs text-fg-subtle">K/D, KDA, ADR, Top10%, Knock, RP… nghĩa là gì? Có hình minh hoạ.</div>
        </div>
        <ChevronDown className="size-5 text-fg-subtle transition group-open:rotate-180" />
      </summary>

      <div className="space-y-7 border-t border-white/[0.06] p-4 sm:p-5">
        {GLOSSARY_GROUPS.map((g) => (
          <section key={g.title}>
            <h3 className="mb-3 text-xs font-semibold tracking-wide text-fg-subtle uppercase">{g.title}</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {g.keys.map((k) => {
                const t = GLOSSARY[k];
                return (
                  <article key={k} className="flex flex-col gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 sm:flex-row">
                    {hasArt(k) && (
                      <div className="grid shrink-0 place-items-center self-start rounded-lg bg-black/25 p-2 max-sm:w-full sm:w-36">
                        <TermArt term={k} className="h-24 w-full sm:h-auto" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-accent">{t.title}</h4>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{t.desc}</p>
                      {"formula" in t && t.formula && (
                        <p className="mt-1.5 font-mono text-[11px] text-fg-subtle">= {t.formula}</p>
                      )}
                      {"example" in t && t.example && (
                        <p className="mt-1 text-xs text-fg-subtle">
                          <span className="text-fg-muted">Ví dụ:</span> {t.example}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </details>
  );
}
