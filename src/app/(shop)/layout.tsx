import Link from "next/link";
import { getCatalog } from "@/lib/catalog-store";
import { BUSINESS } from "@/lib/content";
import { CatalogProvider } from "@/components/catalog-provider";
import { CartButton } from "@/components/cart-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Chat } from "@/components/chat";

const INFO = [["/about", "אודות"], ["/faq", "שאלות נפוצות"], ["/contact", "צור קשר"], ["/products", "כל המוצרים"]];
const LEGAL = [["/terms", "תקנון"], ["/privacy", "פרטיות"], ["/cancellation", "ביטולים והחזרות"], ["/accessibility", "הצהרת נגישות"]];

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const cat = await getCatalog();
  return (
    <CatalogProvider value={cat}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:z-50 focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-background">דלג לתוכן</a>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 md:flex-nowrap md:gap-6 md:py-3">
          <Link href="/" className="text-xl font-bold tracking-tight">דפוס<span className="text-muted-foreground">.</span></Link>
          <nav aria-label="קטגוריות" className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-3 text-sm text-muted-foreground [scrollbar-width:none] md:order-none md:mx-0 md:w-auto md:flex-1 md:px-0">
            <Link href="/products" className="shrink-0 rounded-lg px-2.5 py-1.5 text-foreground/80 hover:bg-foreground/5 hover:text-foreground">כל המוצרים</Link>
            {cat.categories.map((c) => <Link key={c.id} href={`/c/${c.id}`} className="shrink-0 rounded-lg px-2.5 py-1.5 hover:bg-foreground/5 hover:text-foreground">{c.name}</Link>)}
          </nav>
          <ThemeToggle className="ms-auto md:ms-0" />
          <CartButton />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <footer className="mx-auto mt-16 grid max-w-6xl gap-8 border-t px-4 py-10 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <p className="text-lg font-bold text-foreground">דפוס<span className="text-muted-foreground">.</span></p>
          <p>בית דפוס דיגיטלי — מהקובץ שלך עד הדלת.</p>
          {BUSINESS.phone && <p><a href={`tel:${BUSINESS.phone}`} className="hover:text-foreground" dir="ltr">{BUSINESS.phone}</a></p>}
          {BUSINESS.email && <p><a href={`mailto:${BUSINESS.email}`} className="hover:text-foreground">{BUSINESS.email}</a></p>}
          <p className="text-muted-foreground">© {BUSINESS.legalName || "דפוס"}</p>
        </div>
        <nav className="flex flex-col gap-0.5" aria-label="קטגוריות בתחתית">
          <p className="pb-1 font-medium text-foreground/80">מוצרים</p>
          {cat.categories.map((c) => <Link key={c.id} href={`/c/${c.id}`} className="py-1.5 hover:text-foreground">{c.name}</Link>)}
        </nav>
        <nav className="flex flex-col gap-0.5" aria-label="מידע">
          <p className="pb-1 font-medium text-foreground/80">מידע</p>
          {INFO.map(([h, t]) => <Link key={h} href={h} className="py-1.5 hover:text-foreground">{t}</Link>)}
          <a href="#chat" className="py-1.5 hover:text-foreground">שיחה עם נציג AI</a>
        </nav>
        <nav className="flex flex-col gap-0.5" aria-label="מסמכים משפטיים">
          <p className="pb-1 font-medium text-foreground/80">תנאים</p>
          {LEGAL.map(([h, t]) => <Link key={h} href={h} className="py-1.5 hover:text-foreground">{t}</Link>)}
        </nav>
      </footer>
      <Chat />
    </CatalogProvider>
  );
}
