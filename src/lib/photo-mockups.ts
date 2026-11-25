import type { Side } from "./catalog";
import type { Dict } from "@/i18n/dict/he";

export type MockText = Dict["mock"];

// Photo mockups: real blank-product photos + calibrated print zones. The customer places artwork in centimetres
// inside a zone; the zone's pixel box on the photo maps those cm onto the image. Assets: scripts/prep-cutout.mjs
// (transparent cutouts → exact mask for colour changes) and scripts/prep-mockup.mjs (photos). Pixel coords = prepared photo.
export type View = {
  src: string; mask?: string; shade: string;
  size: [number, number];
  crop: [number, number, number, number]; // visible window [x, y, w, h] around the product
};
export type Zone = {
  label: string;
  view: View;
  box: [number, number, number, number]; // zone on the photo [x, y, w, h] px (curved: the visible span of the cylinder)
  cm: [number, number];                    // printable width × height (curved: width along the surface)
  ref:                                      // how the shop measures the position
    | { kind: "garment"; fromCollarCm: number; centreCm: number } // zone top below the collar seam; zone centre sideways (+ = wearer's left)
    | { kind: "sheet" };                                           // measured from the print area's top/left edge
  curve?: number;                           // cylinder radius in cm (mug, bottle): artwork wraps around it
  clip?: "circle";                          // round product face (sticker, charger)
};
export type PhotoMockup = { zone: (side: Side, sel: Record<string, string>, t: MockText) => Zone | undefined };

const view = (name: string, size: [number, number], crop: View["crop"], mask = false): View =>
  ({ src: `/mockups/${name}.webp`, shade: `/mockups/${name}-shade.webp`, mask: mask ? `/mockups/${name}-mask.png` : undefined, size, crop });
const cut = (name: string, size: [number, number], crop: View["crop"]) => view(name, size, crop, true); // cutouts carry an exact mask
const sq = (w: number, h: number): View["crop"] => (w > h ? [(w - h) / 2, 0, h, h] : [0, (h - w) / 2, w, w]);

/** Garment zone from its top-left corner, px/cm and size; `fromCollarCm` = zone top below the collar seam. */
const garment = (v: View, label: string, x: number, y: number, ppc: number, cm: [number, number], fromCollarCm: number, centreCm = 0): Zone =>
  ({ label, view: v, box: [x, y, cm[0] * ppc, cm[1] * ppc], cm, ref: { kind: "garment", fromCollarCm, centreCm } });
/** Centred garment zone: cx is the garment centre line. */
const centred = (v: View, label: string, cx: number, y: number, ppc: number, cm: [number, number], fromCollarCm: number) =>
  garment(v, label, cx - (cm[0] * ppc) / 2, y, ppc, cm, fromCollarCm);
/** Left-chest zone (wearer's left = viewer's right), its centre `off` cm from the garment centre. */
const chest = (v: View, label: string, cx: number, y: number, ppc: number, cm: [number, number], fromCollarCm: number, off = 10) =>
  garment(v, label, cx + off * ppc - (cm[0] * ppc) / 2, y, ppc, cm, fromCollarCm, off);

type At = { cx: number; y: number; ppc: number; fromCollar: number };
type GarmentSpec = { front: View; back: View; f: At; b: At & { smallY: number; smallFrom: number } };
/** Front/back zones of a garment, sized by what the chosen option allows (side.cm). */
const garmentZones = (g: GarmentSpec): PhotoMockup => ({
  zone: (side, _, t) => {
    const cm = side.cm ?? [10, 10], small = cm[0] <= 12;
    if (side.id === "front") return small ? chest(g.front, t.frontChest, g.f.cx, g.f.y, g.f.ppc, cm, g.f.fromCollar) : centred(g.front, t.front, g.f.cx, g.f.y, g.f.ppc, cm, g.f.fromCollar);
    if (side.id === "back") return small ? centred(g.back, t.backSmall, g.b.cx, g.b.smallY, g.b.ppc, cm, g.b.smallFrom) : centred(g.back, t.back, g.b.cx, g.b.y, g.b.ppc, cm, g.b.fromCollar);
  },
});
const G = [1600, 1067] as [number, number], GC: View["crop"] = [240, 0, 1120, 1067];

// Calibrated on the generated cutouts (body width at chest: adult tee 52cm, kids 38cm, hoodie/jacket 56cm).
const TEE = garmentZones({ front: cut("tshirt-front", G, GC), back: cut("tshirt-back", G, GC),
  f: { cx: 790, y: 316, ppc: 12.3, fromCollar: 7 }, b: { cx: 796, y: 203, ppc: 12.8, fromCollar: 5, smallY: 171, smallFrom: 2.5 } });
