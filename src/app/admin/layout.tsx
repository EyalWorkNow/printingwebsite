import { Suspense } from "react";
import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "../globals.css";
import { THEME_SCRIPT } from "@/lib/head-scripts";
import { ADMIN_LANG_SCRIPT } from "@/i18n/admin";
import { adminI18n } from "@/i18n/admin/server";
import { AdminI18nProvider } from "@/i18n/admin/client";

// The admin has its own root layout; its UI language comes from a cookie (switcher in the admin header).
const heebo = Heebo({ variable: "--font-heebo", subsets: ["hebrew", "latin"] });
export const metadata: Metadata = { title: "Dfus · Admin", robots: { index: false } };

export default function AdminRoot({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT + ADMIN_LANG_SCRIPT }} /></head>
      <body className="min-h-full bg-background text-foreground">
        <Suspense fallback={null}><Shell>{children}</Shell></Suspense>
      </body>
    </html>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const { lang, dir } = await adminI18n();
  return <AdminI18nProvider lang={lang}><div lang={lang} dir={dir} className="min-h-full">{children}</div></AdminI18nProvider>;
}
