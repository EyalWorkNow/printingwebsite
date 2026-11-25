import { Suspense } from "react";
import { connection } from "next/server";
import { fromPrice, withVat } from "@/lib/catalog";
import { localized, readCatalog } from "@/lib/catalog-store";
import { HAS_DB } from "@/lib/db";
import { LOCALES, type Locale } from "@/i18n/config";
import { MARKETS } from "@/i18n/markets";
import { AdminHeader } from "@/components/admin-header";
import { MarketsEditor, type MarketRow } from "@/components/admin/markets-editor";
import { NoDb, Spinner } from "@/components/admin/common";
import { adminI18n } from "@/i18n/admin/server";

export default function MarketsPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <AdminHeader active="markets" />
      <Suspense fallback={<Spinner />}><Body /></Suspense>
    </main>
  );
}

async function Body() {
  await connection();
  const [cat, { lang: ui }] = await Promise.all([readCatalog(), adminI18n()]);
  const names = ui === "he" ? cat : await localized(cat, ui); // product names in the admin's language
  const rows: MarketRow[] = await Promise.all(LOCALES.filter((l): l is Exclude<Locale, "he"> => l !== "he").map(async (lang) => {
    const lc = await localized(cat, lang), m = MARKETS[lang];
    return {
      lang, currency: m.market.currency, vat: m.market.vat, intl: m.market.intl, fxDefault: m.fx, saved: cat.markets?.[lang] ?? {},
      products: lc.products.map((p) => ({ id: p.id, name: names.products.find((x) => x.id === p.id)?.name ?? p.name, active: p.active !== false, from: withVat(fromPrice(lc, p), lc) })),
    };
  }));
  return <>{!HAS_DB && <NoDb />}<MarketsEditor rows={rows} /></>;
}
