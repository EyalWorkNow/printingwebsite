"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Accessibility, X, RotateCcw, Type, Contrast, Droplet, Link2, Pause, MousePointer2, AlignJustify, Focus, BookOpen, Heading } from "lucide-react";
import { GlowCard } from "./glow-card";
import { useI18n } from "@/i18n/client";

// Accessibility menu (IS 5568 style). Each setting = a class on <html> (styles in globals.css), remembered in
// localStorage and applied before paint by A11Y_SCRIPT, so pages never flash back to the defaults.
const KEY = "a11y";
type State = { size: number; toggles: string[] };
const SIZES = [100, 115, 130, 150];
const TOGGLES = [
  { id: "contrast", icon: Contrast },
  { id: "gray", icon: Droplet },
  { id: "links", icon: Link2 },
  { id: "headings", icon: Heading },
  { id: "font", icon: BookOpen },
  { id: "spacing", icon: AlignJustify },
  { id: "motion", icon: Pause },
  { id: "cursor", icon: MousePointer2 },
  { id: "focus", icon: Focus },
] as const;
const EMPTY: State = { size: 100, toggles: [] };

const parse = (raw: string): State => { try { const s = JSON.parse(raw); return { size: SIZES.includes(s.size) ? s.size : 100, toggles: Array.isArray(s.toggles) ? s.toggles : [] }; } catch { return EMPTY; } };
function apply(s: State) {
  const h = document.documentElement;
  for (const t of TOGGLES) h.classList.toggle(`a11y-${t.id}`, s.toggles.includes(t.id));
  h.style.fontSize = s.size === 100 ? "" : `${s.size}%`;
}
let listeners: (() => void)[] = [];
let snap = "";
const store = {
  get: () => { const v = typeof window === "undefined" ? "" : localStorage.getItem(KEY) ?? ""; if (v !== snap) snap = v; return snap; },
  set(s: State) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: applies to this page only */ } apply(s); listeners.forEach((l) => l()); },
  sub(l: () => void) { listeners.push(l); return () => { listeners = listeners.filter((x) => x !== l); }; },
};

export function A11yMenu() {
  const s = parse(useSyncExternalStore(store.sub, store.get, () => "")); // server + hydration: defaults
  const [open, setOpen] = useState(false);
  const { d, href } = useI18n();
  const t = d.a11y;
  const btn = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  const set = (patch: Partial<State>) => store.set({ ...s, ...patch });
  const toggle = (id: string) => set({ toggles: s.toggles.includes(id) ? s.toggles.filter((x) => x !== id) : [...s.toggles, id] });
  const active = s.size !== 100 || s.toggles.length > 0;

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    const onClick = (e: MouseEvent) => { if (!panel.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey); document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [open]);

  const chip = (on: boolean) => `flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center text-xs leading-tight transition ${on ? "border-foreground bg-foreground text-background" : "text-foreground/80 hover:border-foreground/40 hover:text-foreground"}`;

  return (
    <>
      <button ref={btn} type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="a11y-panel" aria-label={t.menu}
        className="a11y-keep fixed right-5 bottom-[calc(1.25rem+var(--fab-offset,0rem))] z-50 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-foreground text-background shadow-lg md:bottom-5">
        <Accessibility className="h-7 w-7" />
        {active && <span className="absolute -top-0.5 -start-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-[#5a922c]" aria-hidden />}
      </button>
      {open && (
        <div ref={panel} id="a11y-panel" role="dialog" aria-modal="false" aria-label={t.settings}
          className="a11y-keep fixed right-3 bottom-[calc(5.5rem+var(--fab-offset,0rem))] z-50 w-[min(22rem,calc(100vw-1.5rem))] md:bottom-24">
          <GlowCard className="h-auto bg-background shadow-2xl" inner="max-h-[min(70vh,36rem)] space-y-4 overflow-y-auto bg-background p-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold"><Accessibility className="h-5 w-5" /> {t.title}</h2>
              <button type="button" onClick={() => { setOpen(false); btn.current?.focus(); }} aria-label={t.close} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Type className="h-4 w-4" /> {t.textSize}</p>
              <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={t.textSize}>
                {SIZES.map((z) => <button key={z} type="button" role="radio" aria-checked={s.size === z} onClick={() => set({ size: z })} className={`rounded-lg border py-2 text-sm tabular-nums ${s.size === z ? "border-foreground bg-foreground text-background" : "hover:border-foreground/40"}`}>{z}%</button>)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {TOGGLES.map(({ id, icon: I }) => (
                <button key={id} type="button" aria-pressed={s.toggles.includes(id)} onClick={() => toggle(id)} className={chip(s.toggles.includes(id))}>
                  <I className="h-5 w-5" />{t[id]}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
              <button type="button" onClick={() => store.set(EMPTY)} disabled={!active} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 hover:border-foreground/40 disabled:opacity-40"><RotateCcw className="h-4 w-4" /> {t.reset}</button>
              <Link href={href("/accessibility")} onClick={() => setOpen(false)} className="py-2 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">{t.statement}</Link>
            </div>
          </GlowCard>
        </div>
      )}
    </>
  );
}

