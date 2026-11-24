import { fromPrice, liveProducts } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-store";
import { ProductCard } from "@/components/product-card";
import Link from "next/link";

export const metadata = { title: "כל המוצרים — דפוס", description: "כל מוצרי הדפוס והמיתוג: כרטיסי ביקור, פליירים, מדבקות, שילוט, ביגוד ומוצרי פרסום — מחיר מיידי והזמנה אונליין." };

export default async function Products() {
  const cat = await getCatalog();
  const products = liveProducts(cat);
  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold md:text-4xl">כל המוצרים</h1>
        <p className="text-muted-foreground">{products.length} מוצרים · מחיר מיידי לכל שילוב · כל המחירים כוללים מע״מ</p>
        <nav className="flex flex-wrap gap-2 pt-2" aria-label="קפיצה לקטגוריה">
          {cat.categories.map((c) => <a key={c.id} href={`#${c.id}`} className="rounded-full border px-3 py-1 text-sm text-foreground/80 hover:border-foreground/40 hover:text-foreground">{c.name}</a>)}
        </nav>
      </header>
      {cat.categories.map((c) => {
        const items = products.filter((p) => p.category === c.id);
        return items.length > 0 && (
          <section key={c.id} id={c.id} className="scroll-mt-24 space-y-4">
            <h2 className="flex items-baseline gap-3 text-2xl font-semibold">{c.name}<Link href={`/c/${c.id}`} className="py-2 text-sm font-normal text-muted-foreground hover:text-foreground">לעמוד הקטגוריה ←</Link></h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((p) => <li key={p.id}><ProductCard p={p} from={fromPrice(cat, p)} /></li>)}</ul>
          </section>
        );
      })}
    </div>
  );
}
