"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, X, Loader2, Check, AlertTriangle, RotateCcw, ExternalLink, Copy, Trash2 } from "lucide-react";
import { catalogErrors, priceLine, withVat, ils, PRODUCTION_IDS, MOCKUPS, type Catalog, type Mockup, type Option, type Product, type Tier } from "@/lib/catalog";
import { saveProduct, resetProduct, createProduct, deleteProduct } from "@/app/admin/catalog/actions";
import { ImageField } from "./image-field";
import { GlowCard } from "@/components/glow-card";

const input = "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-foreground/50";
const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
const show = (n: number | undefined) => (n === undefined || Number.isNaN(n) ? "" : String(n));
const newId = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`; // valid catalog id: lowercase, starts with a letter
const KINDS: [string, string][] = [["", "בחירה רגילה (עם תוספת מחיר)"], ["color", "צבעים"], ["split", "חלוקת כמות (מידות)"]];

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className={`relative h-5 w-9 rounded-full transition ${on ? "bg-emerald-500" : "bg-muted-foreground/40"} peer-focus-visible:ring-2 peer-focus-visible:ring-foreground/50`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "right-0.5" : "right-[1.125rem]"}`} />
      </span>
      {label}
    </label>
  );
}

/** Quantity tiers: "from N units → ₪ per unit (before VAT)". `signed` allows discounts (negative add-ons). */
function Tiers({ value, onChange, signed, empty }: { value: Tier[]; onChange: (t: Tier[]) => void; signed?: boolean; empty?: string }) {
  const set = (i: number, j: 0 | 1, v: number) => onChange(value.map((r, k) => (k === i ? (j ? [r[0], v] : [v, r[1]]) as Tier : r)));
  return (
    <div className="space-y-1.5">
      {value.length === 0 && <p className="text-xs text-muted-foreground">{empty ?? "ללא תוספת מחיר"}</p>}
      {value.map(([from, unit], i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0">מ־</span>
          <input type="number" min={1} step={1} value={show(from)} onChange={(e) => set(i, 0, num(e.target.value))} aria-label="מכמות" className={`${input} w-24 min-w-20`} />
          <span className="shrink-0">יח׳ ←</span>
          <input type="number" step="0.001" min={signed ? undefined : 0} value={show(unit)} onChange={(e) => set(i, 1, num(e.target.value))} aria-label="מחיר ליחידה לפני מע״מ" className={`${input} w-28 min-w-24`} />
          <span className="w-24 shrink-0">₪ ליח׳{Number.isFinite(unit) && <span className="text-muted-foreground"> ({ils(withVat(unit))})</span>}</span>
          <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label="מחיקת מדרגה" className="p-1.5 hover:text-red-600 dark:hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
        </div>
      ))}
      <button type="button" onClick={() => { const last = value.at(-1); onChange([...value, [last ? last[0] * 2 : 1, last ? last[1] : 0]]); }}
        className="flex items-center gap-1 py-1.5 text-xs text-muted-foreground hover:text-foreground"><Plus className="h-3.5 w-3.5" /> מדרגה</button>
    </div>
  );
}

