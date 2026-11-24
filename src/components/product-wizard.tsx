"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Upload, Check, Loader2, ZoomIn, AlertTriangle, BadgeCheck, ChevronLeft, ChevronRight, ShoppingCart, FileText, Clock } from "lucide-react";
import {
  findProduct, normalize, visibleValues, priceLine, withVat, tierAt, ils, mockupFor, tintFor, printCmFor, printDpi, dpiLevel,
  addBusinessDays, type ProductionId, type Line,
} from "@/lib/catalog";
import { cart, useToday } from "@/lib/cart";
import { useCatalog } from "./catalog-provider";
import { Mockup } from "./mockup";
import { GlowCard } from "./glow-card";

const STEPS = ["מאפיינים", "כמות", "זמן ייצור", "גרפיקה"];
const chip = (on: boolean) => `rounded-xl border px-3 py-2 text-sm text-right transition ${on ? "border-white bg-white/5 text-white" : "text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"}`;
const input = "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-400";
const fmtDate = (d: Date) => d.toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "numeric" });

export function ProductWizard({ productId }: { productId: string }) {
  const cat = useCatalog();
  const p = findProduct(cat, productId)!;
  const splitOpt = p.options.find((o) => o.kind === "split");
  const today = useToday();

  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(p.qty.presets[Math.min(1, p.qty.presets.length - 1)]);
  const [split, setSplit] = useState<Record<string, number>>(() => (splitOpt ? { [(splitOpt.values.filter((v) => v.active !== false)[1] ?? splitOpt.values[0]).id]: p.qty.presets[0] } : {}));
  const [production, setProduction] = useState<ProductionId>(p.production.includes("standard") ? "standard" : p.production[0]);
  const [art, setArt] = useState<{ id?: string; name: string; preview?: string; thumb?: string; px?: [number, number]; busy?: boolean; error?: string }>();
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(false);
  const [added, setAdded] = useState(false);
  const [view, setView] = useState<"photo" | "mock">(p.image ? "photo" : "mock");

  const sel = useMemo(() => normalize(p, picked), [p, picked]);
  const vis = visibleValues(p, sel);
  const input0 = { productId: p.id, quantity: qty, options: sel, split: splitOpt ? split : undefined, production };
  const line = (() => { try { return priceLine(cat, input0); } catch (e) { return (e as Error).message; } })(); // cheap: a few tier lookups
  const ok = typeof line !== "string";
  const quote = (patch: Partial<typeof input0>): Line | undefined => { try { return priceLine(cat, { ...input0, ...patch }); } catch { return undefined; } };

  const cm = printCmFor(p, sel);
  const dpi = art?.px && cm && printDpi(cm, art.px[0], art.px[1]);
  const level = dpi ? dpiLevel(dpi) : undefined;

  async function onFile(f?: File) {
    if (!f) return;
    if (art?.preview) URL.revokeObjectURL(art.preview);
    const preview = f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined;
    setArt({ name: f.name, preview, busy: true }); setZoom(1); setFit(false); setView("mock");
    let px: [number, number] | undefined, thumb: string | undefined;
    if (preview) {
      const img = new window.Image();
      img.src = preview;
      await img.decode().catch(() => {});
      if (f.type !== "image/svg+xml" && img.naturalWidth) px = [img.naturalWidth, img.naturalHeight]; // SVG is vector — DPI never limits it
      try { // small thumbnail for the cart (the full file stays on the server)
        const c = document.createElement("canvas"), k = Math.min(1, 240 / Math.max(img.naturalWidth || 240, img.naturalHeight || 240));
        c.width = Math.max(1, Math.round((img.naturalWidth || 240) * k)); c.height = Math.max(1, Math.round((img.naturalHeight || 240) * k));
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        thumb = c.toDataURL("image/webp", 0.7);
      } catch { /* tainted/unsupported — cart shows the mockup without art */ }
    }
    try {
      const fd = new FormData(); fd.append("file", f);
      const r = await (await fetch("/api/upload", { method: "POST", body: fd })).json();
      if (r.error) throw new Error(r.error);
      setArt({ id: r.id, name: f.name, preview, thumb, px });
    } catch (e) { setArt({ name: f.name, preview, px, error: (e as Error).message }); }
  }

  function addToCart() {
    if (!ok) return;
    const placement = art?.preview && (zoom !== 1 || fit) ? `מיקום: ${fit ? "התאמה מלאה" : "מילוי"}, זום ${Math.round(zoom * 100)}%` : undefined;
    cart.add({ ...input0, quantity: line.quantity, artwork: art?.id, placement, thumb: art?.thumb, fileName: art?.id ? art.name : undefined });
    setAdded(true);
  }

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const eta = (days: number) => today && fmtDate(addBusinessDays(today, days));

  return (
    <div className="grid items-start gap-4 lg:grid-cols-12">
      {/* mockup */}
      <div className="lg:col-span-5">
        <GlowCard className="h-auto lg:sticky lg:top-24" inner="flex flex-col items-center justify-center gap-4 bg-neutral-900/40 p-4">
          {p.image && (
            <div className="flex gap-1 self-stretch rounded-xl border p-1 text-xs" role="tablist" aria-label="תצוגה">
              {(["photo", "mock"] as const).map((v) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`flex-1 rounded-lg py-1.5 ${view === v ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"}`}>{v === "photo" ? "תמונת מוצר" : "הדמיה עם הקובץ שלך"}</button>
              ))}
            </div>
          )}
          {view === "photo" && p.image ? (
            <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-xl"><Image src={p.image} alt={p.name} fill priority sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" /></div>
          ) : (
            <div className="aspect-square w-full max-w-md"><Mockup kind={mockupFor(p, sel)} tint={tintFor(p, sel)} src={art?.preview} zoom={zoom} fit={fit} /></div>
          )}
          {view === "mock" && art?.preview && (
            <div className="flex w-full max-w-sm items-center gap-3 text-xs text-neutral-400">
              <ZoomIn className="h-4 w-4 shrink-0" />
              <input type="range" min={0.5} max={2} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="זום על הגרפיקה" className="flex-1 accent-white" />
              <span className="w-10 tabular-nums">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setFit(!fit)} className="rounded-full border px-2.5 py-1 hover:text-white">{fit ? "מילוי" : "התאמה"}</button>
            </div>
          )}
          {art && !art.preview && <p className="flex items-center gap-2 text-xs text-neutral-400"><FileText className="h-4 w-4" /> {art.name} — תצוגה מקדימה זמינה לתמונות בלבד</p>}
          <p className="text-center text-xs text-neutral-500">{view === "photo" ? "תמונת דוגמה — הלוגו שלכם יודפס באותו מיקום." : "הדמיה להמחשה. ייתכנו הבדלי גוון קלים בין המסך להדפסה."}</p>
        </GlowCard>
      </div>

      {/* steps */}
      <div className="space-y-4 lg:col-span-7">
        <ol className="grid grid-cols-4 gap-2 text-xs" aria-label="שלבי ההזמנה">
          {STEPS.map((t, i) => (
            <li key={t}>
              <button type="button" onClick={() => setStep(i)} aria-current={step === i ? "step" : undefined}
                className={`flex w-full flex-col items-center gap-1.5 rounded-xl border px-1 py-2 ${step === i ? "border-white text-white" : i < step ? "text-neutral-300" : "text-neutral-500"}`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${i < step ? "bg-white text-black" : "border"}`}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>{t}
              </button>
            </li>
          ))}
        </ol>

        <GlowCard className="h-auto" inner="space-y-6 min-h-[22rem]">
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold">בחירת מאפיינים</h2>
              {p.options.filter((o) => o.kind !== "split" && vis[o.id].length).map((o) => (
                <fieldset key={o.id} className="space-y-2">
                  <legend className="mb-2 text-sm text-neutral-400">{o.title}{o.kind === "color" && <span className="text-white"> · {o.values.find((v) => v.id === sel[o.id])?.title}</span>}</legend>
                  <div className="flex flex-wrap gap-2">
                    {vis[o.id].map((v) => {
                      const on = sel[o.id] === v.id;
                      const delta = withVat(tierAt(v.tiers, ok ? line.quantity : qty));
                      return o.kind === "color" ? (
                        <button key={v.id} type="button" onClick={() => { setPicked({ ...picked, [o.id]: v.id }); if (o.id !== "inside") setView("mock"); }} aria-label={v.title} aria-pressed={on} title={v.title}
                          className={`h-9 w-9 rounded-full border-2 ${on ? "border-white ring-2 ring-white/30" : "border-neutral-700"}`} style={{ background: v.color }} />
                      ) : (
                        <button key={v.id} type="button" onClick={() => setPicked({ ...picked, [o.id]: v.id })} aria-pressed={on} className={chip(on)}>
                          {v.title}{delta !== 0 && <span className="block text-xs text-neutral-500">{delta > 0 ? "+" : "−"}{ils(Math.abs(delta))} ליח׳</span>}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">בחירת כמות</h2>
              {splitOpt ? (
                <>
                  <p className="text-sm text-neutral-400">חלקו את הכמות בין המידות. המחיר נקבע לפי הכמות הכוללת.</p>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {splitOpt.values.filter((v) => v.active !== false).map((v) => (
                      <label key={v.id} className="space-y-1 text-center text-sm"><span className="text-neutral-400">{v.title}</span>
                        <input type="number" min={0} inputMode="numeric" value={split[v.id] ?? 0} onChange={(e) => setSplit({ ...split, [v.id]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} className={`${input} text-center`} /></label>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-neutral-500">מדרגות מחיר: {p.qty.presets.map((n) => { const l = quote({ split: { [splitOpt.values.find((v) => v.active !== false)?.id ?? ""]: n } }); return l && <span key={n} className="rounded-full border px-2 py-0.5">{n}+ · {ils(withVat(l.unitPrice))}</span>; })}</div>
                </>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-neutral-500"><tr><th className="pb-2 text-right font-normal">כמות</th><th className="pb-2 text-right font-normal">ליחידה</th><th className="pb-2 text-left font-normal">סה״כ כולל מע״מ</th></tr></thead>
                    <tbody>
                      {p.qty.presets.map((n) => { const l = quote({ quantity: n }); const on = qty === n; return l && (
                        <tr key={n} onClick={() => setQty(n)} className={`cursor-pointer border-t ${on ? "bg-white/5 text-white" : "text-neutral-300 hover:bg-white/[.03]"}`}>
                          <td className="py-2.5 pr-2"><label className="flex cursor-pointer items-center gap-2"><input type="radio" name="qty" checked={on} onChange={() => setQty(n)} className="accent-white" />{n.toLocaleString("he-IL")}</label></td>
                          <td className="py-2.5 text-neutral-400">{ils(withVat(l.unitPrice))}</td>
                          <td className="py-2.5 text-left font-medium">{ils(withVat(l.subtotal))}</td>
                        </tr>); })}
                    </tbody>
                  </table>
                  <label className="flex items-center gap-3 text-sm text-neutral-400">כמות אחרת
                    <input type="number" min={p.qty.min} max={p.qty.max} step={p.qty.step} value={qty} onChange={(e) => setQty(Math.floor(Number(e.target.value) || 0))} className={`${input} w-32`} />
                    <span className="text-xs">({p.qty.min.toLocaleString("he-IL")}–{p.qty.max.toLocaleString("he-IL")}{p.qty.step > 1 && `, בכפולות של ${p.qty.step}`})</span>
                  </label>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">זמן ייצור</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {p.production.map((id) => { const pr = cat.production[id]; const l = quote({ production: id }); const on = production === id; return (
                  <button key={id} type="button" onClick={() => setProduction(id)} aria-pressed={on} className={`${chip(on)} flex items-center justify-between gap-3 p-4`}>
                    <span className="space-y-1">
                      <span className="flex items-center gap-2 font-medium"><Clock className="h-4 w-4" /> {pr.label} · {pr.days} ימי עסקים</span>
                      {today && <span className="block text-xs text-neutral-500">מוכן עד {eta(pr.days)} · בשליח עד הבית ~{eta(pr.days + cat.shipping.home.days)}</span>}
                    </span>
                    {l && <span className="text-left text-sm">{ils(withVat(l.subtotal))}{pr.pct !== 0 && <span className="block text-xs text-neutral-500">{pr.pct > 0 ? "+" : ""}{pr.pct * 100}%</span>}</span>}
                  </button>); })}
              </div>
              <p className="text-xs text-neutral-500">ימי עסקים: א׳–ה׳, לא כולל חגים. זמן הייצור נספר מאישור הגרפיקה.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">גרפיקה</h2>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-5 text-sm text-neutral-300 hover:border-neutral-500">
                {art?.busy ? <Loader2 className="h-5 w-5 animate-spin" /> : art?.id ? <Check className="h-5 w-5 text-emerald-400" /> : <Upload className="h-5 w-5" />}
                <span>{art ? `${art.name}${art.busy ? " — מעלה…" : art.id ? " — הועלה" : ""}` : "העלאת קובץ מוכן — PDF, PNG, JPG, SVG עד 25MB"}</span>
                <input type="file" className="sr-only" accept="application/pdf,image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
              {art?.error && <p className="text-sm text-red-400" role="alert">{art.error}</p>}
              {level && (
                <p className={`flex items-center gap-2 text-xs ${level === "low" ? "text-amber-400" : "text-emerald-400"}`} role="status">
                  {level === "low" ? <AlertTriangle className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
                  {level === "good" ? `איכות מעולה להדפסה (${dpi} DPI)` : level === "ok" ? `איכות סבירה (${dpi} DPI) — מומלץ 300` : `רזולוציה נמוכה למידה הזו (${dpi} DPI) — ההדפסה עלולה לצאת מטושטשת. מומלץ PDF וקטורי או תמונה גדולה יותר.`}
                </p>
              )}
              {!art && <p className="text-sm text-neutral-400">אין קובץ מוכן? אפשר להוסיף לעגלה עכשיו ולשלוח את הגרפיקה אחר כך בצ׳אט או במייל — נחכה לקובץ לפני שנתחיל לייצר.</p>}
              <details className="rounded-xl border p-4 text-sm">
                <summary className="cursor-pointer font-medium">הנחיות להכנת קובץ</summary>
                <ul className="mt-3 list-disc space-y-1.5 pr-5 text-neutral-400">
                  {cm && <li>גודל ההדפסה: {cm[0]}×{cm[1]} ס״מ. הוסיפו 3 מ״מ רקע מכל צד (bleed).</li>}
                  <li>מומלץ PDF וקטורי. תמונות ב-300 DPI לפחות בגודל ההדפסה.</li>
                  <li>טקסט ולוגו — לפחות 4 מ״מ מקו החיתוך (אזור בטוח). חיתוך עשוי לסטות ב-1 מ״מ.</li>
                  <li>טקסט בגודל 7pt לפחות, קווים בעובי 0.25pt לפחות.</li>
                  <li>אין צורך בסימני חיתוך — נוסיף אותם בעצמנו.</li>
                </ul>
              </details>
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-4">
            <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0} className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white disabled:invisible"><ChevronRight className="h-4 w-4" /> חזרה</button>
            {step < STEPS.length - 1 && <button type="button" onClick={next} disabled={step === 1 && !ok} className="flex items-center gap-1 rounded-lg border px-4 py-2 text-sm hover:border-neutral-400 disabled:opacity-40">המשך <ChevronLeft className="h-4 w-4" /></button>}
          </div>
        </GlowCard>

        {/* price bar */}
        <div className="sticky bottom-3 z-10 rounded-2xl border bg-neutral-950/95 p-4 backdrop-blur">
          {added ? (
            <div className="flex flex-wrap items-center gap-3 text-sm" role="status">
              <Check className="h-5 w-5 text-emerald-400" /> נוסף לעגלה!
              <Link href="/cart" className="ms-auto rounded-lg bg-white px-4 py-2 font-medium text-black">לעגלה ולתשלום</Link>
              <button type="button" onClick={() => { setAdded(false); setArt(undefined); setStep(0); }} className="rounded-lg border px-4 py-2">עוד אחד</button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {ok ? (
                <p className="text-sm text-neutral-400"><span className="text-2xl font-semibold text-white">{ils(withVat(line.subtotal))}</span> · {line.quantity.toLocaleString("he-IL")} יח׳ · {ils(withVat(line.unitPrice))} ליח׳ · כולל מע״מ</p>
              ) : <p className="text-sm text-red-400" role="alert">{line}</p>}
              {step < STEPS.length - 1
                ? <button type="button" onClick={next} disabled={!ok} className="ms-auto rounded-lg bg-white px-5 py-2.5 font-medium text-black disabled:opacity-40">המשך</button>
                : <button type="button" onClick={addToCart} disabled={!ok || art?.busy} className="ms-auto flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-medium text-black disabled:opacity-40"><ShoppingCart className="h-4 w-4" /> הוספה לעגלה</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
