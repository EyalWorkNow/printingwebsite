"use client";

import { useSyncExternalStore } from "react";
import type { LineInput } from "./catalog";

// Cart lives in this browser only (localStorage) — prices are never stored, they are recomputed from the catalog.
export type CartItem = LineInput & { key: string; thumb?: string; fileName?: string };

const KEY = "dfus-cart-v1";
const EMPTY: CartItem[] = [];
let cache: CartItem[] | undefined;
const listeners = new Set<() => void>();

function read(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function write(items: CartItem[]) {
  cache = items;
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* private mode / quota: cart still works for this tab */ }
  listeners.forEach((l) => l());
}
const get = () => (cache ??= read());

export const cart = {
  add: (item: Omit<CartItem, "key">) => write([...get(), { ...item, key: crypto.randomUUID() }]),
  update: (key: string, patch: Partial<CartItem>) => write(get().map((i) => (i.key === key ? { ...i, ...patch } : i))),
  remove: (key: string) => write(get().filter((i) => i.key !== key)),
  clear: () => write([]),
};

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = undefined; fn(); } }; // other tabs
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(fn); window.removeEventListener("storage", onStorage); };
}

export const useCart = () => useSyncExternalStore(subscribe, get, () => EMPTY);

/** Today's date, only after hydration (null during prerender) — for delivery estimates. */
const today = () => new Date().toDateString();
export function useToday() {
  const d = useSyncExternalStore(() => () => {}, today, () => null);
  return d ? new Date(d) : null;
}
