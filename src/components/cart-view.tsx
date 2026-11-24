"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, Minus, Plus, Loader2, Check, Truck, Store, Zap, Phone, FileText } from "lucide-react";
import { findProduct, priceLine, totals, withVat, ils, mockupFor, tintFor, SHIPPING, addBusinessDays, type Line, type ShippingId } from "@/lib/catalog";
import { cart, useCart, useToday, type CartItem } from "@/lib/cart";
import { Mockup } from "./mockup";
import { GlowCard } from "./glow-card";

const input = "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-400";
const priced = (items: CartItem[]) => items.map((i) => { try { return { i, l: priceLine(i) }; } catch (e) { return { i, err: (e as Error).message }; } });
type Row = ReturnType<typeof priced>[number];

function Thumb({ i, l }: { i: CartItem; l?: Line }) {
  const p = findProduct(i.productId);
  if (!p) return <div className="h-20 w-20 rounded-xl border" />;
  const sel = l?.options ?? {};
  return <div className="h-20 w-20 shrink-0 rounded-xl border bg-neutral-900/50"><Mockup kind={mockupFor(p, sel)} tint={tintFor(p, sel)} src={i.thumb} uid={`-t-${i.key}`} /></div>;
}

function Summary({ lines, method, children }: { lines: Line[]; method: ShippingId; children?: React.ReactNode }) {
  const t = totals(lines, method);
  return (
    <GlowCard inner="space-y-4">
      <h2 className="text-lg font-semibold">סיכום הזמנה</h2>
      <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
        <dt className="text-neutral-400">מוצרים ({lines.length})</dt><dd className="text-left">{ils(Math.round((t.total - withVat(t.shipping)) * 100) / 100)}</dd>
        <dt className="text-neutral-400">{SHIPPING[method].label}</dt><dd className="text-left">{t.shipping ? ils(withVat(t.shipping)) : "חינם"}</dd>
        <dt className="border-t pt-2 text-base font-semibold">סה״כ לתשלום</dt><dd className="border-t pt-2 text-left text-2xl font-semibold">{ils(t.total)}</dd>
        <dt className="col-span-2 text-xs text-neutral-500">כולל מע״מ 18% ({ils(t.vat)})</dt>
      </dl>
      {method === "home" && t.shipping > 0 && <p className="text-xs text-neutral-500">עוד {ils(SHIPPING.home.freeFrom - t.subtotal)} לפני מע״מ למשלוח חינם</p>}
      {children}
    </GlowCard>
  );
}

const Empty = () => (
  <div className="space-y-4 py-20 text-center">
    <p className="text-xl font-semibold">העגלה ריקה</p>
    <p className="text-neutral-400">זה הזמן להפוך רעיון למשהו מודפס.</p>
    <Link href="/#categories" className="inline-block rounded-lg bg-white px-5 py-2.5 font-medium text-black">לכל המוצרים</Link>
  </div>
);

