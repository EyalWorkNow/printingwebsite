"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clampPlacement, maxWidth, type Placement, type View, type Zone } from "@/lib/photo-mockups";

// Real-photo mockup on a canvas:
//  1. photo; for a colour choice the product is recoloured through its exact mask (shading kept, see recolor()),
//  2. artwork in the zone — flat, or wrapped around a cylinder (mug/bottle), clipped round for round products —
//     with the photo's shading multiplied over it so folds and curvature show through the print.
// A DOM box on top handles drag (move), the corner handle (resize) and the keyboard.
const load = (src: string) => new Promise<HTMLImageElement>((ok, no) => { const i = new window.Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
const isWhite = (c?: string) => !c || parseInt(c.slice(1), 16) >= 0xf0f0f0;
type Imgs = { v: View; photo: HTMLImageElement; mask?: HTMLImageElement; shade: HTMLImageElement };

const LUT = Float32Array.from({ length: 256 }, (_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
const toSrgb = (l: number) => Math.round(255 * (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.min(1, l) ** (1 / 2.4) - 0.055));

/** Natural recolour in linear light: target × the photo's shading (folds, shadows), plus a soft sheen so dark fabrics keep
 *  their relief. The flat-surface reference is the 85th-percentile luminance inside the mask. */
function recolor(photo: HTMLImageElement, mask: HTMLImageElement, hex: string): HTMLCanvasElement {
  const w = photo.naturalWidth, h = photo.naturalHeight;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(mask, 0, 0, w, h);
  const m = g.getImageData(0, 0, w, h).data;
  g.clearRect(0, 0, w, h); g.drawImage(photo, 0, 0);
  const img = g.getImageData(0, 0, w, h), d = img.data;
  const lum = (j: number) => 0.2126 * LUT[d[j]] + 0.7152 * LUT[d[j + 1]] + 0.0722 * LUT[d[j + 2]];
  const sample: number[] = [];
  for (let j = 0; j < d.length; j += 4 * 7) if (m[j + 3] > 250) sample.push(lum(j));
  sample.sort((a, b) => a - b);
  const ref = sample[Math.floor(sample.length * 0.85)] || 1;
  const n = parseInt(hex.slice(1), 16), T = [LUT[n >> 16], LUT[(n >> 8) & 255], LUT[n & 255]];
  const sheen = 0.03 * (1 - Math.sqrt(0.2126 * T[0] + 0.7152 * T[1] + 0.0722 * T[2]));
  for (let j = 0; j < d.length; j += 4) {
    const a = m[j + 3] / 255; if (!a) continue;
    const s = lum(j) / ref, hi = sheen * Math.max(0, s) ** 3;
    for (let k = 0; k < 3; k++) d[j + k] = d[j + k] * (1 - a) + toSrgb(T[k] * Math.min(s, 1.15) + hi) * a;
  }
  g.putImageData(img, 0, 0);
  return c;
}

export function PhotoMockup({ zone, tint, art, aspect, place, onPlace }: {
  zone: Zone; tint?: string; art?: string; aspect: number; place?: Placement; onPlace: (p: Placement) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const v = zone.view;
  const [size, setSize] = useState(0);
  const [loadedViews, setLoadedViews] = useState<Imgs>();
  const imgs = loadedViews?.v === v ? loadedViews : undefined;
  const [loaded, setLoaded] = useState<{ src: string; img: HTMLImageElement }>();
  const artImg = art && loaded?.src === art ? loaded.img : undefined;
  const coloured = useMemo(() => (imgs?.mask && !isWhite(tint) ? recolor(imgs.photo, imgs.mask, tint!) : undefined), [imgs, tint]);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize(Math.round(e.contentRect.width)));
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    let live = true;
    Promise.all([load(v.src), v.mask ? load(v.mask) : undefined, load(v.shade)]).then(([photo, mask, shade]) => live && setLoadedViews({ v, photo, mask, shade })).catch(() => {});
    return () => { live = false; };
  }, [v]);
  useEffect(() => {
    let live = true;
    if (art) load(art).then((img) => live && setLoaded({ src: art, img })).catch(() => {});
    return () => { live = false; };
  }, [art]);

  const [cx, cy, cw, ch] = v.crop;
  const [bx, by, bw, bh] = zone.box;
  const s = size / cw;                                    // display px per photo px
  const sy = bh / zone.cm[1];                             // photo px per cm, vertical
  // horizontal: flat zones scale linearly; cylinders project u (cm along the surface) to x = centre + R·sin(u/r)
  const r = zone.curve, rPx = bw / 2, axis = bx + rPx;
  const sx = r ? rPx / r : bw / zone.cm[0];
  const projX = (u: number) => (r ? axis + rPx * Math.sin(Math.max(-Math.PI / 2, Math.min(Math.PI / 2, (u - zone.cm[0] / 2) / r))) : bx + u * sx);
  const zoneL = projX(0), zoneR = projX(zone.cm[0]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !imgs || !size) return;
    const dpr = window.devicePixelRatio || 1, pw = Math.round(size * dpr), ph = Math.round(size * (ch / cw) * dpr);
    c.width = pw; c.height = ph;
    const g = c.getContext("2d")!;
    g.setTransform(dpr * s, 0, 0, dpr * s, -cx * dpr * s, -cy * dpr * s); // draw in photo coordinates
    g.drawImage(coloured ?? imgs.photo, 0, 0);
    if (!artImg || !place) return;
    const ay = by + place.y * sy, ah = place.w * aspect * sy;
    const layer = () => { const c2 = document.createElement("canvas"); c2.width = pw; c2.height = ph; const x = c2.getContext("2d")!; x.setTransform(g.getTransform()); return [c2, x] as const; };
    // 1. the artwork alone (flat, or wrapped in strips around the cylinder), clipped for round products
    const [A, a] = layer();
    if (zone.clip === "circle") { a.beginPath(); a.ellipse(bx + bw / 2, by + bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2); a.clip(); }
    if (!r) a.drawImage(artImg, bx + place.x * sx, ay, place.w * sx, ah);
    else {
      const N = 90, iw = artImg.naturalWidth || 1000, ih = artImg.naturalHeight || 1000;
      for (let i = 0; i < N; i++) {
        const t0 = (place.x + (place.w * i) / N - zone.cm[0] / 2) / r, t1 = (place.x + (place.w * (i + 1)) / N - zone.cm[0] / 2) / r;
        if (Math.abs(t0) > 1.5 || Math.abs(t1) > 1.5) continue; // round the back — not visible
        const x0 = axis + rPx * Math.sin(t0), x1 = axis + rPx * Math.sin(t1);
        a.drawImage(artImg, (iw * i) / N, 0, Math.min(iw / N + 0.5, iw - (iw * i) / N), ih, x0, ay, x1 - x0 + 0.6, ah);
      }
    }
    // 2. shading over it (folds / curvature / paper), then keep only the artwork's pixels
    const [o, l] = layer();
    l.resetTransform(); l.drawImage(A, 0, 0);
    l.setTransform(g.getTransform()); l.globalCompositeOperation = "multiply"; l.drawImage(imgs.shade, 0, 0);
    l.resetTransform(); l.globalCompositeOperation = "destination-in"; l.drawImage(A, 0, 0);
    g.save(); g.resetTransform(); g.globalAlpha = 0.97; g.drawImage(o, 0, 0); g.restore();
  }, [imgs, coloured, artImg, place, size, s, cx, cy, cw, ch, bx, by, bw, bh, sx, sy, r, rPx, axis, aspect, zone]);

  // drag / resize in cm
  const drag = useRef<{ mode: "move" | "size"; x0: number; y0: number; p0: Placement }>(undefined);
  const set = (p: Placement) => onPlace(clampPlacement(zone, aspect, p));
  const down = (mode: "move" | "size", e: React.PointerEvent) => {
    if (!place) return;
    e.stopPropagation(); (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, x0: e.clientX, y0: e.clientY, p0: place };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dx = (e.clientX - d.x0) / (sx * s), dy = (e.clientY - d.y0) / (sy * s);
    if (d.mode === "move") set({ ...d.p0, x: d.p0.x + dx, y: d.p0.y + dy });
    else set({ ...d.p0, w: d.p0.w + dx }); // handle sits on the physical right edge
  };
  const key = (e: React.KeyboardEvent) => {
    if (!place) return;
    const step = (e.shiftKey ? 4 : 1) * Math.max(0.1, zone.cm[0] / 60);
    const map: Record<string, Partial<Placement>> = { ArrowLeft: { x: place.x - step }, ArrowRight: { x: place.x + step }, ArrowUp: { y: place.y - step }, ArrowDown: { y: place.y + step }, "+": { w: place.w + step }, "=": { w: place.w + step }, "-": { w: place.w - step } };
    if (map[e.key]) { e.preventDefault(); set({ ...place, ...map[e.key] }); }
  };
  const artL = place ? projX(place.x) : 0, artR = place ? projX(place.x + place.w) : 0;

  return (
    <div ref={wrap} className="relative mx-auto w-full touch-none select-none overflow-hidden rounded-xl bg-muted"
      style={{ aspectRatio: `${cw} / ${ch}`, maxWidth: ch > cw ? `${(560 * cw) / ch}px` : undefined }}
      onPointerMove={move} onPointerUp={() => { drag.current = undefined; }}>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-label="הדמיה על תמונת מוצר אמיתית" role="img" />
      {size > 0 && (
        <div className={`pointer-events-none absolute border border-dashed border-sky-600/70 ${zone.clip ? "rounded-full" : ""}`} style={{ left: (zoneL - cx) * s, top: (by - cy) * s, width: (zoneR - zoneL) * s, height: bh * s }}>
          {!art && <span className="absolute inset-0 flex items-center justify-center text-center text-[11px] leading-tight text-sky-700">אזור הדפסה<br />{+zone.cm[0].toFixed(1)}×{+zone.cm[1].toFixed(1)} ס״מ</span>}
        </div>
      )}
      {size > 0 && art && place && (
        <div role="slider" tabIndex={0} aria-label="מיקום הגרפיקה — חצים להזזה, + ו- לשינוי גודל" aria-valuetext={`רוחב ${place.w.toFixed(1)} ס״מ`} aria-valuenow={Math.round(place.w * 10) / 10} aria-valuemin={1} aria-valuemax={Math.round(maxWidth(zone, aspect) * 10) / 10}
          onPointerDown={(e) => down("move", e)} onKeyDown={key}
          className="absolute cursor-move outline-none ring-1 ring-sky-500/80 focus-visible:ring-2"
          style={{ left: (artL - cx) * s, top: (by + place.y * sy - cy) * s, width: Math.max(8, (artR - artL) * s), height: place.w * aspect * sy * s }}>
          <span onPointerDown={(e) => down("size", e)} className="absolute -right-3 -bottom-3 flex h-6 w-6 cursor-nwse-resize items-center justify-center" aria-hidden>
            <span className="h-3 w-3 rounded-sm border-2 border-sky-600 bg-white" />
          </span>
        </div>
      )}
    </div>
  );
}
