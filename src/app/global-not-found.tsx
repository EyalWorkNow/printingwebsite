import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { THEME_SCRIPT } from "@/lib/head-scripts";

// Unmatched URLs outside the shop's [lang] tree (the shop's own 404 is app/[lang]/not-found.tsx).
export const metadata: Metadata = { title: "404" };

export default function GlobalNotFound() {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Hebrew', 'Segoe UI', system-ui, sans-serif" }}>
        <p className="text-7xl font-bold text-muted-foreground">404</p>
        <p dir="rtl">העמוד לא נמצא</p>
        <p>Page not found</p>
        <Link href="/" className="rounded-lg bg-foreground px-5 py-2.5 font-medium text-background">Home</Link>
      </body>
    </html>
  );
}