const KIDS = garmentZones({ front: cut("kids-tshirt-front", G, GC), back: cut("kids-tshirt-back", G, GC),
  f: { cx: 802, y: 320, ppc: 17, fromCollar: 5 }, b: { cx: 801, y: 179, ppc: 18, fromCollar: 4, smallY: 143, smallFrom: 2 } });
const HOODIE = garmentZones({ front: cut("hoodie-front", G, [200, 0, 1200, 1067]), back: cut("hoodie-back", G, [200, 0, 1200, 1067]),
  f: { cx: 800, y: 400, ppc: 10.3, fromCollar: 8.5 }, b: { cx: 800, y: 405, ppc: 10.7, fromCollar: 5, smallY: 384, smallFrom: 3 } });
const JACKET_F = cut("jacket-front", G, [160, 0, 1280, 1067]), JACKET_B = cut("jacket-back", G, [140, 0, 1320, 1067]);
const JACKET: PhotoMockup = {
  zone: (side, _, t) => side.id === "back"
    ? centred(JACKET_B, t.back, 800, 276, 11, side.cm ?? [28, 35], 8)
    : chest(JACKET_F, t.chest, 800, 342, 10.7, side.cm ?? [10, 10], 7),
};

// Sheets: the whole face is printable. Its real size is the size the customer picked; when that size's proportions
// differ from the photographed face (wallet/square card) the print area is the largest centred box of those proportions.
// ponytail: one photo per product, so portrait/landscape choices are shown on the photographed orientation
type LabelKey = keyof MockText;
/** "Card" alone for single-sided products, "Card · Back side" when the product has several printed sides. */
const sideLabel = (label: string, side: Side) => (side.single ? label : `${label} · ${side.label}`);
const sheet = (v: View, key: LabelKey, face: Zone["box"], fallback: [number, number], clip?: "circle"): PhotoMockup => ({
  zone: (side, _, t) => {
    const label = t[key];
    let cm = side.cm ?? fallback;
    if ((face[2] >= face[3]) !== (cm[0] >= cm[1])) cm = [cm[1], cm[0]];
    const k = Math.min(face[2] / cm[0], face[3] / cm[1]), w = cm[0] * k, h = cm[1] * k;
    return { label: sideLabel(label, side), view: v, box: [face[0] + (face[2] - w) / 2, face[1] + (face[3] - h) / 2, w, h], cm, ref: { kind: "sheet" }, clip };
  },
});
/** A fixed print area on an object (cap, pen, sleeve…), sized by the option's cm, centred on (cx, cy). */
const item = (v: View, key: LabelKey, cx: number, cy: number, ppc: number, extra: Partial<Zone> = {}): PhotoMockup => ({
  zone: (side, _, t) => {
    const cm = side.cm ?? [5, 5], w = cm[0] * ppc, h = cm[1] * ppc;
    return { label: sideLabel(t[key], side), view: v, box: [cx - w / 2, cy - h / 2, w, h], cm, ref: { kind: "sheet" }, ...extra };
  },
});
/** Cylinder (mug, bottle): box = visible front half of the cylinder at the print height; artwork wraps around radius r cm. */
const cylinder = (v: View, key: LabelKey, cx: number, rPx: number, rCm: number, cy: number, ppcY: number): PhotoMockup => ({
  zone: (side, _, t) => {
    const cm = side.cm ?? [8, 8], h = cm[1] * ppcY;
    return { label: t[key], view: v, box: [cx - rPx, cy - h / 2, rPx * 2, h], cm, ref: { kind: "sheet" }, curve: rCm };
  },
});

const page = (name: string, h: number) => view(name, [1600, h], [0, 0, 1600, h]);

