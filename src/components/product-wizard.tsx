"use client";

import { uploadArtwork } from "@/lib/upload-client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Upload, Check, Loader2, AlertTriangle, BadgeCheck, ChevronLeft, ChevronRight, ShoppingCart, FileText, Clock } from "lucide-react";
import {
  findProduct, normalize, sidesOf, type Side, visibleValues, priceLine, withVat, tierAt, money, num, mockupFor, tintFor, printDpi, dpiLevel,
  addBusinessDays, HE_MARKET, type ProductionId, type Line,
} from "@/lib/catalog";
import { useI18n } from "@/i18n/client";
import { cart, useToday } from "@/lib/cart";
import { useCatalog } from "./catalog-provider";
import { Mockup } from "./mockup";
import { PhotoMockup } from "./photo-mockup";
import { PHOTO_MOCKUPS, clampPlacement, defaultPlacement, describePlacement, maxWidth, type Placement } from "@/lib/photo-mockups";
import { GlowCard } from "./glow-card";

type Art = { id?: string; name: string; preview?: string; thumb?: string; px?: [number, number]; aspect?: number; busy?: boolean; error?: string };
const chip = (on: boolean) => `rounded-xl border px-3 py-2 text-sm text-start transition ${on ? "border-foreground bg-foreground/5 text-foreground" : "text-muted-foreground hover:border-foreground/40 hover:text-foreground"}`;
const input = "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/50";

