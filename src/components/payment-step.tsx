"use client";

import { useState } from "react";
import { CreditCard, Phone, Lock, Loader2, Info, Smartphone } from "lucide-react";
import { ils } from "@/lib/catalog";
import { luhn, cardBrand, formatCard, formatExpiry, expiryOk, israeliIdOk, maxInstallments, digits } from "@/lib/payment";

// Payment step. Credit card + Bit are UI only (not connected to a clearing provider yet):
// the card fields live in this component's state, are never sent anywhere, and "pay" does nothing.
// Phone payment is the working path — it submits the order.
const input = "w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground/50 aria-[invalid=true]:border-red-500";
const BRAND: Record<string, string> = { visa: "VISA", mastercard: "Mastercard", amex: "AMEX", diners: "Diners", isracard: "ישראכרט" };
type Method = "card" | "bit" | "phone";

export function PaymentStep({ total, busy, err, canSubmit, onPhoneOrder, recap }: { total: number; busy: boolean; err: string; canSubmit: boolean; onPhoneOrder: () => void; recap: React.ReactNode }) {
  const [method, setMethod] = useState<Method>("card");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "", id: "", installments: "1" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState(false);
  const set = (k: keyof typeof card, v: string) => setCard((c) => ({ ...c, [k]: v }));
  const touch = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));

  const brand = cardBrand(card.number);
  const amex = brand === "amex";
  const errors: Record<string, string | undefined> = {
    number: brand === "isracard" ? undefined : luhn(card.number) ? undefined : "מספר כרטיס לא תקין",
    name: card.name.trim().length >= 2 ? undefined : "יש להזין שם בעל הכרטיס",
    expiry: expiryOk(card.expiry) ? undefined : "תוקף לא תקין או שפג",
    cvv: digits(card.cvv).length === (amex ? 4 : 3) ? undefined : `${amex ? 4 : 3} ספרות בגב הכרטיס`,
    id: israeliIdOk(card.id) ? undefined : "תעודת זהות לא תקינה",
  };
  const show = (k: string) => (touched[k] || tried) && errors[k];
  const max = maxInstallments(total);
  const per = total / Number(card.installments);

  function pay(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (method === "phone") onPhoneOrder();
    // card / bit: intentionally inactive — no charge, no order, nothing is sent.
  }

  return (
    <form onSubmit={pay} className="space-y-5" noValidate autoComplete="off">
      <h2 className="text-lg font-semibold">תשלום</h2>
      <div className="grid gap-3">
        <PayOption on={method === "card"} pick={() => { setMethod("card"); setTried(false); }} soon icon={CreditCard} title="כרטיס אשראי" sub="ויזה, מאסטרקארד, ישראכרט, אמריקן אקספרס, דיינרס" />
        <PayOption on={method === "bit"} pick={() => { setMethod("bit"); setTried(false); }} soon icon={Smartphone} title="ביט" sub="תשלום מהיר מהנייד" />
        <PayOption on={method === "phone"} pick={() => { setMethod("phone"); setTried(false); }} icon={Phone} title="תשלום טלפוני" sub="נבדוק את הקבצים ונתקשר לחיוב תוך יום עסקים" />
      </div>

      {method === "card" && (
        <div className="grid gap-5 md:grid-cols-[1fr_15rem]">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm sm:col-span-2"><span className="text-muted-foreground">מספר כרטיס</span>
              <input inputMode="numeric" dir="ltr" placeholder="0000 0000 0000 0000" value={formatCard(card.number)} onChange={(e) => set("number", digits(e.target.value))} onBlur={touch("number")} aria-invalid={!!show("number")} className={`${input} text-left tracking-wider`} autoComplete="off" />
              {show("number") && <span className="text-xs text-red-600 dark:text-red-400">{errors.number}</span>}</label>
            <label className="space-y-1 text-sm sm:col-span-2"><span className="text-muted-foreground">שם בעל הכרטיס</span>
              <input value={card.name} onChange={(e) => set("name", e.target.value)} onBlur={touch("name")} aria-invalid={!!show("name")} className={input} autoComplete="off" />
              {show("name") && <span className="text-xs text-red-600 dark:text-red-400">{errors.name}</span>}</label>
            <label className="space-y-1 text-sm"><span className="text-muted-foreground">תוקף</span>
              <input inputMode="numeric" dir="ltr" placeholder="MM/YY" value={card.expiry} onChange={(e) => set("expiry", formatExpiry(e.target.value))} onBlur={touch("expiry")} aria-invalid={!!show("expiry")} className={`${input} text-left`} autoComplete="off" />
              {show("expiry") && <span className="text-xs text-red-600 dark:text-red-400">{errors.expiry}</span>}</label>
            <label className="space-y-1 text-sm"><span className="text-muted-foreground">CVV</span>
              <input inputMode="numeric" dir="ltr" placeholder={amex ? "0000" : "000"} value={card.cvv} onChange={(e) => set("cvv", digits(e.target.value).slice(0, amex ? 4 : 3))} onBlur={touch("cvv")} aria-invalid={!!show("cvv")} className={`${input} text-left`} autoComplete="off" />
              {show("cvv") && <span className="text-xs text-red-600 dark:text-red-400">{errors.cvv}</span>}</label>
            <label className="space-y-1 text-sm"><span className="text-muted-foreground">ת.ז בעל הכרטיס</span>
              <input inputMode="numeric" dir="ltr" value={card.id} onChange={(e) => set("id", digits(e.target.value).slice(0, 9))} onBlur={touch("id")} aria-invalid={!!show("id")} className={`${input} text-left`} autoComplete="off" />
              {show("id") && <span className="text-xs text-red-600 dark:text-red-400">{errors.id}</span>}</label>
            <label className="space-y-1 text-sm"><span className="text-muted-foreground">תשלומים</span>
              <select value={card.installments} onChange={(e) => set("installments", e.target.value)} className={input} disabled={max === 1}>
                {Array.from({ length: max }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? "תשלום אחד" : `${n} תשלומים ללא ריבית`}</option>)}
              </select>
              {max === 1 && <span className="text-xs text-muted-foreground">תשלומים מהזמנה של ₪300</span>}</label>
          </div>

          {/* live card preview */}
          <div aria-hidden className="relative h-40 overflow-hidden rounded-2xl border bg-gradient-to-br from-neutral-800 via-neutral-900 to-black p-4 font-mono text-sm text-white md:mt-6">
            <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-[conic-gradient(#dd7bbb,#d79f1e,#5a922c,#4c7894,#dd7bbb)] opacity-30 blur-2xl" />
            <div className="relative flex h-full flex-col justify-between" dir="ltr">
              <div className="flex items-center justify-between"><span className="h-6 w-9 rounded bg-gradient-to-br from-amber-200 to-amber-500 opacity-80" /><span className="font-sans text-xs font-semibold">{brand ? BRAND[brand] : ""}</span></div>
              <p className="text-base tracking-widest">{formatCard(card.number) || "•••• •••• •••• ••••"}</p>
              <div className="flex justify-between text-[11px] text-white/60"><span className="truncate uppercase">{card.name || "CARD HOLDER"}</span><span>{card.expiry || "MM/YY"}</span></div>
            </div>
          </div>
        </div>
      )}

      {method === "bit" && <p className="rounded-xl border p-4 text-sm text-muted-foreground">בסיום ההזמנה תישלח לטלפון שלכם בקשת תשלום בביט.</p>}

      {recap}

      {method !== "phone" && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-500/60 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200" role="note">
          <Info className="mt-0.5 h-4 w-4 shrink-0" /> תשלום {method === "card" ? "באשראי" : "בביט"} עדיין לא פעיל באתר — לא יבוצע חיוב ולא תישלח הזמנה. כדי להזמין עכשיו בחרו ״תשלום טלפוני״.
        </p>
      )}
      {err && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{err}</p>}

      <button disabled={busy || !canSubmit} className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-3 font-medium text-background disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {method === "phone" ? "אישור וסיום הזמנה" : method === "card" ? `תשלום ${ils(total)}${Number(card.installments) > 1 ? ` (${card.installments} × ${ils(Math.round(per * 100) / 100)})` : ""}` : `תשלום ${ils(total)} בביט`}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" /> פרטי הכרטיס לא נשמרים ולא נשלחים לשרת שלנו</p>
    </form>
  );
}

function PayOption({ on, pick, soon, icon: I, title, sub }: { on: boolean; pick: () => void; soon?: boolean; icon: typeof Phone; title: string; sub: string }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${on ? "border-foreground bg-foreground/5" : "hover:border-foreground/40"}`}>
      <input type="radio" name="pay" checked={on} onChange={pick} className="accent-foreground" />
      <I className="h-5 w-5 text-muted-foreground" />
      <span className="flex-1 space-y-0.5"><span className="block font-medium">{title}</span><span className="block text-xs text-muted-foreground">{sub}</span></span>
      {soon && <span className="rounded-full border border-amber-500/60 dark:border-amber-800/60 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">בקרוב</span>}
    </label>
  );
}
