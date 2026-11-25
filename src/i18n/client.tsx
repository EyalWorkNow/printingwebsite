"use client";

import { createContext, use } from "react";
import { localePath, type Locale } from "./config";
import type { Dict } from "./dict/he";
import { fill } from "@/lib/catalog";

// The current locale's dictionary, handed from the [lang] layout to client components.
const Ctx = createContext<{ lang: Locale; d: Dict } | null>(null);
export const I18nProvider = ({ lang, d, children }: { lang: Locale; d: Dict; children: React.ReactNode }) => <Ctx value={{ lang, d }}>{children}</Ctx>;
export function useI18n() {
  const v = use(Ctx);
  if (!v) throw new Error("useI18n outside I18nProvider");
  const { lang, d } = v;
  return { lang, d, href: (p: string) => localePath(lang, p), f: fill };
}
