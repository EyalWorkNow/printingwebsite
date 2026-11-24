"use client";

import { useEffect, useRef, useState } from "react";
import { clampPlacement, maxWidth, type Placement, type View, type Zone } from "@/lib/photo-mockups";

// Real-photo mockup. Canvas: photo → product tinted through its mask (multiply keeps the folds) → artwork with the
// photo's shading multiplied over it. A DOM box on top handles drag (move), the corner handle (resize) and keys.
const load = (src: string) => new Promise<HTMLImageElement>((ok, no) => { const i = new window.Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
const isWhite = (c?: string) => !c || parseInt(c.slice(1), 16) > 0xf0f0f0;
type Imgs = { v: View; photo: HTMLImageElement; mask?: HTMLImageElement; shade: HTMLImageElement };

export function PhotoMockup({ zone: front, tint, art, aspect, place, onPlace }: {
  zone: Zone; tint?: string; art?: string; aspect: number; place?: Placement; onPlace: (p: Placement) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const [side, setSide] = useState<"front" | "back">("front");
  const zone = side === "back" && front.back ? front.back : front;
  const v = zone.view;
  const [size, setSize] = useState(0);
  const [loadedViews, setLoadedViews] = useState<Imgs>();
  const imgs = loadedViews?.v === v ? loadedViews : undefined;
  const [loaded, setLoaded] = useState<{ src: string; img: HTMLImageElement }>();
  const artImg = art && loaded?.src === art ? loaded.img : undefined;

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
  const s = size / cw;                                   // display px per photo px
  const sx = bw / zone.cm[0], sy = bh / zone.cm[1];     // photo px per cm (per axis)
  const kx = sx * s, ky = sy * s;                        // display px per cm
  const zx = (bx - cx) * s, zy = (by - cy) * s;

  useEffect(() => {
    const c = canvas.current;
    if (!c || !imgs || !size) return;
    const dpr = window.devicePixelRatio || 1, pw = Math.round(size * dpr), ph = Math.round(size * (ch / cw) * dpr);
    c.width = pw; c.height = ph;
    const g = c.getContext("2d")!;
    g.setTransform(dpr * s, 0, 0, dpr * s, -cx * dpr * s, -cy * dpr * s); // draw in photo coordinates
    g.drawImage(imgs.photo, 0, 0);
    const layer = (draw: (l: CanvasRenderingContext2D) => void) => {
      const o = document.createElement("canvas"); o.width = pw; o.height = ph;
      const l = o.getContext("2d")!; l.setTransform(g.getTransform()); draw(l);
      g.save(); g.resetTransform(); return { o, done: () => g.restore() };
    };
    if (imgs.mask && !isWhite(tint)) { // tint the product, keep its folds
      const { o, done } = layer((l) => { l.drawImage(imgs.mask!, 0, 0); l.globalCompositeOperation = "source-in"; l.fillStyle = tint!; l.fillRect(0, 0, v.size[0], v.size[1]); });
      g.globalCompositeOperation = "multiply"; g.drawImage(o, 0, 0); g.globalCompositeOperation = "source-over"; done();
    }
    if (artImg && place) {
      const ax = bx + place.x * sx, ay = by + place.y * sy, aw = place.w * sx, ah = place.w * aspect * sy;
      const { o, done } = layer((l) => {
        l.drawImage(artImg, ax, ay, aw, ah);
        l.globalCompositeOperation = "multiply"; l.drawImage(imgs.shade, 0, 0); // fabric folds / paper texture over the print
        l.globalCompositeOperation = "destination-in"; l.drawImage(artImg, ax, ay, aw, ah); // keep only the artwork's pixels
      });
      g.globalAlpha = 0.97; g.drawImage(o, 0, 0); done();
    }
  }, [imgs, artImg, place, size, tint, s, cx, cy, cw, ch, bx, by, sx, sy, aspect, v]);

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
    const dx = (e.clientX - d.x0) / kx, dy = (e.clientY - d.y0) / ky;
    if (d.mode === "move") set({ ...d.p0, x: d.p0.x + dx, y: d.p0.y + dy });
    else set({ ...d.p0, w: d.p0.w + dx }); // handle sits on the physical right edge
  };
  const key = (e: React.KeyboardEvent) => {
    if (!place) return;
    const step = (e.shiftKey ? 4 : 1) * Math.max(0.1, zone.cm[0] / 60);
    const map: Record<string, Partial<Placement>> = { ArrowLeft: { x: place.x - step }, ArrowRight: { x: place.x + step }, ArrowUp: { y: place.y - step }, ArrowDown: { y: place.y + step }, "+": { w: place.w + step }, "=": { w: place.w + step }, "-": { w: place.w - step } };
    if (map[e.key]) { e.preventDefault(); set({ ...place, ...map[e.key] }); }
  };

  return (
    <div className="w-full space-y-2">
      {front.back && (
        <div className="flex justify-center gap-1 text-xs" role="tablist" aria-label="צד">
          {(["front", "back"] as const).map((x) => <button key={x} type="button" role="tab" aria-selected={side === x} onClick={() => setSide(x)} className={`rounded-full border px-3 py-1 ${side === x ? "border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{x === "front" ? "קדימה" : "גב"}</button>)}
        </div>
      )}
      <div ref={wrap} className="relative mx-auto w-full touch-none select-none overflow-hidden rounded-xl bg-muted"
        style={{ aspectRatio: `${cw} / ${ch}`, maxWidth: ch > cw ? `${(560 * cw) / ch}px` : undefined }}
        onPointerMove={move} onPointerUp={() => { drag.current = undefined; }}>
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-label="הדמיה על תמונת מוצר אמיתית" role="img" />
        {size > 0 && (
          <div className="pointer-events-none absolute border border-dashed border-sky-600/70" style={{ left: zx, top: zy, width: bw * s, height: bh * s }}>
            {!art && <span className="absolute inset-0 flex items-center justify-center text-center text-[11px] leading-tight text-sky-700">אזור הדפסה<br />{+zone.cm[0].toFixed(1)}×{+zone.cm[1].toFixed(1)} ס״מ</span>}
          </div>
        )}
        {size > 0 && art && place && (
          <div role="slider" tabIndex={0} aria-label="מיקום הגרפיקה — חצים להזזה, + ו- לשינוי גודל" aria-valuetext={`רוחב ${place.w.toFixed(1)} ס״מ`} aria-valuenow={Math.round(place.w * 10) / 10} aria-valuemin={2} aria-valuemax={Math.round(maxWidth(zone, aspect) * 10) / 10}
            onPointerDown={(e) => down("move", e)} onKeyDown={key}
            className="absolute cursor-move outline-none ring-1 ring-sky-500/80 focus-visible:ring-2"
            style={{ left: zx + place.x * kx, top: zy + place.y * ky, width: place.w * kx, height: place.w * aspect * ky }}>
            <span onPointerDown={(e) => down("size", e)} className="absolute -right-3 -bottom-3 flex h-6 w-6 cursor-nwse-resize items-center justify-center" aria-hidden>
              <span className="h-3 w-3 rounded-sm border-2 border-sky-600 bg-white" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
