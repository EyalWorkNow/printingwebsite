import { SITE_URL } from "@/lib/env";
import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "../globals.css";
import { THEME_SCRIPT, A11Y_SCRIPT } from "@/lib/head-scripts";
import { LOCALES, LOCALE_META } from "@/i18n/config";
import { pageMeta } from "@/lib/seo";
import { getI18n, getLocale } from "@/i18n/server";

// SF Hebrew / SF Arabic are Apple's system fonts: every Apple device (any browser) renders them via -apple-system; their
// licence doesn't allow web embedding, so other systems fall back to Heebo (Hebrew/Latin) or the OS font (Arabic: Segoe UI / system-ui).
const heebo = Heebo({ variable: "--font-heebo", subsets: ["hebrew", "latin"] });

export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }));

export async function generateMetadata(): Promise<Metadata> {
  const { lang, d } = await getI18n();
  // defaults = the home page; every other page sets its own canonical/hreflang/OG via pageMeta
  return { metadataBase: new URL(SITE_URL), applicationName: d.meta.brand, ...pageMeta(lang, "/", { title: d.meta.title, description: d.meta.description }) };
}


export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const lang = await getLocale();
  return (
    <html lang={lang} dir={LOCALE_META[lang].dir} className={`${heebo.variable} h-full antialiased`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT + A11Y_SCRIPT }} /></head>
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
