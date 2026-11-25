"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, Minus, Plus, Check, Truck, Store, Zap, FileText } from "lucide-react";
import { findProduct, priceLine, totals, withVat, money, num, mockupFor, tintFor, liveShipping, addBusinessDays, HE_MARKET, type Catalog, type Line, type ShippingId } from "@/lib/catalog";
import { useI18n } from "@/i18n/client";
import { useCatalog } from "./catalog-provider";
import { PaymentStep } from "./payment-step";
import { cart, useCart, useToday, type CartItem } from "@/lib/cart";
import { Mockup } from "./mockup";
import { GlowCard } from "./glow-card";

const input = "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/50";
const priced = (cat: Catalog, items: CartItem[]) => items.map((i) => { try { return { i, l: priceLine(cat, i) }; } catch (e) { return { i, err: (e as Error).message }; } });
type Row = ReturnType<typeof priced>[number];

function Thumb({ i, l }: { i: CartItem; l?: Line }) {
  const p = findProduct(useCatalog(), i.productId);
  if (!p) return <div className="h-20 w-20 rounded-xl border" />;
  const sel = l?.options ?? {};
  // eslint-disable-next-line @next/next/no-img-element -- tiny local thumb
  if (!i.thumb && p.image) return <img src={p.image} alt="" className="h-20 w-20 shrink-0 rounded-xl border object-cover" />;
  return <div className="h-20 w-20 shrink-0 rounded-xl border bg-muted/50"><Mockup kind={mockupFor(p, sel)} tint={tintFor(p, sel)} src={i.thumb} uid={`-t-${i.key}`} placeholder="" /></div>;
}

function Summary({ lines, method, children }: { lines: Line[]; method: ShippingId; children?: React.ReactNode }) {
  const cat = useCatalog();
  const { d, f } = useI18n();
  const m = money(cat), vat = (cat.market ?? HE_MARKET).vat;
  const t = totals(cat, lines, method);
  return (
    <GlowCard inner="space-y-4">
      <h2 className="text-lg font-semibold">{d.cart.summary}</h2>
      <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">{f(d.cart.items, { n: lines.length })}</dt><dd className="text-end">{m(Math.round((t.total - withVat(t.shipping, cat)) * 100) / 100)}</dd>
        <dt className="text-muted-foreground">{t.shippingLabel}</dt><dd className="text-end">{t.shipping ? m(withVat(t.shipping, cat)) : d.cart.free}</dd>
        <dt className="border-t pt-2 text-base font-semibold">{d.cart.total}</dt><dd className="border-t pt-2 text-end text-2xl font-semibold">{m(t.total)}</dd>
        <dt className="col-span-2 text-xs text-muted-foreground">{vat ? f(d.vat.totalLabel, { rate: Math.round(vat * 100), amount: m(t.vat) }) : d.vat.noneNote}</dt>
      </dl>
      {t.shippingMethod === "home" && t.shipping > 0 && cat.shipping.home.freeFrom > 0 && <p className="text-xs text-muted-foreground">{f(d.cart.toFree, { amount: m(cat.shipping.home.freeFrom - t.subtotal), beforeVat: d.vat.beforeVat })}</p>}
      {children}
    </GlowCard>
  );
}

function Empty() {
  const { d, href } = useI18n();
  return (
    <div className="space-y-4 py-20 text-center">
      <p className="text-xl font-semibold">{d.cart.empty}</p>
      <p className="text-muted-foreground">{d.cart.emptyText}</p>
      <Link href={href("/#categories")} className="inline-block rounded-lg bg-foreground px-5 py-2.5 font-medium text-background">{d.nav.allProducts}</Link>
    </div>
  );
}

