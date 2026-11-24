import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { THEME_SCRIPT } from "@/components/theme-toggle";

const heebo = Heebo({ variable: "--font-sans", subsets: ["hebrew", "latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3007"),
  title: "דפוס — בית דפוס דיגיטלי",
  description: "חולצות, ספלים, מחברות, כרטיסי ביקור ושילוט ממותגים — מחיר מיידי, הדמיה על המוצר והזמנה עד הבית.",
  openGraph: { type: "website", locale: "he_IL", siteName: "דפוס", images: [{ url: "/img/set-flatlay.webp", width: 1200, height: 1200 }] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
