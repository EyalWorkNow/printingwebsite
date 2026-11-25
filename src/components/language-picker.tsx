"use client";

import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { LOCALES, LOCALE_META, isLocale, localePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

// Footer-only language picker: each language is a separate path (/en/…, /de/…), same page in the other language.
export function LanguagePicker() {
  const { lang, d } = useI18n();
  const path = usePathname();
  const first = path.split("/")[1];
  const rest = isLocale(first) ? path.slice(first.length + 1) || "/" : path; // strip the current prefix
  return (
    <nav aria-label={d.footer.language} className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
      <Globe className="me-1 h-4 w-4" aria-hidden />
      <span className="me-2 font-medium text-foreground/80">{d.footer.language}:</span>
      {LOCALES.map((l) => (
        <a key={l} href={localePath(l, rest)} lang={l} hrefLang={l} aria-current={l === lang ? "true" : undefined}
          className={`rounded-lg px-2 py-1 ${l === lang ? "bg-foreground/10 font-medium text-foreground" : "hover:bg-foreground/5 hover:text-foreground"}`}>
          {LOCALE_META[l].name}
        </a>
      ))}
    </nav>
  );
}
