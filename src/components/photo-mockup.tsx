"use client";

import { useEffect, useRef, useState } from "react";
import { clampPlacement, maxWidth, type Placement, type PhotoMockup as M, type Zone } from "@/lib/photo-mockups";

// Real-photo mockup. Canvas: photo → product tinted through its mask (multiply keeps the folds) → artwork with the
// photo's shading multiplied over it. A DOM box on top handles drag (move), the corner handle (resize) and keys.
const load = (src: string) => new Promise<HTMLImageElement>((ok, no) => { const i = new window.Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
const isWhite = (c?: string) => !c || parseInt(c.slice(1), 16) > 0xf0f0f0;

export function PhotoMockup({ m, zone, tint, art, aspect, place, onPlace }: {
  m: M; zone: Zone; tint?: string; art?: string; aspect: number; place?: Placement; onPlace: (p: Placement) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(0);
  const [imgs, setImgs] = useState<{ photo: HTMLImageElement; mask?: HTMLImageElement; shade: HTMLImageElement }>();
  const [artImg, setArtImg] = useState<HTMLImageElement>();

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize(Math.round(e.contentRect.width)));
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    let live = true;
    Promise.all([load(m.src), m.mask ? load(m.mask) : undefined, load(m.shade)]).then(([photo, mask, shade]) => live && setImgs({ photo, mask, shade })).catch(() => {});
    return () => { live = false; };
  }, [m]);
  useEffect(() => {
    let live = true;
    if (art) load(art).then((i) => live && setArtImg(i)).catch(() => live && setArtImg(undefined)); else setArtImg(undefined);
    return () => { live = false; };
  }, [art]);

  const [cx, cy, cw] = m.crop;
  const s = size / cw;                       // display px per photo px
  const k = m.pxPerCm * s;                   // display px per cm
  const zx = (zone.x - cx) * s, zy = (zone.y - cy) * s;

  useEffect(() => {
    const c = canvas.current;
    if (!c || !imgs || !size) return;
    const dpr = window.devicePixelRatio || 1, px = Math.round(size * dpr);
    c.width = px; c.height = px;
    const g = c.getContext("2d")!;
    g.setTransform(dpr * s, 0, 0, dpr * s, -cx * dpr * s, -cy * dpr * s); // draw in photo coordinates
    g.drawImage(imgs.photo, 0, 0);
    const layer = (draw: (l: CanvasRenderingContext2D) => void) => {
      const o = document.createElement("canvas"); o.width = px; o.height = px;
      const l = o.getContext("2d")!; l.setTransform(g.getTransform()); draw(l);
      g.save(); g.resetTransform(); return { o, done: () => g.restore() };
    };
    if (imgs.mask && !isWhite(tint)) { // tint the product, keep its folds
      const { o, done } = layer((l) => { l.drawImage(imgs.mask!, 0, 0); l.globalCompositeOperation = "source-in"; l.fillStyle = tint!; l.fillRect(0, 0, m.size[0], m.size[1]); });
      g.globalCompositeOperation = "multiply"; g.drawImage(o, 0, 0); g.globalCompositeOperation = "source-over"; done();
    }
    if (artImg && place) {
      const ax = zone.x + place.x * m.pxPerCm, ay = zone.y + place.y * m.pxPerCm, aw = place.w * m.pxPerCm, ah = aw * aspect;
      const { o, done } = layer((l) => {
        l.drawImage(artImg, ax, ay, aw, ah);
        l.globalCompositeOperation = "multiply"; l.drawImage(imgs.shade, 0, 0); // fabric folds over the print
        l.globalCompositeOperation = "destination-in"; l.drawImage(artImg, ax, ay, aw, ah); // keep only the artwork's pixels
      });
      g.globalAlpha = 0.97; g.drawImage(o, 0, 0); done();
    }
  }, [imgs, artImg, place, size, tint, s, cx, cy, zone, aspect, m]);

  // drag / resize in cm
  const drag = useRef<{ mode: "move" | "size"; x0: number; y0: number; p0: Placement }>(undefined);
  const set = (p: Placement) => onPlace(clampPlacement(zone, aspect, p));
  const down = (mode: "move" | "size") => (e: React.PointerEvent) => {
    if (!place) return;
    e.stopPropagation(); (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, x0: e.clientX, y0: e.clientY, p0: place };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dx = (e.clientX - d.x0) / k, dy = (e.clientY - d.y0) / k;
    if (d.mode === "move") set({ ...d.p0, x: d.p0.x + dx, y: d.p0.y + dy });
    else set({ ...d.p0, w: d.p0.w + dx }); // handle sits on the physical right edge
  };
  const key = (e: React.KeyboardEvent) => {
    if (!place) return;
    const step = e.shiftKey ? 2 : 0.5;
    const map: Record<string, Partial<Placement>> = { ArrowLeft: { x: place.x - step }, ArrowRight: { x: place.x + step }, ArrowUp: { y: place.y - step }, ArrowDown: { y: place.y + step }, "+": { w: place.w + step }, "=": { w: place.w + step }, "-": { w: place.w - step } };
    if (map[e.key]) { e.preventDefault(); set({ ...place, ...map[e.key] }); }
  };

  return (
    <div ref={wrap} className="relative aspect-square w-full touch-none select-none overflow-hidden rounded-xl bg-muted" onPointerMove={move} onPointerUp={() => { drag.current = undefined; }}>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-label="הדמיה על תמונת מוצר אמיתית" role="img" />
      {size > 0 && (
        <div className="pointer-events-none absolute border border-dashed border-sky-600/70" style={{ left: zx, top: zy, width: zone.cm[0] * k, height: zone.cm[1] * k }}>
          {!art && <span className="absolute inset-0 flex items-center justify-center text-center text-[11px] leading-tight text-sky-700">אזור הדפסה<br />{zone.cm[0]}×{zone.cm[1]} ס״מ</span>}
        </div>
      )}
      {size > 0 && art && place && (
        <div role="slider" tabIndex={0} aria-label="מיקום הגרפיקה — חצים להזזה, + ו- לשינוי גודל" aria-valuetext={`רוחב ${place.w.toFixed(1)} ס״מ`} aria-valuenow={Math.round(place.w * 10) / 10} aria-valuemin={2} aria-valuemax={Math.round(maxWidth(zone, aspect) * 10) / 10}
          onPointerDown={down("move")} onKeyDown={key}
          className="absolute cursor-move outline-none ring-1 ring-sky-500/80 focus-visible:ring-2"
          style={{ left: zx + place.x * k, top: zy + place.y * k, width: place.w * k, height: place.w * aspect * k }}>
          <span onPointerDown={down("size")} className="absolute -right-3 -bottom-3 flex h-6 w-6 cursor-nwse-resize items-center justify-center" aria-hidden>
            <span className="h-3 w-3 rounded-sm border-2 border-sky-600 bg-white" />
          </span>
        </div>
      )}
    </div>
  );
}
