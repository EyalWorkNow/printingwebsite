import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "../globals.css";
import { THEME_SCRIPT } from "@/lib/head-scripts";

// The admin has its own root layout (Hebrew only); the shop's root layout lives under app/[lang].
const heebo = Heebo({ variable: "--font-heebo", subsets: ["hebrew", "latin"] });
export const metadata: Metadata = { title: "ניהול — דפוס", robots: { index: false } };

export default function AdminRoot({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
