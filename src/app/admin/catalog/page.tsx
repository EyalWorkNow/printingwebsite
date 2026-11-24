import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { Settings2, EyeOff } from "lucide-react";
import { fromPrice, ils, PRODUCTION_IDS, liveShipping } from "@/lib/catalog";
import { readCatalog } from "@/lib/catalog-store";
import { AdminHeader } from "@/components/admin-header";
import { GlowCard } from "@/components/glow-card";

export const metadata = { title: "מוצרים ומחירים — דפוס", robots: { index: false } };

export default function CatalogAdmin() {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <AdminHeader active="catalog" />
      <Suspense fallback={<p className="text-neutral-500">טוען…</p>}><List /></Suspense>
    </main>
  );
}

async function List() {
  await connection();
  const cat = await readCatalog();
  return (
    <>
      <Link href="/admin/catalog/settings" className="block">
        <GlowCard inner="flex flex-wrap items-center gap-x-6 gap-y-2 p-5 text-sm">
          <Settings2 className="h-5 w-5 text-neutral-400" />
          <span className="font-semibold">זמני ייצור ומשלוחים</span>
          <span className="text-neutral-400">{PRODUCTION_IDS.map((id) => `${cat.production[id].label} ${cat.production[id].pct > 0 ? "+" : ""}${Math.round(cat.production[id].pct * 100)}%`).join(" · ")}</span>
          <span className="text-neutral-400">{liveShipping(cat).map((id) => `${cat.shipping[id].label} ${cat.shipping[id].price ? ils(cat.shipping[id].price) : "חינם"}`).join(" · ")}</span>
          <span className="ms-auto text-neutral-500">עריכה ←</span>
        </GlowCard>
      </Link>
      {cat.categories.map((c) => (
        <section key={c.id} className="space-y-3">
          <h2 className="text-lg font-semibold">{c.name}</h2>
          <ul className="divide-y rounded-2xl border bg-neutral-950">
            {cat.products.filter((p) => p.category === c.id).map((p) => (
              <li key={p.id}>
                <Link href={`/admin/catalog/${p.id}`} className="grid grid-cols-2 items-center gap-x-4 gap-y-1 p-4 text-sm hover:bg-white/[.03] md:grid-cols-[1fr_9rem_9rem_8rem_4rem]">
                  <span className="font-medium">{p.name} {p.active === false && <span className="ms-2 inline-flex items-center gap-1 rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-500"><EyeOff className="h-3 w-3" /> מוסתר</span>}</span>
                  <span className="text-neutral-400">החל מ־{ils(fromPrice(cat, p))} ליח׳</span>
                  <span className="text-neutral-400">{p.qty.min.toLocaleString("he-IL")}–{p.qty.max.toLocaleString("he-IL")} יח׳</span>
                  <span className="text-neutral-500">{p.options.length === 1 ? "אפשרות אחת" : `${p.options.length} אפשרויות`}</span>
                  <span className="text-left text-neutral-500">עריכה ←</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-xs text-neutral-500">המחירים נשמרים בקובץ data/catalog.json, וכל שמירה שומרת עותק של הגרסה הקודמת ב-data/catalog-history.</p>
    </>
  );
}