export function ProductEditor({ catalog, id, builtin }: { catalog: Catalog; id: string; builtin: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Product>(() => structuredClone(catalog.products.find((p) => p.id === id)!));
  const [presets, setPresets] = useState(draft.qty.presets.join(", "));
  const [details, setDetails] = useState(draft.details.join("\n"));
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; msg: string; errors?: string[] }>();
  const up = (fn: (d: Product) => void) => { setStatus(undefined); setDraft((d) => { const n = structuredClone(d); fn(n); return n; }); };

  // the draft as it would be saved — validated and priced live, with the exact same code the site uses
  const p: Product = { ...draft, qty: { ...draft.qty, presets: presets.split(/[,\s]+/).filter(Boolean).map(Number) }, details: details.split("\n").map((d) => d.trim()).filter(Boolean) };
  const draftCat: Catalog = { ...catalog, products: catalog.products.map((x) => (x.id === id ? p : x)) };
  const errors = catalogErrors(draftCat).filter((e) => e.includes(`"${p.name || p.id}"`) || e.startsWith(`${p.id}:`));
  const prod = p.production.includes("standard") ? "standard" : p.production[0];
  const rows = errors.length ? [] : p.qty.presets.map((q) => { try { return priceLine(draftCat, { productId: id, quantity: q, production: prod }); } catch { return undefined; } });

  const save = () => start(async () => {
    const r = await saveProduct(p);
    setStatus(r.ok ? { ok: true, msg: "נשמר — המחירים באתר ובצ׳אט עודכנו" } : { ok: false, msg: "לא נשמר", errors: r.errors });
  });
  const reset = () => {
    if (!window.confirm(`לשחזר את "${p.name}" למחירים ולהגדרות המקוריים? השינויים שלך יימחקו (עותק נשמר בהיסטוריה).`)) return;
    start(async () => {
      const r = await resetProduct(id);
      if (r.ok) window.location.reload(); else setStatus({ ok: false, msg: "לא שוחזר", errors: r.errors });
    });
  };

  const duplicate = () => start(async () => {
    const ids = new Set(catalog.products.map((x) => x.id));
    let nid = `${id}-copy`, i = 2;
    while (ids.has(nid)) nid = `${id}-copy-${i++}`;
    const r = await createProduct({ id: nid, name: `${p.name} (עותק)`, category: p.category, mockup: p.mockup, from: id });
    if (r.ok) router.push(`/admin/catalog/${nid}`); else setStatus({ ok: false, msg: "לא שוכפל", errors: r.errors });
  });
  const remove = () => {
    if (!window.confirm(`למחוק את "${p.name}"? אי אפשר לבטל (עותק נשמר בהיסטוריה).`)) return;
    start(async () => { const r = await deleteProduct(id); if (r.ok) router.push("/admin/catalog"); else setStatus({ ok: false, msg: "לא נמחק", errors: r.errors }); });
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-12 [&>*]:min-w-0">
      <div className="space-y-6 lg:col-span-8">
        <nav className="text-sm text-muted-foreground"><Link href="/admin/catalog" className="inline-block py-1.5 hover:text-foreground">מוצרים ומחירים</Link> / <span className="text-foreground/80">{draft.name}</span></nav>

        <GlowCard className="h-auto" inner="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">{draft.name || "ללא שם"}</h1>
            <Toggle on={draft.active !== false} onChange={(v) => up((d) => { d.active = v; })} label={draft.active !== false ? "מוצג באתר" : "מוסתר מהאתר"} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm"><span className="text-muted-foreground">שם המוצר</span><input value={draft.name} onChange={(e) => up((d) => { d.name = e.target.value; })} className={input} /></label>
            <label className="space-y-1 text-sm"><span className="text-muted-foreground">עלות הכנה חד-פעמית (₪ לפני מע״מ)</span><input type="number" min={0} step="0.01" value={show(draft.setup ?? 0)} onChange={(e) => up((d) => { d.setup = num(e.target.value); })} className={input} /></label>
            <label className="space-y-1 text-sm sm:col-span-2"><span className="text-muted-foreground">תיאור קצר</span><input value={draft.desc} onChange={(e) => up((d) => { d.desc = e.target.value; })} className={input} /></label>
            <label className="space-y-1 text-sm"><span className="text-muted-foreground">קטגוריה</span>
              <select value={draft.category} onChange={(e) => up((d) => { d.category = e.target.value; })} className={input}>{catalog.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span className="text-muted-foreground">צורת ההדמיה (כשהלקוח מעלה קובץ)</span>
              <select value={draft.mockup} onChange={(e) => up((d) => { d.mockup = e.target.value as Mockup; })} className={input}>{MOCKUPS.map(([m, t]) => <option key={m} value={m}>{t}</option>)}</select></label>
            <div className="sm:col-span-2"><ImageField label="תמונת מוצר" value={draft.image} onChange={(url) => up((d) => { d.image = url; })} /></div>
          </div>
        </GlowCard>

        <GlowCard className="h-auto" inner="space-y-4">
          <h2 className="font-semibold">מחיר בסיס לפי כמות</h2>
          <p className="text-xs text-muted-foreground">מחיר ליחידה לפני מע״מ, עם ברירות המחדל של כל האפשרויות. כל מדרגה חלה מהכמות שלה ומעלה.</p>
          <Tiers value={draft.base} onChange={(t) => up((d) => { d.base = t; })} empty="חובה לפחות מדרגה אחת" />
        </GlowCard>

        {draft.options.map((o, oi) => (
          <GlowCard key={o.id} className="h-auto" inner="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <input value={o.title} onChange={(e) => up((d) => { d.options[oi].title = e.target.value; })} aria-label="שם האפשרות" className={`${input} max-w-56 font-semibold`} />
              <span className="text-xs text-muted-foreground">{o.kind === "split" ? "חלוקת כמות (מידות) — בלי תוספת מחיר" : o.kind === "color" ? "צבעים" : "תוספת ליחידה, לפי כמות. הערך הראשון הוא ברירת המחדל."}</span>
              <button type="button" onClick={() => up((d) => { d.options.splice(oi, 1); })} className="ms-auto flex items-center gap-1 py-1.5 text-xs text-muted-foreground hover:text-red-600 dark:hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /> מחיקת האפשרות</button>
            </div>
            <ul className="space-y-3">
              {o.values.map((v, vi) => (
                <li key={v.id} className={`grid gap-3 rounded-xl border p-3 md:grid-cols-[14rem_1fr] ${v.active === false ? "opacity-60" : ""}`}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {v.color && <input type="color" value={v.color} onChange={(e) => up((d) => { d.options[oi].values[vi].color = e.target.value; })} aria-label="צבע" className="h-8 w-8 shrink-0 cursor-pointer rounded border bg-transparent" />}
                      <input value={v.title} onChange={(e) => up((d) => { d.options[oi].values[vi].title = e.target.value; })} aria-label="שם הערך" className={input} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Toggle on={v.active !== false} onChange={(a) => up((d) => { d.options[oi].values[vi].active = a; })} label={vi === 0 ? "פעיל · ברירת מחדל" : "פעיל"} />
                      {o.values.length > 1 && <button type="button" onClick={() => up((d) => { d.options[oi].values.splice(vi, 1); })} aria-label={`מחיקת ${v.title}`} className="p-1.5 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                  </div>
                  {o.kind !== "split" && <Tiers signed value={v.tiers ?? []} onChange={(t) => up((d) => { d.options[oi].values[vi].tiers = t; })} />}
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => up((d) => { d.options[oi].values.push({ id: newId("v"), title: "", ...(o.kind === "color" ? { color: "#888888" } : {}) }); })}
              className="flex items-center gap-1 py-1.5 text-sm text-muted-foreground hover:text-foreground"><Plus className="h-4 w-4" /> ערך חדש</button>
          </GlowCard>
        ))}

        <GlowCard className="h-auto" inner="flex flex-wrap items-center gap-3 p-4">
          <span className="text-sm text-muted-foreground">הוספת אפשרות:</span>
          {KINDS.filter(([k]) => k !== "split" || !draft.options.some((o) => o.kind === "split")).map(([k, t]) => (
            <button key={k} type="button" className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:border-foreground/40"
              onClick={() => up((d) => { d.options.push({ id: newId("o"), title: k === "split" ? "מידה" : k === "color" ? "צבע" : "", ...(k ? { kind: k as Option["kind"] } : {}),
                values: k === "split" ? ["S", "M", "L", "XL"].map((x) => ({ id: newId("v") + x.toLowerCase(), title: x })) : [{ id: newId("v"), title: k === "color" ? "שחור" : "", ...(k === "color" ? { color: "#171717" } : {}) }] }); })}>
              <Plus className="h-3.5 w-3.5" /> {t}</button>
          ))}
        </GlowCard>

        <GlowCard className="h-auto" inner="space-y-4">
          <h2 className="font-semibold">כמויות וזמני ייצור</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-sm"><span className="text-muted-foreground">מינימום</span><input type="number" min={1} value={show(draft.qty.min)} onChange={(e) => up((d) => { d.qty.min = num(e.target.value); })} className={input} /></label>
            <label className="space-y-1 text-sm"><span className="text-muted-foreground">מקסימום</span><input type="number" min={1} value={show(draft.qty.max)} onChange={(e) => up((d) => { d.qty.max = num(e.target.value); })} className={input} /></label>
            <label className="space-y-1 text-sm"><span className="text-muted-foreground">כמות חופשית בכפולות של</span><input type="number" min={1} value={show(draft.qty.step)} onChange={(e) => up((d) => { d.qty.step = num(e.target.value); })} className={input} /></label>
            <label className="space-y-1 text-sm sm:col-span-3"><span className="text-muted-foreground">כמויות מוצעות בטבלת המחירים (מופרדות בפסיק)</span><input value={presets} onChange={(e) => { setStatus(undefined); setPresets(e.target.value); }} className={input} dir="ltr" /></label>
          </div>
          <fieldset className="flex flex-wrap gap-4">
            <legend className="mb-2 text-sm text-muted-foreground">זמני ייצור זמינים</legend>
            {PRODUCTION_IDS.map((pid) => (
              <label key={pid} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="accent-foreground" checked={draft.production.includes(pid)}
                  onChange={(e) => up((d) => { d.production = PRODUCTION_IDS.filter((x) => (x === pid ? e.target.checked : d.production.includes(x))); })} />
                {catalog.production[pid].label} <span className="text-xs text-muted-foreground">({catalog.production[pid].days} ימים, {catalog.production[pid].pct > 0 ? "+" : ""}{Math.round(catalog.production[pid].pct * 100)}%)</span>
              </label>
            ))}
          </fieldset>
        </GlowCard>

        <GlowCard className="h-auto" inner="space-y-2">
          <h2 className="font-semibold">פרטים על המוצר</h2>
          <textarea rows={4} value={details} onChange={(e) => { setStatus(undefined); setDetails(e.target.value); }} className={`${input} resize-y`} aria-label="פרטים על המוצר, שורה לכל פרט" />
          <p className="text-xs text-muted-foreground">שורה לכל פרט. מוצג בעמוד המוצר.</p>
        </GlowCard>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:col-span-4">
        <GlowCard className="h-auto" inner="space-y-4">
          <h2 className="font-semibold">תצוגה מקדימה של המחירים</h2>
          <p className="text-xs text-muted-foreground">ברירות מחדל · ייצור {catalog.production[prod]?.label ?? "—"} · כולל מע״מ</p>
          {errors.length ? (
            <ul className="space-y-1.5 text-sm text-amber-700 dark:text-amber-400" role="alert">{errors.map((e) => <li key={e} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{e}</li>)}</ul>
          ) : (<>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="pb-2 text-right font-normal">כמות</th><th className="pb-2 text-right font-normal">ליח׳</th><th className="pb-2 text-left font-normal">סה״כ</th></tr></thead>
              <tbody>{rows.map((l, i) => { const cheaper = !!l && rows.slice(0, i).some((x) => x && x.subtotal > l.subtotal); return l && (
                <tr key={i} className={`border-t ${cheaper ? "text-amber-700 dark:text-amber-400" : ""}`}><td className="py-1.5">{l.quantity.toLocaleString("he-IL")}{cheaper && " ⚠"}</td><td className="py-1.5 text-muted-foreground">{ils(withVat(l.unitPrice))}</td><td className="py-1.5 text-left">{ils(withVat(l.subtotal))}</td></tr>); })}</tbody>
            </table>
            {rows.some((l, i) => l && rows.slice(0, i).some((x) => x && x.subtotal > l.subtotal)) && <p className="text-xs text-amber-700 dark:text-amber-400">⚠ כמות גדולה יותר יוצאת זולה בסה״כ מכמות קטנה — לקוחות יזמינו את הגדולה. מותר לשמור, אבל כדאי לבדוק את המדרגות.</p>}
          </>)}
          <button type="button" onClick={save} disabled={pending || errors.length > 0} className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-2.5 font-medium text-background disabled:opacity-40">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} שמירה
          </button>
          {status && (
            <div className={`text-sm ${status.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} role="status">
              <p className="flex items-center gap-2">{status.ok ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}{status.msg}</p>
              {status.errors?.map((e) => <p key={e} className="text-xs">{e}</p>)}
            </div>
          )}
          <div className="flex items-center justify-between border-t pt-3 text-xs">
            <Link href={`/p/${id}`} target="_blank" className="flex items-center gap-1 py-2 text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /> צפייה באתר</Link>
            <button type="button" onClick={duplicate} disabled={pending} className="flex items-center gap-1 py-2 text-muted-foreground hover:text-foreground"><Copy className="h-3.5 w-3.5" /> שכפול</button>
            {builtin
              ? <button type="button" onClick={reset} disabled={pending} className="flex items-center gap-1 py-2 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"><RotateCcw className="h-3.5 w-3.5" /> שחזור למקור</button>
              : <button type="button" onClick={remove} disabled={pending} className="flex items-center gap-1 py-2 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /> מחיקה</button>}
          </div>
        </GlowCard>
      </aside>
    </div>
  );
}