export function ProductWizard({ productId }: { productId: string }) {
  const cat = useCatalog();
  const { d, href, f } = useI18n();
  const w = d.wizard, STEPS = w.steps;
  const m = money(cat), mk = cat.market ?? HE_MARKET, n = (x: number) => num(cat, x);
  const fmtDate = (dt: Date) => dt.toLocaleDateString(mk.intl, { weekday: "short", day: "numeric", month: "numeric" });
  const p = findProduct(cat, productId)!;
  const splitOpt = p.options.find((o) => o.kind === "split");
  const today = useToday();

  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(p.qty.presets[Math.min(1, p.qty.presets.length - 1)]);
  const [split, setSplit] = useState<Record<string, number>>(() => (splitOpt ? { [(splitOpt.values.filter((v) => v.active !== false)[1] ?? splitOpt.values[0]).id]: p.qty.presets[0] } : {}));
  const [production, setProduction] = useState<ProductionId>(p.production.includes("standard") ? "standard" : p.production[0]);
  const [arts, setArts] = useState<Record<string, Art>>({}); // one file per printed side
  const [activeSide, setActiveSide] = useState<string>();
  const [added, setAdded] = useState(false);
  const [view, setView] = useState<"photo" | "mock">(p.image ? "photo" : "mock");
  // mobile: the price bar is pinned to the bottom edge — lift the floating chat button above it
  useEffect(() => { const s = document.documentElement.style; s.setProperty("--fab-offset", "5.5rem"); return () => { s.removeProperty("--fab-offset"); }; }, []);

  const sel = useMemo(() => normalize(p, picked), [p, picked]);
  const vis = visibleValues(p, sel);
  const input0 = { productId: p.id, quantity: qty, options: sel, split: splitOpt ? split : undefined, production };
  const line = (() => { try { return priceLine(cat, input0); } catch (e) { return (e as Error).message; } })(); // cheap: a few tier lookups
  const ok = typeof line !== "string";
  const quote = (patch: Partial<typeof input0>): Line | undefined => { try { return priceLine(cat, { ...input0, ...patch }); } catch { return undefined; } };

  // printed sides (front/back, outside/inside…): each has its own file, placement in cm and DPI check
  const pm = PHOTO_MOCKUPS[p.id];
  const sides = useMemo(() => sidesOf(p, sel, cat.t), [p, sel, cat.t]);
  const side = sides.find((x) => x.id === activeSide) ?? sides[0];
  const [placed, setPlaced] = useState<Record<string, { key: string; p: Placement }>>({});
  const sideInfo = (sd: Side) => {
    const art = arts[sd.id], zone = pm?.zone(sd, sel, d.mock), aspect = art?.aspect ?? 1;
    const key = `${art?.preview}|${zone?.label}|${zone?.cm.join("x")}`;
    const place = zone && art?.preview ? (placed[sd.id]?.key === key ? placed[sd.id].p : defaultPlacement(zone, aspect)) : undefined;
    const cm: [number, number] | undefined = place ? [place.w, place.w * aspect] : sd.cm;
    const dpi = art?.px && cm ? printDpi(cm, art.px[0], art.px[1]) : undefined;
    return { art, zone, aspect, key, place, dpi, level: dpi ? dpiLevel(dpi) : undefined };
  };
  const cur = sideInfo(side);
  const setPlace = (np: Placement) => cur.zone && setPlaced((m) => ({ ...m, [side.id]: { key: cur.key, p: clampPlacement(cur.zone!, cur.aspect, np) } }));

  async function onFile(sd: Side, file?: File) {
    if (!file) return;
    const old = arts[sd.id]?.preview;
    if (old) URL.revokeObjectURL(old);
    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
    const put = (a: Art) => setArts((x) => ({ ...x, [sd.id]: a }));
    put({ name: file.name, preview, busy: true }); setActiveSide(sd.id); setView("mock");
    let px: [number, number] | undefined, thumb: string | undefined, aspect: number | undefined;
    if (preview) {
      const img = new window.Image();
      img.src = preview;
      await img.decode().catch(() => {});
      if (img.naturalWidth) aspect = img.naturalHeight / img.naturalWidth;
      if (file.type !== "image/svg+xml" && img.naturalWidth) px = [img.naturalWidth, img.naturalHeight]; // SVG is vector — DPI never limits it
      try { // small thumbnail for the cart (the full file stays on the server)
        const c = document.createElement("canvas"), k = Math.min(1, 240 / Math.max(img.naturalWidth || 240, img.naturalHeight || 240));
        c.width = Math.max(1, Math.round((img.naturalWidth || 240) * k)); c.height = Math.max(1, Math.round((img.naturalHeight || 240) * k));
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        thumb = c.toDataURL("image/webp", 0.7);
      } catch { /* tainted/unsupported — cart shows the mockup without art */ }
    }
    try {
      put({ id: await uploadArtwork(file, d.errors), name: file.name, preview, thumb, px, aspect });
    } catch (e) { put({ name: file.name, preview, px, aspect, error: (e as Error).message }); }
  }

  function addToCart() {
    if (!ok) return;
    const files = sides.map((sd) => {
      const x = sideInfo(sd);
      return { side: sd.id, artwork: x.art?.id, placement: x.zone && x.place ? describePlacement(x.zone, x.aspect, x.place, d.mock) : undefined };
    });
    const first = sides.map((sd) => arts[sd.id]).find((a) => a?.id);
    const names = sides.map((sd) => arts[sd.id]?.id && arts[sd.id]!.name).filter(Boolean);
    cart.add({ ...input0, quantity: line.quantity, files, artwork: first?.id, placement: files[0]?.placement, thumb: first?.thumb, fileName: names.length ? names.join(" · ") : undefined });
    setAdded(true);
  }

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const eta = (days: number) => today && fmtDate(addBusinessDays(today, days, mk.weekend));

  return (
    <div className="grid items-start gap-4 max-md:pb-24 lg:grid-cols-12 [&>*]:min-w-0">
      {/* mockup */}
      <div className="lg:col-span-5">
        <GlowCard className="h-auto lg:sticky lg:top-24" inner="flex flex-col items-center justify-center gap-4 bg-muted/40 p-4">
          {p.image && (
            <div className="flex gap-1 self-stretch rounded-xl border p-1 text-xs" role="tablist" aria-label={w.viewAria}>
              {(["photo", "mock"] as const).map((v) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`flex-1 rounded-lg py-1.5 ${view === v ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{v === "photo" ? w.viewPhoto : w.viewMock}</button>
              ))}
            </div>
          )}
          {view === "photo" && p.image ? (
            <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-xl"><Image src={p.image} alt={p.name} fill priority sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" /></div>
          ) : (
            <div className="w-full max-w-md space-y-2">
              {sides.length > 1 && (
                <div className="flex flex-wrap justify-center gap-1 text-xs" role="tablist" aria-label={w.sideAria}>
                  {sides.map((sd) => <button key={sd.id} type="button" role="tab" aria-selected={sd.id === side.id} onClick={() => setActiveSide(sd.id)} className={`rounded-full border px-3 py-1 ${sd.id === side.id ? "border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{sd.label}{arts[sd.id]?.id ? " ✓" : ""}</button>)}
                </div>
              )}
              {cur.zone ? <PhotoMockup key={side.id} t={d.mock} zone={cur.zone} tint={tintFor(p, sel)} art={cur.art?.preview} aspect={cur.aspect} place={cur.place} onPlace={setPlace} />
                : <div className="aspect-square w-full"><Mockup kind={mockupFor(p, sel)} tint={tintFor(p, sel)} src={cur.art?.preview} placeholder={d.mock.placeholder} label={d.mock.previewAria} /></div>}
            </div>
          )}
          {view === "mock" && cur.zone && cur.place && (() => { const zone = cur.zone, place = cur.place, aspect = cur.aspect, mw = maxWidth(zone, aspect); return (
            <div className="w-full max-w-md space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="shrink-0">{w.width}</span>
                <input type="range" min={Math.min(1, mw)} max={Math.floor(mw * 10) / 10} step={0.1} value={place.w} onChange={(e) => setPlace({ ...place, w: Number(e.target.value), x: place.x + (place.w - Number(e.target.value)) / 2 })} aria-label={w.widthAria} className="h-6 flex-1 accent-foreground" />
                <span className="w-16 text-end tabular-nums" dir="ltr">{place.w.toFixed(1)} cm</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setPlace({ ...place, x: (zone.cm[0] - place.w) / 2 })} className="rounded-full border px-2.5 py-1 hover:text-foreground">{w.center}</button>
                <button type="button" onClick={() => setPlace({ w: mw, x: (zone.cm[0] - mw) / 2, y: 0 })} className="rounded-full border px-2.5 py-1 hover:text-foreground">{w.biggest}</button>
                <button type="button" onClick={() => setPlaced((x) => { const y = { ...x }; delete y[side.id]; return y; })} className="rounded-full border px-2.5 py-1 hover:text-foreground">{w.reset}</button>
              </div>
              <p className="font-medium text-foreground" role="status">{describePlacement(zone, aspect, place, d.mock)}</p>
              <p>{w.dragHint}</p>
            </div>); })()}
          {view === "mock" && !cur.art && <p className="text-center text-xs text-muted-foreground">{sides.length > 1 ? f(w.uploadHintMulti, { side: side.label }) : w.uploadHint}</p>}
          {cur.art && !cur.art.preview && <p className="flex items-center gap-2 text-xs text-muted-foreground"><FileText className="h-4 w-4" /> {f(w.previewImagesOnly, { name: cur.art.name })}</p>}
          <p className="text-center text-xs text-muted-foreground">{view === "photo" ? w.photoNote : w.mockNote}</p>
        </GlowCard>
      </div>

      {/* steps */}
      <div className="space-y-4 lg:col-span-7">
        <ol className="grid grid-cols-4 gap-2 text-xs" aria-label={w.stepsAria}>
          {STEPS.map((t, i) => (
            <li key={t}>
              <button type="button" onClick={() => setStep(i)} aria-current={step === i ? "step" : undefined}
                className={`flex w-full flex-col items-center gap-1.5 rounded-xl border px-1 py-2 ${step === i ? "border-foreground text-foreground" : i < step ? "text-foreground/80" : "text-muted-foreground"}`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${i < step ? "bg-foreground text-background" : "border"}`}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>{t}
              </button>
            </li>
          ))}
        </ol>

        <GlowCard className="h-auto" inner="space-y-6 min-h-[22rem]">
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold">{w.chooseOptions}</h2>
              {p.options.filter((o) => o.kind !== "split" && vis[o.id].length).map((o) => (
                <fieldset key={o.id} className="space-y-2">
                  <legend className="mb-2 text-sm text-muted-foreground">{o.title}{o.kind === "color" && <span className="text-foreground"> · {o.values.find((v) => v.id === sel[o.id])?.title}</span>}</legend>
                  <div className="flex flex-wrap gap-2">
                    {vis[o.id].map((v) => {
                      const on = sel[o.id] === v.id;
                      const delta = withVat(tierAt(v.tiers, ok ? line.quantity : qty), cat);
                      return o.kind === "color" ? (
                        <button key={v.id} type="button" onClick={() => { setPicked({ ...picked, [o.id]: v.id }); if (o.id !== "inside") setView("mock"); }} aria-label={v.title} aria-pressed={on} title={v.title}
                          className={`h-9 w-9 rounded-full border-2 ${on ? "border-foreground ring-2 ring-foreground/30" : "border-foreground/20"}`} style={{ background: v.color }} />
                      ) : (
                        <button key={v.id} type="button" onClick={() => setPicked({ ...picked, [o.id]: v.id })} aria-pressed={on} className={chip(on)}>
                          {v.title}{delta !== 0 && <span className="block text-xs text-muted-foreground">{f(w.perUnitDelta, { sign: delta > 0 ? "+" : "−", price: m(Math.abs(delta)) })}</span>}
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
              <h2 className="text-lg font-semibold">{w.chooseQty}</h2>
              {splitOpt ? (
                <>
                  <p className="text-sm text-muted-foreground">{w.splitHint}</p>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {splitOpt.values.filter((v) => v.active !== false).map((v) => (
                      <label key={v.id} className="space-y-1 text-center text-sm"><span className="text-muted-foreground">{v.title}</span>
                        <input type="number" min={0} inputMode="numeric" value={split[v.id] ?? 0} onChange={(e) => setSplit({ ...split, [v.id]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} className={`${input} text-center`} /></label>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">{w.priceTiers} {p.qty.presets.map((q) => { const l = quote({ split: { [splitOpt.values.find((v) => v.active !== false)?.id ?? ""]: q } }); return l && <span key={q} className="rounded-full border px-2 py-0.5">{n(q)}+ · {m(withVat(l.unitPrice, cat))}</span>; })}</div>
                </>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground"><tr><th className="pb-2 text-start font-normal">{w.qty}</th><th className="pb-2 text-start font-normal">{w.unit}</th><th className="pb-2 text-end font-normal">{f(w.totalInclVat, { vatShort: d.vat.short })}</th></tr></thead>
                    <tbody>
                      {p.qty.presets.map((q) => { const l = quote({ quantity: q }); const on = qty === q; return l && (
                        <tr key={q} onClick={() => setQty(q)} className={`cursor-pointer border-t ${on ? "bg-foreground/5 text-foreground" : "text-foreground/80 hover:bg-foreground/[.03]"}`}>
                          <td className="py-2.5 ps-2"><label className="flex cursor-pointer items-center gap-2"><input type="radio" name="qty" checked={on} onChange={() => setQty(q)} className="accent-foreground" />{n(q)}</label></td>
                          <td className="py-2.5 text-muted-foreground">{m(withVat(l.unitPrice, cat))}</td>
                          <td className="py-2.5 text-end font-medium">{m(withVat(l.subtotal, cat))}</td>
                        </tr>); })}
                    </tbody>
                  </table>
                  <label className="flex items-center gap-3 text-sm text-muted-foreground">{w.otherQty}
                    <input type="number" min={p.qty.min} max={p.qty.max} step={p.qty.step} value={qty} onChange={(e) => setQty(Math.floor(Number(e.target.value) || 0))} className={`${input} w-32`} />
                    <span className="text-xs">({n(p.qty.min)}–{n(p.qty.max)}{p.qty.step > 1 && f(w.multiplesOf, { n: p.qty.step })})</span>
                  </label>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{w.production}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {p.production.map((id) => { const pr = cat.production[id]; const l = quote({ production: id }); const on = production === id; return (
                  <button key={id} type="button" onClick={() => setProduction(id)} aria-pressed={on} className={`${chip(on)} flex items-center justify-between gap-3 p-4`}>
                    <span className="space-y-1">
                      <span className="flex items-center gap-2 font-medium"><Clock className="h-4 w-4" /> {pr.label} · {f(w.businessDays, { n: pr.days })}</span>
                      {today && <span className="block text-xs text-muted-foreground">{f(w.readyBy, { date: eta(pr.days) || "", date2: eta(pr.days + cat.shipping.home.days) || "" })}</span>}
                    </span>
                    {l && <span className="text-end text-sm">{m(withVat(l.subtotal, cat))}{pr.pct !== 0 && <span className="block text-xs text-muted-foreground">{pr.pct > 0 ? "+" : ""}{pr.pct * 100}%</span>}</span>}
                  </button>); })}
              </div>
              <p className="text-xs text-muted-foreground">{f(w.businessDaysNote, { days: w.businessDaysList })}</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{w.artwork}</h2>
              {sides.map((sd) => { const x = sideInfo(sd), art = x.art; return (
                <div key={sd.id} className="space-y-2">
                  {sides.length > 1 && <p className="text-sm font-medium">{sd.label}{sd.cm && <span className="font-normal text-muted-foreground">{f(w.upTo, { w: +sd.cm[0].toFixed(1), h: +sd.cm[1].toFixed(1) })}</span>}</p>}
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-5 text-sm text-foreground/80 hover:border-foreground/40">
                    {art?.busy ? <Loader2 className="h-5 w-5 animate-spin" /> : art?.id ? <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> : <Upload className="h-5 w-5" />}
                    <span className="min-w-0 break-words">{art ? `${art.name}${art.busy ? w.uploading : art.id ? w.uploaded : ""}` : sides.length > 1 ? f(w.uploadFileFor, { side: sd.label.split(" · ")[0] }) : w.uploadFile}</span>
                    <input type="file" className="sr-only" aria-label={f(w.uploadAria, { side: sd.label })} accept="application/pdf,image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => { onFile(sd, e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                  {art?.error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{art.error}</p>}
                  {x.level && (
                    <p className={`flex items-center gap-2 text-xs ${x.level === "low" ? "text-amber-700 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`} role="status">
                      {x.level === "low" ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <BadgeCheck className="h-4 w-4 shrink-0" />}
                      {f(x.level === "good" ? w.dpiGood : x.level === "ok" ? w.dpiOk : w.dpiLow, { dpi: x.dpi ?? 0 })}
                    </p>
                  )}
                </div>); })}
              {!Object.values(arts).some(Boolean) && <p className="text-sm text-muted-foreground">{w.noFile}</p>}
              <details className="rounded-xl border p-4 text-sm">
                <summary className="cursor-pointer font-medium">{w.fileGuide}</summary>
                <ul className="mt-3 list-disc space-y-1.5 ps-5 text-muted-foreground">
                  {side.cm && <li>{f(w.guide[0], { w: +side.cm[0].toFixed(1), h: +side.cm[1].toFixed(1) })}</li>}
                  {w.guide.slice(1).map((g) => <li key={g}>{g}</li>)}
                </ul>
              </details>
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-4">
            <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0} className="flex items-center gap-1 py-2 text-sm text-muted-foreground hover:text-foreground disabled:invisible"><ChevronRight className="h-4 w-4 ltr:rotate-180" /> {w.back}</button>
            {step < STEPS.length - 1 && <button type="button" onClick={next} disabled={step === 1 && !ok} className="flex items-center gap-1 rounded-lg border px-4 py-2 text-sm hover:border-foreground/40 disabled:opacity-40">{w.next} <ChevronLeft className="h-4 w-4 ltr:rotate-180" /></button>}
          </div>
        </GlowCard>

        {/* price bar */}
        <div className="z-30 border bg-card/95 p-4 backdrop-blur max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:border-x-0 max-md:border-b-0 max-md:pb-[max(1rem,env(safe-area-inset-bottom))] md:sticky md:bottom-3 md:rounded-2xl">
          {added ? (
            <div className="flex flex-wrap items-center gap-3 text-sm" role="status">
              <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> {w.added}
              <Link href={href("/cart")} className="ms-auto rounded-lg bg-foreground px-4 py-2 font-medium text-background">{w.toCart}</Link>
              <button type="button" onClick={() => { setAdded(false); setArts({}); setPlaced({}); setStep(0); }} className="rounded-lg border px-4 py-2">{w.another}</button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {ok ? (
                <p className="min-w-0 text-sm text-muted-foreground"><span className="block text-2xl leading-tight font-semibold text-foreground">{m(withVat(line.subtotal, cat))}</span>{f(w.priceBar, { qty: n(line.quantity), unit: m(withVat(line.unitPrice, cat)), vatShort: d.vat.short })}</p>
              ) : <p className="min-w-0 text-sm text-red-600 dark:text-red-400" role="alert">{line}</p>}
              {step < STEPS.length - 1
                ? <button type="button" onClick={next} disabled={!ok} className="ms-auto shrink-0 rounded-lg bg-foreground px-5 py-2.5 font-medium text-background disabled:opacity-40">{w.next}</button>
                : <button type="button" onClick={addToCart} disabled={!ok || Object.values(arts).some((a) => a?.busy)} className="ms-auto flex shrink-0 items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 font-medium text-background disabled:opacity-40"><ShoppingCart className="h-4 w-4" /> {w.addToCart}</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
