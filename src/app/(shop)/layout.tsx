import Link from "next/link";
import { getCatalog } from "@/lib/catalog-store";
import { CatalogProvider } from "@/components/catalog-provider";
import { CartButton } from "@/components/cart-button";
import { Chat } from "@/components/chat";

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const cat = await getCatalog();
  return (
    <CatalogProvider value={cat}>
      <header className="sticky top-0 z-40 border-b bg-black/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link href="/" className="text-xl font-bold tracking-tight">דפוס<span className="text-neutral-500">.</span></Link>
          <nav aria-label="קטגוריות" className="-mx-1 flex flex-1 gap-1 overflow-x-auto text-sm text-neutral-400 [scrollbar-width:none]">
            {cat.categories.map((c) => <Link key={c.id} href={`/c/${c.id}`} className="shrink-0 rounded-lg px-2.5 py-1.5 hover:bg-white/5 hover:text-white">{c.name}</Link>)}
          </nav>
          <CartButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <footer className="mx-auto grid max-w-6xl gap-8 border-t px-4 py-10 text-sm text-neutral-400 sm:grid-cols-3">
        <div className="space-y-2">
          <p className="text-lg font-bold text-white">דפוס<span className="text-neutral-500">.</span></p>
          <p>בית דפוס דיגיטלי — מהקובץ שלך עד הדלת.</p>
          <p className="text-neutral-600">© דפוס</p>
        </div>
        <nav className="flex flex-col gap-2" aria-label="ניווט תחתון">
          {cat.categories.map((c) => <Link key={c.id} href={`/c/${c.id}`} className="hover:text-white">{c.name}</Link>)}
        </nav>
        <div className="flex flex-col gap-2">
          <Link href="/#faq" className="hover:text-white">שאלות נפוצות</Link>
          <a href="#chat" className="hover:text-white">שיחה עם נציג AI</a>
          <Link href="/cart" className="hover:text-white">עגלת קניות</Link>
          <p>ייצור מיום עסקים אחד · משלוח לכל הארץ</p>
        </div>
      </footer>
      <Chat />
    </CatalogProvider>
  );
}
