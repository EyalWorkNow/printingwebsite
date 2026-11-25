import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "../globals.css";
import { THEME_SCRIPT, A11Y_SCRIPT } from "@/lib/head-scripts";
import { LOCALES, LOCALE_META, localePath } from "@/i18n/config";
import { getI18n, getLocale } from "@/i18n/server";

// SF Hebrew / SF Arabic are Apple's system fonts: every Apple device (any browser) renders them via -apple-system; their
// licence doesn't allow web embedding, so other systems fall back to Heebo (Hebrew/Latin) or the OS font (Arabic: Segoe UI / system-ui).
const heebo = Heebo({ variable: "--font-heebo", subsets: ["hebrew", "latin"] });

export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }));

export async function generateMetadata(): Promise<Metadata> {
  const { lang, d } = await getI18n();
  return {
    metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3007"),
    title: d.meta.title,
    description: d.meta.description,
    openGraph: { type: "website", locale: LOCALE_META[lang].og, siteName: d.meta.brand, images: [{ url: "/img/set-flatlay.webp", width: 1200, height: 1200 }] },
    alternates: { canonical: localePath(lang, "/"), languages: Object.fromEntries(LOCALES.map((l) => [l, localePath(l, "/")])) },
  };
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
