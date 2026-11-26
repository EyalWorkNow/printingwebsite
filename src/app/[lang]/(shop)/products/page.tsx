import { JsonLd, itemListLd, pageMeta } from "@/lib/seo";
import Link from "next/link";
import { fromPrice, liveProducts, num } from "@/lib/catalog";
import { getLocalizedCatalog } from "@/lib/catalog-store";
import { ProductCard } from "@/components/product-card";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { lang, d } = await getI18n();
  return pageMeta(lang, "/products", { title: `${d.products.title} — ${d.meta.titleSuffix}`, description: d.products.metaDesc });
}

export default async function Products() {
  const { lang, d, href, f } = await getI18n();
  const cat = await getLocalizedCatalog(lang);
  const products = liveProducts(cat);
  return (
    <div className="space-y-12">
      <JsonLd data={itemListLd(products, lang)} />
      <header className="space-y-2">
        <h1 className="text-3xl font-bold md:text-4xl">{d.products.title}</h1>
        <p className="text-muted-foreground">{f(d.products.summary, { n: num(cat, products.length), vatNote: d.vat.included })}</p>
        <nav className="flex flex-wrap gap-2 pt-2" aria-label={d.products.jump}>
          {cat.categories.map((c) => <a key={c.id} href={`#${c.id}`} className="rounded-full border px-3 py-1 text-sm text-foreground/80 hover:border-foreground/40 hover:text-foreground">{c.name}</a>)}
        </nav>
      </header>
      {cat.categories.map((c) => {
        const items = products.filter((p) => p.category === c.id);
        return items.length > 0 && (
          <section key={c.id} id={c.id} className="scroll-mt-24 space-y-4">
            <h2 className="flex items-baseline gap-3 text-2xl font-semibold">{c.name}<Link href={href(`/c/${c.id}`)} className="py-2 text-sm font-normal text-muted-foreground hover:text-foreground">{d.products.toCategory}</Link></h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((p) => <li key={p.id}><ProductCard p={p} from={fromPrice(cat, p)} /></li>)}</ul>
          </section>
        );
      })}
    </div>
  );
}
