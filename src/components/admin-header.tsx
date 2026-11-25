"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { LOCALES, LOCALE_META, type Locale } from "@/i18n/config";
import { ADMIN_LANG_COOKIE } from "@/i18n/admin";
import { useAdmin } from "@/i18n/admin/client";

export function AdminHeader({ active }: { active: "orders" | "catalog" | "markets" }) {
  const { lang, t } = useAdmin();
  const router = useRouter();
  const tab = (on: boolean) => `rounded-lg px-3 py-1.5 ${on ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`;
  const setLang = (l: Locale) => {
    document.cookie = `${ADMIN_LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    const h = document.documentElement; h.lang = l; h.dir = LOCALE_META[l].dir;
    router.refresh();
  };
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="text-xl font-bold">{t.brand}<span className="text-muted-foreground">.</span> <span className="text-base font-normal text-muted-foreground">{t.admin}</span></span>
      <nav className="flex flex-wrap gap-1 text-sm" aria-label={t.nav.aria}>
        <Link href="/admin" className={tab(active === "orders")}>{t.nav.orders}</Link>
        <Link href="/admin/catalog" className={tab(active === "catalog")}>{t.nav.catalog}</Link>
        <Link href="/admin/markets" className={tab(active === "markets")}>{t.nav.markets}</Link>
      </nav>
      <label className="ms-auto flex items-center gap-1.5 text-sm text-muted-foreground">
        <Languages className="h-4 w-4" aria-hidden />
        <span className="sr-only">{t.nav.uiLang}</span>
        <select value={lang} onChange={(e) => setLang(e.target.value as Locale)} className="rounded-lg border border-input bg-background px-2 py-1.5 text-foreground">
          {LOCALES.map((l) => <option key={l} value={l} lang={l}>{LOCALE_META[l].name}</option>)}
        </select>
      </label>
      <ThemeToggle t={{ toLight: t.theme.light, toDark: t.theme.dark, light: t.theme.light, dark: t.theme.dark }} />
      <Link href="/" className="py-2 text-sm text-muted-foreground hover:text-foreground">{t.nav.site} <span className="inline-block rtl:rotate-180">→</span></Link>
    </header>
  );
}
