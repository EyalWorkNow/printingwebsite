import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { DEFAULT_CATALOG, fromPrice, money, withVat, type Catalog } from "@/lib/catalog";
import { AdminHeader } from "@/components/admin-header";
import { ProductEditor } from "@/components/admin/product-editor";
import { Spinner } from "@/components/admin/common";
import { localized, readCatalog } from "@/lib/catalog-store";
import { LOCALES } from "@/i18n/config";

const fromPriceText = (c: Catalog, id: string) => { const p = c.products.find((x) => x.id === id); return p ? money(c)(withVat(fromPrice(c, p), c)) : "—"; };

export default function EditProduct({ params }: PageProps<"/admin/catalog/[id]">) {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <AdminHeader active="catalog" />
      <Suspense fallback={<Spinner />}><Body params={params} /></Suspense>
    </main>
  );
}

async function Body({ params }: { params: PageProps<"/admin/catalog/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  const cat = await readCatalog();
  if (!cat.products.some((p) => p.id === id)) notFound();
  // the product's saved price in every market (computed server-side: localized catalogs need the translation tables)
  const markets = await Promise.all(LOCALES.filter((l) => l !== "he").map(async (l) => {
    const lc = await localized(cat, l);
    return { lang: l, from: fromPriceText(lc, id) };
  }));
  return <ProductEditor catalog={cat} id={id} builtin={DEFAULT_CATALOG.products.some((p) => p.id === id)} markets={markets} />;
}
