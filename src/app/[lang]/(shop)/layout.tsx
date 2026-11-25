import Link from "next/link";
import { getLocalizedCatalog } from "@/lib/catalog-store";
import { BUSINESS, legalName } from "@/lib/content";
import { CatalogProvider } from "@/components/catalog-provider";
import { CartButton } from "@/components/cart-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Chat } from "@/components/chat";
import { A11yMenu } from "@/components/a11y-menu";
import { LanguagePicker } from "@/components/language-picker";
import { I18nProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";

export default async function ShopLayout({ children }: LayoutProps<"/[lang]">) {
  const { lang, d, href } = await getI18n();
  const cat = await getLocalizedCatalog(lang);
  const info = [["/about", d.footer.about], ["/faq", d.footer.faq], ["/contact", d.footer.contact], ["/products", d.nav.allProducts]];
  const legal = [["/terms", d.footer.terms], ["/privacy", d.footer.privacy], ["/cancellation", d.footer.cancellation], ["/accessibility", d.footer.accessibility]];
  const brand = lang === "he" ? BUSINESS.brand : d.meta.brand;
  return (
    <I18nProvider lang={lang} d={d}>
      <CatalogProvider value={cat}>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-50 focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-background">{d.nav.skip}</a>
        <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 md:flex-nowrap md:gap-6 md:py-3">
            <Link href={href("/")} className="text-xl font-bold tracking-tight">{brand}<span className="text-muted-foreground">.</span></Link>
            <nav aria-label={d.nav.categories} className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-3 text-sm text-muted-foreground [scrollbar-width:none] md:order-none md:mx-0 md:w-auto md:flex-1 md:px-0">
              <Link href={href("/products")} className="shrink-0 rounded-lg px-2.5 py-1.5 text-foreground/80 hover:bg-foreground/5 hover:text-foreground">{d.nav.allProducts}</Link>
              {cat.categories.map((c) => <Link key={c.id} href={href(`/c/${c.id}`)} className="shrink-0 rounded-lg px-2.5 py-1.5 hover:bg-foreground/5 hover:text-foreground">{c.name}</Link>)}
            </nav>
            <ThemeToggle className="ms-auto md:ms-0" t={d.theme} />
            <CartButton />
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto mt-16 max-w-6xl border-t px-4 py-10 text-sm text-muted-foreground">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-lg font-bold text-foreground">{brand}<span className="text-muted-foreground">.</span></p>
              <p>{d.footer.tagline}</p>
              {BUSINESS.phone && <p><a href={`tel:${BUSINESS.phone}`} className="hover:text-foreground" dir="ltr">{BUSINESS.phone}</a></p>}
              {BUSINESS.email && <p><a href={`mailto:${BUSINESS.email}`} className="hover:text-foreground">{BUSINESS.email}</a></p>}
              <p>© {lang === "he" ? legalName() : BUSINESS.legalName || brand}</p>
            </div>
            <nav className="flex flex-col gap-0.5" aria-label={d.footer.productsAria}>
              <p className="pb-1 font-medium text-foreground/80">{d.footer.products}</p>
              {cat.categories.map((c) => <Link key={c.id} href={href(`/c/${c.id}`)} className="py-1.5 hover:text-foreground">{c.name}</Link>)}
            </nav>
            <nav className="flex flex-col gap-0.5" aria-label={d.footer.info}>
              <p className="pb-1 font-medium text-foreground/80">{d.footer.info}</p>
              {info.map(([h, t]) => <Link key={h} href={href(h)} className="py-1.5 hover:text-foreground">{t}</Link>)}
              <a href="#chat" className="py-1.5 hover:text-foreground">{d.footer.chat}</a>
            </nav>
            <nav className="flex flex-col gap-0.5" aria-label={d.footer.legalAria}>
              <p className="pb-1 font-medium text-foreground/80">{d.footer.legal}</p>
              {legal.map(([h, t]) => <Link key={h} href={href(h)} className="py-1.5 hover:text-foreground">{t}</Link>)}
            </nav>
          </div>
          <div className="mt-8 flex justify-end border-t pt-6"><LanguagePicker /></div>
        </footer>
        <Chat />
        <A11yMenu />
      </CatalogProvider>
    </I18nProvider>
  );
}
