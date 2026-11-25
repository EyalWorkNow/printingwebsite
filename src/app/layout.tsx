import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { THEME_SCRIPT, A11Y_SCRIPT } from "@/lib/head-scripts";

// SF Hebrew is Apple's system font: every Apple device (any browser) renders it via -apple-system; its licence doesn't
// allow web embedding, so other systems fall back to Heebo (closest free match), loaded as a webfont.
const heebo = Heebo({ variable: "--font-heebo", subsets: ["hebrew", "latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3007"),
  title: "דפוס — בית דפוס דיגיטלי",
  description: "חולצות, ספלים, מחברות, כרטיסי ביקור ושילוט ממותגים — מחיר מיידי, הדמיה על המוצר והזמנה עד הבית.",
  openGraph: { type: "website", locale: "he_IL", siteName: "דפוס", images: [{ url: "/img/set-flatlay.webp", width: 1200, height: 1200 }] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT + A11Y_SCRIPT }} /></head>
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
