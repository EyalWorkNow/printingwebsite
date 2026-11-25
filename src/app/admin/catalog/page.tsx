import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import Image from "next/image";
import { Settings2, EyeOff, Globe } from "lucide-react";
import { fill, fromPrice, ils, PRODUCTION_IDS, liveShipping } from "@/lib/catalog";
import { readCatalog } from "@/lib/catalog-store";
import { HAS_DB } from "@/lib/db";
import { adminI18n } from "@/i18n/admin/server";
import { AdminHeader } from "@/components/admin-header";
import { GlowCard } from "@/components/glow-card";
import { NewProduct } from "@/components/admin/new-product";
import { NoDb, Spinner } from "@/components/admin/common";

export default function CatalogAdmin() {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <AdminHeader active="catalog" />
      <Suspense fallback={<Spinner />}><List /></Suspense>
    </main>
  );
}

async function List() {
  await connection();
  const [cat, { t, intl }] = await Promise.all([readCatalog(), adminI18n()]);
  const T = t.catalog, n = (x: number) => x.toLocaleString(intl);
  const arrow = <span className="inline-block rtl:rotate-180">→</span>;
  return (
    <>
      {!HAS_DB && <NoDb />}
      <NewProduct categories={cat.categories} />
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/catalog/settings" className="block">
          <GlowCard inner="flex flex-wrap items-center gap-x-4 gap-y-2 p-5 text-sm">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">{T.settingsCard}</span>
            <span className="w-full text-muted-foreground">{PRODUCTION_IDS.map((id) => `${cat.production[id].label} ${cat.production[id].pct > 0 ? "+" : ""}${Math.round(cat.production[id].pct * 100)}%`).join(" · ")}</span>
            <span className="w-full text-muted-foreground">{liveShipping(cat).map((id) => `${cat.shipping[id].label} ${cat.shipping[id].price ? ils(cat.shipping[id].price) : t.orders.free}`).join(" · ")}</span>
          </GlowCard>
        </Link>
        <Link href="/admin/markets" className="block">
          <GlowCard inner="flex flex-wrap items-center gap-x-4 gap-y-2 p-5 text-sm">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">{T.marketsCard}</span>
            <span className="w-full text-muted-foreground">USD · EUR · AED</span>
            <span className="text-muted-foreground">{T.edit} {arrow}</span>
          </GlowCard>
        </Link>
      </div>
      {cat.categories.map((c) => (
        <section key={c.id} className="space-y-3">
          <h2 className="text-lg font-semibold">{c.name}</h2>
          <ul className="divide-y rounded-2xl border bg-card">
            {cat.products.filter((p) => p.category === c.id).map((p) => (
              <li key={p.id}>
                <Link href={`/admin/catalog/${p.id}`} className="grid grid-cols-[3rem_1fr] items-center gap-x-4 gap-y-1 p-3 text-sm hover:bg-foreground/[.03] md:grid-cols-[3rem_1fr_9rem_9rem_8rem_5rem]">
                  <span className="relative row-span-2 h-12 w-12 overflow-hidden rounded-lg border bg-muted md:row-span-1">{p.image && <Image src={p.image} alt="" fill sizes="48px" className="object-cover" />}</span>
                  <span className="font-medium">{p.name} {p.active === false && <span className="ms-2 inline-flex items-center gap-1 rounded-full border border-foreground/20 px-2 py-0.5 text-xs text-muted-foreground"><EyeOff className="h-3 w-3" /> {T.hidden}</span>}</span>
                  <span className="text-muted-foreground">{fill(T.from, { x: ils(fromPrice(cat, p)) })}</span>
                  <span className="text-muted-foreground">{fill(T.units, { min: n(p.qty.min), max: n(p.qty.max) })}</span>
                  <span className="text-muted-foreground">{p.options.length === 1 ? T.oneOption : fill(T.nOptions, { n: p.options.length })}</span>
                  <span className="text-end text-muted-foreground">{T.edit} {arrow}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-xs text-muted-foreground">{T.note}</p>
    </>
  );
}
