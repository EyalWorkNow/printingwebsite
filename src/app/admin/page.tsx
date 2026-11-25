import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { ChevronDown, Download, MessageCircle, Globe, Mail } from "lucide-react";
import { NoDb, Spinner } from "@/components/admin/common";
import { listOrders, orderStats, STATUSES, type Order } from "@/lib/orders";
import { HAS_DB } from "@/lib/db";
import { fill, lineFiles, money, type Market, type SideFile } from "@/lib/catalog";
import { LOCALES, LOCALE_META, isLocale } from "@/i18n/config";
import { adminI18n } from "@/i18n/admin/server";
import { GlowCard } from "@/components/glow-card";
import { updateStatus } from "./actions";
import { AdminHeader } from "@/components/admin-header";

const TONE: Record<Order["status"], string> = {
  "התקבלה": "border-sky-600/60 dark:border-sky-700 text-sky-700 dark:text-sky-300", "בהכנה": "border-amber-500/60 dark:border-amber-800/60 text-amber-700 dark:text-amber-300",
  "נשלחה": "border-emerald-600/60 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300", "בוטלה": "border-foreground/20 text-muted-foreground",
};
/** Formatter for an amount in `currency`, written the admin-language way. */
const fmt = (currency: string, intl: string) => money({ market: { currency, intl: currency === "ILS" ? "he-IL" : intl, vat: 0, weekend: [] } as Market });

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <AdminHeader active="orders" />
      <Suspense fallback={<Spinner />}><Orders searchParams={searchParams} /></Suspense>
    </main>
  );
}

