"use client";

import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { LOCALES, LOCALE_META, isLocale, localePath, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

// Footer-only language picker: each language is a separate path (/en/…, /de/…), same page in the other language.
export function LanguagePicker() {
  const { lang, d } = useI18n();
  const path = usePathname();
  const first = path.split("/")[1];
  const rest = isLocale(first) ? path.slice(first.length + 1) || "/" : path; // strip the current prefix
  return (
    <label className="flex items-center gap-2 text-xs">
      <Globe className="h-4 w-4" aria-hidden />
      <span className="sr-only sm:not-sr-only">{d.footer.language}</span>
      <select value={lang} onChange={(e) => { location.href = localePath(e.target.value as Locale, rest); }}
        className="rounded-lg border border-input bg-background px-2 py-1.5 text-foreground">
        {LOCALES.map((l) => <option key={l} value={l} lang={l}>{LOCALE_META[l].name}</option>)}
      </select>
    </label>
  );
}