export function CartView() {
  const cat = useCatalog();
  const { d, href, f } = useI18n();
  const m = money(cat);
  const items = useCart();
  const rows = priced(cat, items);
  const lines = rows.flatMap((r) => (r.l ? [r.l] : []));
  if (!items.length) return <Empty />;

  function setQty(r: Row, q: number) {
    const p = findProduct(cat, r.i.productId);
    if (!p || p.options.some((o) => o.kind === "split")) return;
    cart.update(r.i.key, { quantity: Math.min(p.qty.max, Math.max(p.qty.min, q)) });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12 [&>*]:min-w-0">
      <ul className="min-w-0 space-y-3 lg:col-span-8">
        {rows.map((r) => {
          const p = findProduct(cat, r.i.productId);
          return (
            <li key={r.i.key} className="flex gap-4 rounded-2xl border bg-card p-4">
              <Thumb i={r.i} l={r.l} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <Link href={href(`/p/${r.i.productId}`)} className="font-semibold hover:underline">{r.l?.productName ?? r.i.productId}</Link>
                  {r.l && <span className="font-semibold">{m(withVat(r.l.subtotal, cat))}</span>}
                </div>
                {r.l ? <>
                  <p className="text-xs text-muted-foreground">{r.l.labels.map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {f(d.cart.production, { label: r.l.productionLabel, n: r.l.productionDays })} ·
                    {r.i.artwork ? <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><FileText className="h-3.5 w-3.5" />{r.i.fileName ?? d.cart.file}</span> : <span className="text-amber-700 dark:text-amber-400">{d.cart.noFile}</span>}
                  </p>
                </> : <p className="text-sm text-red-600 dark:text-red-400">{r.err}</p>}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                  {r.l && p && !p.options.some((o) => o.kind === "split") && (
                    <div className="flex items-center rounded-lg border">
                      <button type="button" aria-label={d.cart.less} onClick={() => setQty(r, r.l!.quantity - p.qty.step)} className="p-1.5 text-muted-foreground hover:text-foreground"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-16 text-center text-sm tabular-nums">{num(cat, r.l.quantity)}</span>
                      <button type="button" aria-label={d.cart.more} onClick={() => setQty(r, r.l!.quantity + p.qty.step)} className="p-1.5 text-muted-foreground hover:text-foreground"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                  {r.l && <span className="text-xs text-muted-foreground">{f(d.cart.perUnit, { price: m(withVat(r.l.unitPrice, cat)) })}</span>}
                  <button type="button" onClick={() => cart.remove(r.i.key)} className="ms-auto flex items-center gap-1 px-1 py-2 text-xs text-muted-foreground hover:text-red-600 dark:hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /> {d.cart.remove}</button>
                </div>
              </div>
            </li>
          );
        })}
        <p className="text-xs text-muted-foreground">{d.cart.check}</p>
      </ul>
      <div className="min-w-0 lg:col-span-4">
        <div className="lg:sticky lg:top-24">
          <Summary lines={lines} method="home">
            <Link href={href("/checkout")} aria-disabled={lines.length !== rows.length} className={`block rounded-lg bg-foreground py-3 text-center font-medium text-background ${lines.length !== rows.length ? "pointer-events-none opacity-40" : ""}`}>{d.cart.toCheckout}</Link>
            <Link href={href("/#categories")} className="block py-2 text-center text-sm text-muted-foreground hover:text-foreground">{d.cart.continue}</Link>
          </Summary>
        </div>
      </div>
    </div>
  );
}

const SHIP_ICON = { pickup: Store, home: Truck, express: Zap };

export function Checkout() {
  const cat = useCatalog();
  const { lang, d, f } = useI18n();
  const k = d.checkout, STEPS = k.steps, m = money(cat), mk = cat.market ?? HE_MARKET, il = lang === "he";
  const items = useCart();
  const today = useToday();
  const rows = priced(cat, items);
  const lines = rows.flatMap((r) => (r.l ? [r.l] : []));
  const [step, setStep] = useState(0);
  const [picked, setMethod] = useState<ShippingId>("home");
  const method = totals(cat, [], picked).shippingMethod; // falls back if the picked method was switched off
  const [c, setC] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ id: string; total: number; phone: string; emailed?: string }>();

  if (done) return <Done order={done} total={m(done.total)} onEmailed={(e) => setDone({ ...done, emailed: e })} />;
  if (!items.length) return <Empty />;

  const maxDays = Math.max(...lines.map((l) => l.productionDays));
  const eta = (s: ShippingId) => today && addBusinessDays(today, maxDays + cat.shipping[s].days, mk.weekend).toLocaleDateString(mk.intl, { weekday: "long", day: "numeric", month: "numeric" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setC({ ...c, [k]: e.target.value });

  function next(e: React.FormEvent) { e.preventDefault(); setErr(""); setStep(step + 1); }

  async function submit() {
    setErr(""); setBusy(true);
    try {
      const r = await (await fetch("/api/order", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, items: items.map(({ productId, quantity, options, split, production, artwork, placement, files }) => ({ productId, quantity, options, split, production, artwork, placement, files })), shipping: method, customer: c }) })).json();
      if (r.error) throw new Error(r.error);
      setDone({ ...r, phone: c.phone, emailed: c.email || undefined }); cart.clear();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12 [&>*]:min-w-0">
      <div className="space-y-4 lg:col-span-8">
        <ol className="grid grid-cols-3 gap-2 text-sm" aria-label={k.stepsAria}>
          {STEPS.map((t, i) => (
            <li key={t}><button type="button" disabled={i > step} onClick={() => setStep(i)} aria-current={step === i ? "step" : undefined}
              className={`w-full rounded-xl border py-2 ${step === i ? "border-foreground text-foreground" : i < step ? "text-foreground/80" : "text-muted-foreground"}`}>{i + 1}. {t}</button></li>
          ))}
        </ol>
        <GlowCard inner="space-y-5">
          {step === 0 && (
            <form onSubmit={next} className="grid gap-3 sm:grid-cols-2">
              <h2 className="text-lg font-semibold sm:col-span-2">{k.details}</h2>
              <input required minLength={2} placeholder={k.name} aria-label={k.name} value={c.name ?? ""} onChange={set("name")} className={input} autoComplete="name" />
              <input required pattern={il ? "0?5\\d{8}|\\+9725\\d{8}" : "\\+?[\\d\\s\\-]{7,20}"} title={k.phoneTitle} placeholder={k.phone} aria-label={k.phone} value={c.phone ?? ""} onChange={set("phone")} className={input} inputMode="tel" autoComplete="tel" dir="ltr" />
              <input type="email" placeholder={k.email} aria-label={k.email} value={c.email ?? ""} onChange={set("email")} className={`${input} sm:col-span-2`} autoComplete="email" dir="ltr" />
              <input placeholder={k.business} aria-label={k.business} value={c.business ?? ""} onChange={set("business")} className={input} autoComplete="organization" />
              <input placeholder={k.businessId} aria-label={k.businessId} value={c.businessId ?? ""} onChange={set("businessId")} className={input} />
              <textarea rows={2} maxLength={400} placeholder={k.notes} aria-label={k.notes} value={c.notes ?? ""} onChange={set("notes")} className={`${input} resize-none sm:col-span-2`} />
              <button className="rounded-lg bg-foreground py-3 font-medium text-background sm:col-span-2">{k.toShipping}</button>
            </form>
          )}
          {step === 1 && (
            <form onSubmit={next} className="space-y-4">
              <h2 className="text-lg font-semibold">{k.shipping}</h2>
              <div className="grid gap-3">
                {liveShipping(cat).map((sm) => { const s = cat.shipping[sm], I = SHIP_ICON[sm], t = totals(cat, lines, sm); return (
                  <label key={sm} className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 ${method === sm ? "border-foreground bg-foreground/5" : "hover:border-foreground/40"}`}>
                    <input type="radio" name="ship" checked={method === sm} onChange={() => setMethod(sm)} className="accent-foreground" />
                    <I className="h-5 w-5 text-muted-foreground" />
                    <span className="flex-1 space-y-0.5"><span className="block font-medium">{s.label}</span><span className="block text-xs text-muted-foreground">{s.desc}{today && ` · ${f(k.by, { what: sm === "pickup" ? k.readyPickup : k.arrives, date: eta(sm) || "" })}`}</span></span>
                    <span className="text-sm">{t.shipping ? m(withVat(t.shipping, cat)) : d.cart.free}</span>
                  </label>); })}
              </div>
              {method !== "pickup" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <input required minLength={3} placeholder={k.address} aria-label={k.address} value={c.address ?? ""} onChange={set("address")} className={`${input} ${il ? "" : "sm:col-span-2"}`} autoComplete="street-address" />
                  <input required minLength={2} placeholder={k.city} aria-label={k.city} value={c.city ?? ""} onChange={set("city")} className={input} autoComplete="address-level2" />
                  {!il && <input placeholder={k.zip} aria-label={k.zip} value={c.zip ?? ""} onChange={set("zip")} className={input} autoComplete="postal-code" />}
                </div>
              )}
              <button className="w-full rounded-lg bg-foreground py-3 font-medium text-background">{k.toPayment}</button>
            </form>
          )}
          {step === 2 && (
            <PaymentStep total={totals(cat, lines, method).total} busy={busy} err={err} canSubmit={lines.length === rows.length} onPhoneOrder={submit}
              recap={<div className="rounded-xl border p-4 text-sm text-foreground/80">
                <p>{c.name} · <span dir="ltr">{c.phone}</span>{c.email && ` · ${c.email}`}</p>
                <p className="text-muted-foreground">{cat.shipping[method].label}{method !== "pickup" && ` — ${c.address}, ${c.city}${c.zip ? ` ${c.zip}` : ""}`}</p>
              </div>} />
          )}
        </GlowCard>
      </div>
      <div className="space-y-3 lg:col-span-4">
        <div className="space-y-3 lg:sticky lg:top-24">
          <Summary lines={lines} method={method} />
          <ul className="space-y-2">{rows.map((r) => <li key={r.i.key} className="flex items-center gap-3 text-sm"><Thumb i={r.i} l={r.l} /><span className="flex-1">{r.l ? `${num(cat, r.l.quantity)} × ${r.l.productName}` : r.err}</span>{r.l && <span>{m(withVat(r.l.subtotal, cat))}</span>}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}

/** Order confirmation + "email me the order details" (if no email was given, or to send to another address). */
function Done({ order, total, onEmailed }: { order: { id: string; phone: string; emailed?: string }; total: string; onEmailed: (email: string) => void }) {
  const { lang, d, href, f } = useI18n();
  const k = d.checkout;
  const [email, setEmail] = useState("");
  const [again, setAgain] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function send(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await (await fetch("/api/order/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: order.id, phone: order.phone, email, lang }) })).json();
      if (r.error) throw new Error(r.error);
      onEmailed(email); setAgain(false); setEmail("");
    } catch (x) { setErr((x as Error).message || d.errors.generic); } finally { setBusy(false); }
  }
  const showForm = !order.emailed || again;
  return (
    <GlowCard className="mx-auto max-w-xl" inner="space-y-4 text-center">
      <Check className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-400" />
      <h1 className="text-2xl font-semibold">{k.doneTitle}</h1>
      <p className="text-foreground/80">{f(k.doneOrder, { id: order.id, total })}</p>
      <p className="text-sm text-muted-foreground">{k.doneText}</p>
      <div className="space-y-2 rounded-xl border p-4 text-start">
        {order.emailed && <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">{f(k.emailSent, { email: order.emailed })} {!again && <button type="button" onClick={() => setAgain(true)} className="text-muted-foreground underline underline-offset-4 hover:text-foreground">{k.emailSentAgain}</button>}</p>}
        {showForm && (
          <form onSubmit={send} className="space-y-2">
            <p className="text-sm font-medium">{k.emailTitle}</p>
            <div className="flex gap-2">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={k.emailPlaceholder} aria-label={k.emailPlaceholder} dir="ltr" className={`${input} min-w-0 flex-1`} autoComplete="email" />
              <button disabled={busy} className="shrink-0 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50">{k.emailSend}</button>
            </div>
            {err && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{err}</p>}
          </form>
        )}
      </div>
      <Link href={href("/")} className="inline-block rounded-lg border px-5 py-2.5 text-sm">{k.backHome}</Link>
    </GlowCard>
  );
}