async function Orders({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await connection();
  if (!HAS_DB) return <NoDb />;
  const { t, intl } = await adminI18n();
  const T = t.orders;
  const sp = (await searchParams) as { status?: string; q?: string; lang?: string };
  const status = STATUSES.find((s) => s === sp.status), lang = isLocale(sp.lang) ? sp.lang : undefined, term = sp.q?.trim().slice(0, 100) || undefined;
  const [shown, stats] = await Promise.all([listOrders({ status, lang, q: term }), orderStats()]);
  const n = (x: number) => x.toLocaleString(intl);
  const date = (iso: string) => new Date(iso).toLocaleString(intl, { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" });
  const total = Object.values(stats.byStatus).reduce((a, b) => a + b, 0);
  const href = (p: { status?: string; lang?: string }) => `/admin?${new URLSearchParams({ ...(p.status && { status: p.status }), ...(p.lang && { lang: p.lang }), ...(term && { q: term }) })}`;
  const chip = (on: boolean) => `rounded-full border px-3 py-1 text-sm ${on ? "border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-3">
        <GlowCard inner="space-y-2"><p className="text-sm text-muted-foreground">{T.total}</p><p className="text-3xl font-semibold">{n(total)}</p></GlowCard>
        <GlowCard inner="space-y-2"><p className="text-sm text-muted-foreground">{T.open}</p><p className="text-3xl font-semibold">{n((stats.byStatus[STATUSES[0]] ?? 0) + (stats.byStatus[STATUSES[1]] ?? 0))}</p></GlowCard>
        <GlowCard inner="space-y-2">
          <p className="text-sm text-muted-foreground">{T.revenue}</p>
          {stats.revenue.length ? stats.revenue.map((r, i) => (
            <p key={r.currency} className={i ? "text-lg font-medium text-foreground/80" : "text-3xl font-semibold"} dir="ltr">{fmt(r.currency, intl)(r.total)}</p>
          )) : <p className="text-3xl font-semibold">{T.noRevenue}</p>}
        </GlowCard>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {[undefined, ...STATUSES].map((s) => (
            <Link key={s ?? "all"} href={href({ status: s, lang })} className={chip(status === s)}>
              {s ? t.statuses[s] : T.all} <span className="text-muted-foreground">{n(s ? stats.byStatus[s] ?? 0 : total)}</span>
            </Link>
          ))}
          <form className="w-full sm:ms-auto sm:w-auto">
            {status && <input type="hidden" name="status" value={status} />}
            {lang && <input type="hidden" name="lang" value={lang} />}
            <input name="q" defaultValue={term} placeholder={T.search} aria-label={T.search} className="w-full rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm outline-none focus:border-foreground/50 sm:w-80" />
          </form>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm" aria-label={T.byLang}>
          <Globe className="h-4 w-4 text-muted-foreground" aria-hidden />
          <Link href={href({ status })} className={chip(!lang)}>{T.allLangs}</Link>
          {LOCALES.filter((l) => stats.byLang[l]).map((l) => (
            <Link key={l} href={href({ status, lang: l })} className={chip(lang === l)} lang={l}>{LOCALE_META[l].name} <span className="text-muted-foreground">{n(stats.byLang[l])}</span></Link>
          ))}
        </div>
      </section>

      {shown.length === 0 ? <p className="py-16 text-center text-muted-foreground">{T.none}</p> : (
        <ul className="space-y-3">
          {shown.map((o) => {
            const m = fmt(o.currency ?? "ILS", intl), ol = o.lang ?? "he";
            return (
              <li key={o.id}>
                <details className="group rounded-2xl border bg-card open:border-foreground/20">
                  <summary className="grid cursor-pointer list-none grid-cols-2 items-center gap-x-4 gap-y-1 p-4 text-sm md:grid-cols-[8rem_1fr_1fr_7rem_6rem_6.5rem_1rem]">
                    <span className="font-mono text-foreground/80">{o.id}</span>
                    <span className="font-medium">{o.customer.name} <span className="text-muted-foreground">· {o.customer.city ?? T.pickup}</span>
                      {ol !== "he" && <span className="ms-2 rounded-full border px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground" lang={ol}>{LOCALE_META[ol].name}</span>}</span>
                    <span className="truncate text-muted-foreground">{o.items.map((l) => `${n(l.quantity)} × ${l.productName}`).join(" · ")}</span>
                    <span className="font-semibold" dir="ltr">{m(o.totals.total)}</span>
                    <span className="text-xs text-muted-foreground">{date(o.createdAt)}</span>
                    <span className={`w-fit rounded-full border px-2 py-0.5 text-xs ${TONE[o.status]}`}>{t.statuses[o.status] ?? o.status}</span>
                    <ChevronDown className="hidden h-4 w-4 text-muted-foreground transition group-open:rotate-180 md:block" />
                  </summary>
                  <div className="grid gap-6 border-t p-4 text-sm md:grid-cols-3">
                    <dl className="space-y-1.5">
                      <dt className="text-xs text-muted-foreground">{T.customer}</dt>
                      <dd>{o.customer.name}</dd>
                      <dd><a href={`tel:${o.customer.phone}`} className="underline-offset-2 hover:underline" dir="ltr">{o.customer.phone}</a></dd>
                      {o.customer.email && <dd><a href={`mailto:${o.customer.email}`} className="hover:underline">{o.customer.email}</a></dd>}
                      <dd>{o.totals.shippingLabel}{o.customer.address && ` — ${o.customer.address}, ${o.customer.city}${o.customer.zip ? ` ${o.customer.zip}` : ""}`}</dd>
                      {o.customer.business && <dd>{o.customer.business}{o.customer.businessId && ` · ${o.customer.businessId}`}</dd>}
                      {o.customer.notes && <dd className="text-muted-foreground">{fill(T.notes, { x: o.customer.notes })}</dd>}
                      <dt className="pt-2 text-xs text-muted-foreground">{T.market}</dt>
                      <dd lang={ol}>{LOCALE_META[ol].name} · {o.currency ?? "ILS"}</dd>
                      <dd className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">{o.source === "chat" ? <><MessageCircle className="h-3.5 w-3.5" /> {T.viaChat}</> : <><Globe className="h-3.5 w-3.5" /> {T.viaSite}</>}</dd>
                      <dd><a href={`/admin/email-preview?id=${o.id}`} target="_blank" className="inline-flex items-center gap-1.5 py-1 text-xs text-muted-foreground hover:text-foreground"><Mail className="h-3.5 w-3.5" /> {T.email}</a></dd>
                    </dl>
                    <div className="space-y-3 md:col-span-2">
                      <p className="text-xs text-muted-foreground">{T.items}</p>
                      {o.items.map((l, i) => (
                        <div key={i} className="flex gap-4 rounded-xl border p-3">
                          <div className="min-w-0 flex-1 space-y-2">
                            <p className="font-medium">{n(l.quantity)} × {l.productName} <span className="text-muted-foreground">· {fill(T.perUnit, { x: m(l.unitPrice) })}</span></p>
                            <p className="text-xs text-muted-foreground">{l.labels.map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
                            <p className="text-xs text-muted-foreground">{fill(T.production, { label: l.productionLabel, days: l.productionDays })}{l.setup > 0 && ` · ${fill(T.setup, { x: m(l.setup) })}`}</p>
                            {(lineFiles(l).length ? lineFiles(l) : [{ side: "front" }]).map((f: SideFile, k) => (
                              <div key={k} className="flex gap-3 rounded-lg bg-muted/40 p-2">
                                {f.artwork && !f.artwork.endsWith(".pdf") ? (
                                  // eslint-disable-next-line @next/next/no-img-element -- auth-protected file, not for next/image
                                  <img src={`/api/admin/file/${f.artwork}`} alt={fill(T.artwork, { x: f.label ?? "" })} className="h-16 w-16 shrink-0 rounded-lg border bg-muted object-contain" loading="lazy" />
                                ) : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border text-xs text-muted-foreground">{f.artwork ? "PDF" : T.noFile}</div>}
                                <div className="min-w-0 space-y-0.5 text-xs">
                                  {f.label && <p className="font-medium">{f.label}</p>}
                                  {f.placement && <p className="text-muted-foreground">{f.placement}</p>}
                                  {f.artwork ? <a href={`/api/admin/file/${f.artwork}`} download={`${o.id}-${i + 1}-${f.side}.${f.artwork.split(".").pop()}`} className="inline-flex items-center gap-1.5 py-1 text-foreground/80 hover:text-foreground"><Download className="h-3.5 w-3.5" /> {T.download}</a> : <p className="text-amber-700 dark:text-amber-400">{T.noArtwork}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                          <span className="font-semibold" dir="ltr">{m(l.subtotal)}</span>
                        </div>
                      ))}
                      <dl className="grid grid-cols-2 gap-y-1 pt-1 sm:w-72">
                        <dt className="text-muted-foreground">{T.subtotal}</dt><dd dir="ltr" className="text-end">{m(o.totals.subtotal)}</dd>
                        <dt className="text-muted-foreground">{o.totals.shippingLabel}</dt><dd dir="ltr" className="text-end">{o.totals.shipping ? m(o.totals.shipping) : T.free}</dd>
                        <dt className="text-muted-foreground">{T.vat}</dt><dd dir="ltr" className="text-end">{m(o.totals.vat)}</dd>
                        <dt className="font-semibold">{T.grand}</dt><dd dir="ltr" className="text-end font-semibold">{m(o.totals.total)}</dd>
                      </dl>
                      <form action={updateStatus} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={o.id} />
                        <select name="status" defaultValue={o.status} aria-label={T.statusAria} className="rounded-lg border border-input bg-transparent px-2 py-1.5">
                          {STATUSES.map((s) => <option key={s} value={s}>{t.statuses[s]}</option>)}
                        </select>
                        <button className="rounded-lg bg-foreground px-3 py-1.5 font-medium text-background">{T.update}</button>
                      </form>
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
      {shown.length > 0 && <p className="text-xs text-muted-foreground">{fill(T.shown, { n: n(shown.length) })}</p>}
    </>
  );
}