export const PHOTO_MOCKUPS: Record<string, PhotoMockup> = {
  tshirt: TEE, "kids-tshirt": KIDS, hoodie: HOODIE, jacket: JACKET,
  // generated photos rescaled so the faces have the real proportions (card 9×5, roll-up 85×200, letterhead A4, brochure A4 open)
  "business-card": sheet(view("business-card", [1600, 1012], [294, 0, 1012, 1012]), "card", [353, 246, 879, 488], [9, 5]),
  "roll-up": sheet(view("roll-up", [1600, 2185], [150, 0, 1300, 2185]), "rollup", [446, 211, 715, 1682], [85, 200]),
  flyer: sheet(page("flyer", 2400), "flyer", [254, 401, 1089, 1571], [14.8, 21]),
  letterhead: sheet(page("letterhead", 2290), "letterhead", [258, 368, 1088, 1539], [21, 29.7]),
  notebook: sheet(page("notebook", 2400), "notebook", [318, 459, 969, 1395], [14.8, 21]),
  brochure: sheet(view("brochure", [1600, 1319], sq(1600, 1319)), "brochure", [178, 215, 1238, 875], [29.7, 21]),
  poster: sheet(page("poster", 2400), "poster", [265, 423, 1076, 1517], [50, 70]),
  canvas: sheet(page("canvas", 2400), "canvas", [272, 350, 1136, 1577], [40, 60]),
  sticker: sheet(view("sticker", [1600, 1600], [0, 0, 1600, 1600]), "sticker", [327, 302, 932, 932], [10, 10], "circle"),
  cap: item(cut("cap", G, [300, 30, 1000, 1000]), "cap", 800, 400, 39),
  pen: item(cut("pen", G, [100, 0, 1400, 1067]), "pen", 698, 501, 89),
  sleeve: item(cut("sleeve", G, [180, 0, 1240, 1067]), "sleeve", 787, 525, 33.3),
  charger: item(cut("charger", [1600, 1600], [200, 160, 1200, 1200]), "charger", 800, 803, 92, { clip: "circle" }),
  tote: item(cut("tote", [1600, 2400], [150, 100, 1300, 2100]), "tote", 800, 1470, 27.7),
  mug: cylinder(cut("mug", G, [300, 0, 1067, 1067]), "mug", 694, 276, 4.1, 540, 62),
  bottle: cylinder(cut("bottle", [1600, 2400], [300, 200, 1000, 2000]), "bottle", 802, 255, 3.5, 1259, 72.9),
};

export type Placement = { w: number; x: number; y: number }; // cm: artwork width and top-left offset inside the zone

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Biggest width that fits the zone for an artwork of aspect h/w. */
export const maxWidth = (z: Zone, aspect: number) => Math.min(z.cm[0], z.cm[1] / aspect);

/** Clamp a placement so the artwork stays inside the zone. */
export function clampPlacement(z: Zone, aspect: number, p: Placement): Placement {
  const w = Math.min(Math.max(Math.min(1, z.cm[0]), p.w), maxWidth(z, aspect)), h = w * aspect;
  return { w, x: Math.min(Math.max(0, p.x), z.cm[0] - w), y: Math.min(Math.max(0, p.y), z.cm[1] - h) };
}

/** Large garment zones: centred, 70% wide, 3cm below the top. Everything else: as big as fits, centred. */
export function defaultPlacement(z: Zone, aspect: number): Placement {
  const big = z.ref.kind === "garment" && z.cm[0] > 15;
  const w = Math.min(big ? z.cm[0] * 0.7 : z.cm[0] * (z.ref.kind === "sheet" ? 1 : 0.9), maxWidth(z, aspect));
  return clampPlacement(z, aspect, { w, x: (z.cm[0] - w) / 2, y: big ? 3 : (z.cm[1] - w * aspect) / 2 });
}

/** Human + shop readable placement, e.g. "Front: 19.6×13.2 cm · 10 cm below the collar · centred". */
export function describePlacement(z: Zone, aspect: number, p: Placement, t: MockText): string {
  const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
  const w = r1(p.w), h = r1(p.w * aspect);
  if (z.ref.kind === "sheet") {
    if (w >= r1(z.cm[0]) - 0.1 && h >= r1(z.cm[1]) - 0.1) return fill(t.full, { label: z.label, w: r1(z.cm[0]), h: r1(z.cm[1]) });
    const centredX = Math.abs(p.x + p.w / 2 - z.cm[0] / 2) < 0.2;
    return fill(t.inArea, { label: z.label, w, h, zw: r1(z.cm[0]), zh: r1(z.cm[1]), top: r1(p.y), where: centredX ? t.centered : fill(t.fromLeft, { x: r1(p.x) }) });
  }
  const side = r1(z.ref.centreCm + (p.x + p.w / 2 - z.cm[0] / 2)); // artwork centre vs garment centre (+ = wearer's left)
  const where = Math.abs(side) < 0.3 ? t.centered : fill(side > 0 ? t.toLeftChest : t.toRightChest, { d: Math.abs(side) });
  return fill(t.garment, { label: z.label, w, h, collar: r1(z.ref.fromCollarCm + p.y), where });
}
