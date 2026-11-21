"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { KIND_TAB, KINDS, tabKind, type Kind } from "@/lib/games";

type Tab = { label: string; hint: string; count: number };

// Две вкладки раздела: «Игры» и «Практики». Обе панели приходят с сервера готовыми,
// переключение мгновенное, а выбранная вкладка живёт в адресе (?tab=games|practices),
// чтобы «назад» из игры или практики возвращал туда же.
export function PlayTabs({ initial, tabs, panels }: { initial: Kind; tabs: Record<Kind, Tab>; panels: Record<Kind, ReactNode> }) {
  const [kind, setKind] = useState<Kind>(initial);
  const refs = useRef<Record<Kind, HTMLButtonElement | null>>({ game: null, practice: null });

  // Если открыли /play без вкладки, а в адресе потом появилась (кнопка «назад» браузера), подхватываем её.
  useEffect(() => {
    const onPop = () => setKind(tabKind(new URLSearchParams(window.location.search).get("tab")));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const pick = (next: Kind, focus = false) => {
    setKind(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", KIND_TAB[next]);
    window.history.replaceState(window.history.state, "", url);
    if (focus) refs.current[next]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label={`${tabs.game.label} / ${tabs.practice.label}`} className="grid grid-cols-2 gap-1.5 rounded-[28px] bg-ink/[0.05] p-1.5">
        {KINDS.map((k) => {
          const active = k === kind;
          return (
            <button
              key={k}
              ref={(el) => {
                refs.current[k] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${k}`}
              aria-selected={active}
              aria-controls={`panel-${k}`}
              tabIndex={active ? 0 : -1}
              onClick={() => pick(k)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  pick(k === "game" ? "practice" : "game", true);
                }
              }}
              className={`flex min-w-0 items-center gap-2.5 rounded-[22px] px-2.5 py-3 sm:gap-3 text-left transition-all duration-300 sm:px-5 sm:py-4 ${active ? "bg-paper text-ink shadow-soft" : "text-ink-soft hover:bg-paper/50 hover:text-ink"}`}
            >
              <KindIcon kind={k} active={active} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="truncate font-serif text-[17px] leading-tight sm:text-[21px]">{tabs[k].label}</span>
                  <span className={`hidden rounded-full px-2 py-0.5 text-[12px] sm:inline font-medium tabular-nums ${active ? "bg-ink text-paper" : "bg-ink/[0.07] text-ink-soft"}`}>{tabs[k].count}</span>
                </span>
                <span className="mt-1 hidden text-[13px] leading-snug text-ink-soft sm:line-clamp-2">{tabs[k].hint}</span>
              </span>
            </button>
          );
        })}
      </div>
      {/* На телефоне описание вкладки — под переключателем, чтобы кнопки остались крупными. */}
      <p key={kind} className="mt-3 animate-rise px-2 text-[14px] leading-relaxed text-ink-soft sm:hidden">
        {tabs[kind].hint}
      </p>
      {KINDS.map((k) => (
        <div key={k} role="tabpanel" id={`panel-${k}`} aria-labelledby={`tab-${k}`} hidden={k !== kind} className="mt-8 animate-rise">
          {panels[k]}
        </div>
      ))}
    </div>
  );
}

// Знак вкладки: у игр — фигурки на поле, у практик — дышащий круг.
function KindIcon({ kind, active }: { kind: Kind; active: boolean }) {
  if (kind === "game")
    return (
      <span
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl transition-colors sm:h-12 sm:w-12 ${active ? "bg-[#1f1d55]" : "bg-ink/[0.08]"}`}
        aria-hidden
      >
        <span className={`absolute left-[9px] top-[9px] h-3.5 w-3.5 rounded-full border-2 ${active ? "border-[#9fe6c8]" : "border-ink-faint"} sm:left-[11px] sm:top-[11px]`} />
        <span className={`absolute bottom-[9px] right-[9px] h-3 w-3 rotate-45 rounded-[3px] ${active ? "bg-[#ffb79c]" : "bg-ink-faint"} sm:bottom-[11px] sm:right-[11px]`} />
        <span className={`absolute bottom-[10px] left-[10px] h-2 w-2 rounded-full ${active ? "bg-[#cfc9ff]" : "bg-ink-faint/70"} sm:bottom-[12px] sm:left-[12px]`} />
      </span>
    );
  return (
    <span
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors sm:h-12 sm:w-12 ${active ? "bg-sage-soft" : "bg-ink/[0.08]"}`}
      aria-hidden
    >
      <span className={`absolute h-7 w-7 rounded-full ${active ? "animate-breathe bg-sage/40" : "bg-ink-faint/20"}`} />
      <span className={`h-3.5 w-3.5 rounded-full ${active ? "bg-sage-deep" : "bg-ink-faint"}`} />
    </span>
  );
}
