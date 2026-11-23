"use client";

import { useEffect, useMemo, useState } from "react";
import { Upload, Check, Loader2, ZoomIn, AlertTriangle, BadgeCheck } from "lucide-react";
import { PRODUCTS, quote, ils, printDpi, dpiLevel } from "@/lib/catalog";
import { Mockup } from "./mockup";
import { GlowCard } from "./glow-card";

const input = "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-400";

export function Configurator() {
  const [pid, setPid] = useState(PRODUCTS[0].id);
  const p = PRODUCTS.find((x) => x.id === pid)!;
  const [size, setSize] = useState(p.sizes[0]);
  const [qty, setQty] = useState(p.minQty);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ id: string; total: number }>();
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(false);
  const [px, setPx] = useState<[number, number]>();

  // listen for "choose product" clicks from the catalog grid
  useEffect(() => {
    const on = (e: Event) => pick((e as CustomEvent<string>).detail);
    window.addEventListener("pick-product", on);
    return () => window.removeEventListener("pick-product", on);
  });

  function pick(id: string) {
    const np = PRODUCTS.find((x) => x.id === id)!;
    setPid(id); setSize(np.sizes[0]); setQty(np.minQty); setDone(undefined);
  }

  function onFile(f?: File) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f); setZoom(1); setFit(false); setPx(undefined);
    const url = f && f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined;
    setPreview(url);
    if (url && f?.type !== "image/svg+xml") { // SVG is vector — resolution never limits print
      const img = new Image();
      img.onload = () => setPx([img.naturalWidth, img.naturalHeight]);
      img.src = url;
    }
  }

  const dpi = px && printDpi(size, px[0], px[1]);
  const level = dpi && dpiLevel(dpi);

  const q = useMemo(() => { try { return quote(pid, qty, size); } catch (e) { return (e as Error).message; } }, [pid, qty, size]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const customer = Object.fromEntries(new FormData(e.currentTarget)); // read before any await: currentTarget is nulled after
    if (preview && (zoom !== 1 || fit)) customer.notes = `${customer.notes ?? ""}\n[מיקום במוקאפ: ${fit ? "התאמה מלאה" : "מילוי"}, זום ${Math.round(zoom * 100)}%]`.trim();
    setErr(""); setBusy(true);
    try {
      let artwork: string | undefined;
      if (file) {
        const fd = new FormData(); fd.append("file", file);
        const up = await (await fetch("/api/upload", { method: "POST", body: fd })).json();
        if (up.error) throw new Error(up.error);
        artwork = up.id;
      }
      const r = await (await fetch("/api/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: pid, quantity: qty, size, artwork, customer }) })).json();
      if (r.error) throw new Error(r.error);
      setDone(r);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <GlowCard className="lg:col-span-5 min-h-[26rem]" inner="flex items-center justify-center bg-neutral-900/40">
        <div className="flex h-full w-full flex-col items-center justify-center gap-4">
          <div className="aspect-square w-full max-w-md"><Mockup kind={p.mockup} src={preview} zoom={zoom} fit={fit} /></div>
          {preview && (
            <div className="flex w-full max-w-sm items-center gap-3 text-xs text-neutral-400">
              <ZoomIn className="h-4 w-4 shrink-0" />
              <input type="range" min={0.5} max={2} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="זום על הגרפיקה" className="flex-1 accent-white" />
              <span className="w-10 tabular-nums">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setFit(!fit)} className="rounded-full border px-2.5 py-1 hover:text-white">{fit ? "מילוי" : "התאמה"}</button>
            </div>
          )}
          {file && !preview && <p className="text-xs text-neutral-400">קובץ PDF צורף — תצוגה מקדימה זמינה לתמונות בלבד</p>}
        </div>
      </GlowCard>

      <GlowCard className="lg:col-span-7" inner="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1.5 text-sm"><span className="text-neutral-400">מוצר</span>
            <select className={input} value={pid} onChange={(e) => pick(e.target.value)}>{PRODUCTS.map((x) => <option key={x.id} value={x.id} className="bg-neutral-900">{x.name}</option>)}</select></label>
          <label className="space-y-1.5 text-sm"><span className="text-neutral-400">מידה</span>
            <select className={input} value={size} onChange={(e) => setSize(e.target.value)}>{p.sizes.map((s) => <option key={s} className="bg-neutral-900">{s}</option>)}</select></label>
          <label className="space-y-1.5 text-sm"><span className="text-neutral-400">כמות (מינ׳ {p.minQty})</span>
            <input type="number" className={input} min={p.minQty} step={1} value={qty} onChange={(e) => setQty(Math.floor(Number(e.target.value)))} /></label>
        </div>

        <div className="flex flex-wrap gap-2">{p.tiers.map((t) => (
          <button key={t.min} type="button" onClick={() => setQty(t.min)} className={`rounded-full border px-3 py-1 text-xs ${qty === t.min ? "border-white text-white" : "text-neutral-400"}`}>{t.min.toLocaleString("he-IL")} יח׳</button>
        ))}</div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-4 text-sm text-neutral-400 hover:border-neutral-500">
          <Upload className="h-4 w-4" />
          <span>{file ? file.name : "העלאת גרפיקה (PNG, JPG, SVG, PDF — עד 20MB)"}</span>
          <input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {level && (
          <p className={`flex items-center gap-2 text-xs ${level === "low" ? "text-amber-400" : "text-emerald-400"}`} role="status">
            {level === "low" ? <AlertTriangle className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
            {level === "good" ? `איכות מעולה להדפסה (${dpi} DPI)` : level === "ok" ? `איכות סבירה להדפסה (${dpi} DPI) — מומלץ 300` : `רזולוציה נמוכה למידה ${size} (${dpi} DPI) — ההדפסה עלולה לצאת מטושטשת. מומלץ קובץ גדול יותר או PDF/SVG.`}
          </p>
        )}

        <div className="rounded-xl border p-4 text-sm">
          {typeof q === "string" ? <p className="text-red-400">{q}</p> : (
            <dl className="grid grid-cols-2 gap-y-1.5">
              <dt className="text-neutral-400">מחיר ליחידה</dt><dd>{ils(q.unitPrice)}</dd>
              {q.setup > 0 && <><dt className="text-neutral-400">הכנה לדפוס</dt><dd>{ils(q.setup)}</dd></>}
              <dt className="text-neutral-400">משלוח עד הבית</dt><dd>{q.shipping ? ils(q.shipping) : "חינם"}</dd>
              <dt className="text-neutral-400">מע״מ</dt><dd>{ils(q.vat)}</dd>
              <dt className="pt-2 text-base font-semibold">סה״כ לתשלום</dt><dd className="pt-2 text-2xl font-semibold">{ils(q.total)}</dd>
            </dl>
          )}
        </div>

        {done ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-700 bg-emerald-950/40 p-4 text-sm">
            <Check className="h-5 w-5 text-emerald-400" />
            <span>ההזמנה <b>{done.id}</b> התקבלה ({ils(done.total)}). נחזור אליך לאישור הגרפיקה ותשלום.</span>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <input name="name" required placeholder="שם מלא" className={input} autoComplete="name" />
            <input name="phone" required placeholder="טלפון נייד" className={input} inputMode="tel" autoComplete="tel" />
            <input name="address" required placeholder="רחוב ומספר" className={input} autoComplete="street-address" />
            <input name="city" required placeholder="עיר" className={input} autoComplete="address-level2" />
            <input name="email" type="email" placeholder="אימייל לאישור הזמנה (רשות)" className={`${input} sm:col-span-2`} autoComplete="email" />
            <textarea name="notes" rows={2} maxLength={400} placeholder="הערות להזמנה (רשות)" className={`${input} resize-none sm:col-span-2`} />
            {err && <p className="text-sm text-red-400 sm:col-span-2" role="alert">{err}</p>}
            <button disabled={busy || typeof q === "string"} className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 font-medium text-black disabled:opacity-50 sm:col-span-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} הזמנה עם משלוח עד הבית
            </button>
          </form>
        )}
      </GlowCard>
    </div>
  );
}
