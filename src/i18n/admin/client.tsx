"use client";

import { createContext, useContext } from "react";
import { LOCALE_META, type Locale } from "../config";
import { ADMIN_DICTS, type AdminDict } from "./index";

const Ctx = createContext<Locale | null>(null);

export function AdminI18nProvider({ lang, children }: { lang: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

export function useAdmin(): { lang: Locale; t: AdminDict; intl: string } {
  const lang = useContext(Ctx) ?? "he";
  return { lang, t: ADMIN_DICTS[lang], intl: LOCALE_META[lang].intl };
}
