import Link from "next/link";
import { getCatalog } from "@/lib/catalog-store";
import { BUSINESS } from "@/lib/content";
import { CatalogProvider } from "@/components/catalog-provider";
import { CartButton } from "@/components/cart-button";
import { Chat } from "@/components/chat";

const INFO = [["/about", "אודות"], ["/faq", "שאלות נפוצות"], ["/contact", "צור קשר"], ["/products", "כל המוצרים"]];
const LEGAL = [["/terms", "תקנון"], ["/privacy", "פרטיות"], ["/cancellation", "ביטולים והחזרות"], ["/accessibility", "הצהרת נגישות"]];

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const cat = await getCatalog();
  return (
    <CatalogProvider value={cat}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-black">דלג לתוכן</a>
      <header className="sticky top-0 z-40 border-b bg-black/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:gap-6">
          <Link href="/" className="text-xl font-bold tracking-tight">דפוס<span className="text-neutral-500">.</span></Link>
          <nav aria-label="קטגוריות" className="-mx-1 flex flex-1 gap-1 overflow-x-auto text-sm text-neutral-400 [scrollbar-width:none]">
            <Link href="/products" className="shrink-0 rounded-lg px-2.5 py-1.5 text-neutral-200 hover:bg-white/5 hover:text-white">כל המוצרים</Link>
            {cat.categories.map((c) => <Link key={c.id} href={`/c/${c.id}`} className="shrink-0 rounded-lg px-2.5 py-1.5 hover:bg-white/5 hover:text-white">{c.name}</Link>)}
          </nav>
          <CartButton />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <footer className="mx-auto mt-16 grid max-w-6xl gap-8 border-t px-4 py-10 text-sm text-neutral-400 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <p className="text-lg font-bold text-white">דפוס<span className="text-neutral-500">.</span></p>
          <p>בית דפוס דיגיטלי — מהקובץ שלך עד הדלת.</p>
          {BUSINESS.phone && <p><a href={`tel:${BUSINESS.phone}`} className="hover:text-white" dir="ltr">{BUSINESS.phone}</a></p>}
          {BUSINESS.email && <p><a href={`mailto:${BUSINESS.email}`} className="hover:text-white">{BUSINESS.email}</a></p>}
          <p className="text-neutral-600">© {BUSINESS.legalName || "דפוס"}</p>
        </div>
        <nav className="flex flex-col gap-2" aria-label="קטגוריות בתחתית">
          <p className="font-medium text-neutral-200">מוצרים</p>
          {cat.categories.map((c) => <Link key={c.id} href={`/c/${c.id}`} className="hover:text-white">{c.name}</Link>)}
        </nav>
        <nav className="flex flex-col gap-2" aria-label="מידע">
          <p className="font-medium text-neutral-200">מידע</p>
          {INFO.map(([h, t]) => <Link key={h} href={h} className="hover:text-white">{t}</Link>)}
          <a href="#chat" className="hover:text-white">שיחה עם נציג AI</a>
        </nav>
        <nav className="flex flex-col gap-2" aria-label="מסמכים משפטיים">
          <p className="font-medium text-neutral-200">תנאים</p>
          {LEGAL.map(([h, t]) => <Link key={h} href={h} className="hover:text-white">{t}</Link>)}
        </nav>
      </footer>
      <Chat />
    </CatalogProvider>
  );
}