export function CartView() {
  const items = useCart();
  const rows = priced(items);
  const lines = rows.flatMap((r) => (r.l ? [r.l] : []));
  if (!items.length) return <Empty />;

  function setQty(r: Row, q: number) {
    const p = findProduct(r.i.productId);
    if (!p || p.options.some((o) => o.kind === "split")) return;
    cart.update(r.i.key, { quantity: Math.min(p.qty.max, Math.max(p.qty.min, q)) });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <ul className="space-y-3 lg:col-span-8">
        {rows.map((r) => {
          const p = findProduct(r.i.productId);
          return (
            <li key={r.i.key} className="flex gap-4 rounded-2xl border bg-neutral-950 p-4">
              <Thumb i={r.i} l={r.l} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/p/${r.i.productId}`} className="font-semibold hover:underline">{r.l?.productName ?? r.i.productId}</Link>
                  {r.l && <span className="font-semibold">{ils(withVat(r.l.subtotal))}</span>}
                </div>
                {r.l ? <>
                  <p className="text-xs text-neutral-400">{r.l.labels.map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
                  <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                    ייצור {r.l.productionLabel} ({r.l.productionDays} ימי עסקים) ·
                    {r.i.artwork ? <span className="flex items-center gap-1 text-emerald-400"><FileText className="h-3.5 w-3.5" />{r.i.fileName ?? "קובץ"}</span> : <span className="text-amber-400">בלי קובץ — אפשר לשלוח אחר כך</span>}
                  </p>
                </> : <p className="text-sm text-red-400">{r.err}</p>}
                <div className="flex items-center gap-3 pt-1">
                  {r.l && p && !p.options.some((o) => o.kind === "split") && (
                    <div className="flex items-center rounded-lg border">
                      <button type="button" aria-label="הפחתת כמות" onClick={() => setQty(r, r.l!.quantity - p.qty.step)} className="p-1.5 text-neutral-400 hover:text-white"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-16 text-center text-sm tabular-nums">{r.l.quantity.toLocaleString("he-IL")}</span>
                      <button type="button" aria-label="הוספת כמות" onClick={() => setQty(r, r.l!.quantity + p.qty.step)} className="p-1.5 text-neutral-400 hover:text-white"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                  {r.l && <span className="text-xs text-neutral-500">{ils(withVat(r.l.unitPrice))} ליח׳</span>}
                  <button type="button" onClick={() => cart.remove(r.i.key)} className="ms-auto flex items-center gap-1 text-xs text-neutral-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /> הסרה</button>
                </div>
              </div>
            </li>
          );
        })}
        <p className="text-xs text-neutral-500">לפני ההמשך ודאו שההדמיה תואמת את ההזמנה. נבדוק כל קובץ לפני הייצור ונחזור אליכם אם משהו לא תקין.</p>
      </ul>
      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-24">
          <Summary lines={lines} method="home">
            <Link href="/checkout" aria-disabled={lines.length !== rows.length} className={`block rounded-lg bg-white py-3 text-center font-medium text-black ${lines.length !== rows.length ? "pointer-events-none opacity-40" : ""}`}>המשך לקופה</Link>
            <Link href="/#categories" className="block text-center text-sm text-neutral-400 hover:text-white">המשך בקניות</Link>
          </Summary>
        </div>
      </div>
    </div>
  );
}

const STEPS = ["פרטים", "משלוח", "תשלום"];
const SHIP_ICON = { pickup: Store, home: Truck, express: Zap };

export function Checkout() {
  const items = useCart();
  const today = useToday();
  const rows = priced(items);
  const lines = rows.flatMap((r) => (r.l ? [r.l] : []));
  const [step, setStep] = useState(0);
  const [method, setMethod] = useState<ShippingId>("home");
  const [c, setC] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ id: string; total: number }>();

  if (done) return (
    <GlowCard className="mx-auto max-w-xl" inner="space-y-4 text-center">
      <Check className="mx-auto h-10 w-10 text-emerald-400" />
      <h1 className="text-2xl font-semibold">קיבלנו את ההזמנה!</h1>
      <p className="text-neutral-300">מספר הזמנה <b className="font-mono">{done.id}</b> · {ils(done.total)}</p>
      <p className="text-sm text-neutral-400">נבדוק את הקבצים ונתקשר לאישור ולתשלום תוך יום עסקים.{c.email && " אישור נשלח גם למייל."}</p>
      <Link href="/" className="inline-block rounded-lg border px-5 py-2.5 text-sm">חזרה לדף הבית</Link>
    </GlowCard>
  );
  if (!items.length) return <Empty />;

  const maxDays = Math.max(...lines.map((l) => l.productionDays));
  const eta = (m: ShippingId) => today && addBusinessDays(today, maxDays + SHIPPING[m].days).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "numeric" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setC({ ...c, [k]: e.target.value });

  function next(e: React.FormEvent) { e.preventDefault(); setErr(""); setStep(step + 1); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const r = await (await fetch("/api/order", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map(({ productId, quantity, options, split, production, artwork, placement }) => ({ productId, quantity, options, split, production, artwork, placement })), shipping: method, customer: c }) })).json();
      if (r.error) throw new Error(r.error);
      setDone(r); cart.clear();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-8">
        <ol className="grid grid-cols-3 gap-2 text-sm" aria-label="שלבי הקופה">
          {STEPS.map((t, i) => (
            <li key={t}><button type="button" disabled={i > step} onClick={() => setStep(i)} aria-current={step === i ? "step" : undefined}
              className={`w-full rounded-xl border py-2 ${step === i ? "border-white text-white" : i < step ? "text-neutral-300" : "text-neutral-600"}`}>{i + 1}. {t}</button></li>
          ))}
        </ol>
        <GlowCard inner="space-y-5">
          {step === 0 && (
            <form onSubmit={next} className="grid gap-3 sm:grid-cols-2">
              <h2 className="text-lg font-semibold sm:col-span-2">פרטי המזמין</h2>
              <input required minLength={2} placeholder="שם מלא" value={c.name ?? ""} onChange={set("name")} className={input} autoComplete="name" />
              <input required pattern="0?5\d{8}|\+9725\d{8}" title="טלפון נייד, למשל 0501234567" placeholder="טלפון נייד" value={c.phone ?? ""} onChange={set("phone")} className={input} inputMode="tel" autoComplete="tel" />
              <input type="email" placeholder="אימייל לאישור הזמנה (רשות)" value={c.email ?? ""} onChange={set("email")} className={`${input} sm:col-span-2`} autoComplete="email" />
              <input placeholder="שם העסק (לחשבונית, רשות)" value={c.business ?? ""} onChange={set("business")} className={input} autoComplete="organization" />
              <input placeholder="ח.פ / עוסק מורשה (רשות)" value={c.businessId ?? ""} onChange={set("businessId")} className={input} inputMode="numeric" />
              <textarea rows={2} maxLength={400} placeholder="הערות להזמנה (רשות)" value={c.notes ?? ""} onChange={set("notes")} className={`${input} resize-none sm:col-span-2`} />
              <button className="rounded-lg bg-white py-3 font-medium text-black sm:col-span-2">המשך לבחירת משלוח</button>
            </form>
          )}
          {step === 1 && (
            <form onSubmit={next} className="space-y-4">
              <h2 className="text-lg font-semibold">שיטת משלוח</h2>
              <div className="grid gap-3">
                {(Object.keys(SHIPPING) as ShippingId[]).map((m) => { const s = SHIPPING[m], I = SHIP_ICON[m], t = totals(lines, m); return (
                  <label key={m} className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 ${method === m ? "border-white bg-white/5" : "hover:border-neutral-500"}`}>
                    <input type="radio" name="ship" checked={method === m} onChange={() => setMethod(m)} className="accent-white" />
                    <I className="h-5 w-5 text-neutral-400" />
                    <span className="flex-1 space-y-0.5"><span className="block font-medium">{s.label}</span><span className="block text-xs text-neutral-500">{s.desc}{today && ` · ${m === "pickup" ? "מוכן לאיסוף" : "יגיע"} עד ${eta(m)}`}</span></span>
                    <span className="text-sm">{t.shipping ? ils(withVat(t.shipping)) : "חינם"}</span>
                  </label>); })}
              </div>
              {method !== "pickup" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <input required minLength={3} placeholder="רחוב ומספר" value={c.address ?? ""} onChange={set("address")} className={input} autoComplete="street-address" />
                  <input required minLength={2} placeholder="עיר" value={c.city ?? ""} onChange={set("city")} className={input} autoComplete="address-level2" />
                </div>
              )}
              <button className="w-full rounded-lg bg-white py-3 font-medium text-black">המשך לתשלום</button>
            </form>
          )}
          {step === 2 && (
            <form onSubmit={submit} className="space-y-4">
              <h2 className="text-lg font-semibold">תשלום</h2>
              <label className="flex items-center gap-4 rounded-xl border border-white bg-white/5 p-4">
                <input type="radio" checked readOnly className="accent-white" /><Phone className="h-5 w-5 text-neutral-400" />
                <span className="space-y-0.5"><span className="block font-medium">תשלום טלפוני</span><span className="block text-xs text-neutral-500">נבדוק את הקבצים ונתקשר לחיוב באשראי תוך יום עסקים. זמני הייצור נספרים מרגע התשלום.</span></span>
              </label>
              <div className="rounded-xl border p-4 text-sm text-neutral-300">
                <p>{c.name} · <span dir="ltr">{c.phone}</span>{c.email && ` · ${c.email}`}</p>
                <p className="text-neutral-400">{SHIPPING[method].label}{method !== "pickup" && ` — ${c.address}, ${c.city}`}</p>
              </div>
              {err && <p className="text-sm text-red-400" role="alert">{err}</p>}
              <button disabled={busy || lines.length !== rows.length} className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 font-medium text-black disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />} אישור וסיום הזמנה</button>
            </form>
          )}
        </GlowCard>
      </div>
      <div className="space-y-3 lg:col-span-4">
        <div className="space-y-3 lg:sticky lg:top-24">
          <Summary lines={lines} method={method} />
          <ul className="space-y-2">{rows.map((r) => <li key={r.i.key} className="flex items-center gap-3 text-sm"><Thumb i={r.i} l={r.l} /><span className="flex-1">{r.l ? `${r.l.quantity.toLocaleString("he-IL")} × ${r.l.productName}` : r.err}</span>{r.l && <span>{ils(withVat(r.l.subtotal))}</span>}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}
