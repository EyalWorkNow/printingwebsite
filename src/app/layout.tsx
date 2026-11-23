import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({ variable: "--font-sans", subsets: ["hebrew", "latin"] });

export const metadata: Metadata = {
  title: "דפוס — בית דפוס דיגיטלי",
  description: "בוחרים מוצר, מעלים גרפיקה, רואים מוקאפ ומזמינים עד הבית.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={`dark ${heebo.variable} h-full antialiased`}>
      <body className="min-h-full bg-black">{children}</body>
    </html>
  );
}
