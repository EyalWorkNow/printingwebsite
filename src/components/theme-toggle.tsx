"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";

// Theme = class "dark" on <html>. Initial value is set by the inline script in the root layout (no flash);
// an explicit choice is remembered, otherwise the OS setting is followed live.
const KEY = "theme";
const root = () => document.documentElement;
const stored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(root(), { attributes: true, attributeFilter: ["class"] });
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const onOs = () => { if (!stored()) root().classList.toggle("dark", mq.matches); };
  mq.addEventListener("change", onOs);
  return () => { mo.disconnect(); mq.removeEventListener("change", onOs); };
}

const HE = { toLight: "מעבר למצב בהיר", toDark: "מעבר למצב כהה", light: "מצב בהיר", dark: "מצב כהה" };
export function ThemeToggle({ className = "", t = HE }: { className?: string; t?: typeof HE }) {
  const dark = useSyncExternalStore(subscribe, () => root().classList.contains("dark"), () => true);
  function toggle() {
    const next = !root().classList.contains("dark");
    root().classList.toggle("dark", next);
    try { localStorage.setItem(KEY, next ? "dark" : "light"); } catch { /* private mode: still switches for this page */ }
  }
  return (
    <button type="button" onClick={toggle} aria-label={dark ? t.toLight : t.toDark} title={dark ? t.light : t.dark}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-muted-foreground hover:border-foreground/40 hover:text-foreground ${className}`}>
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

