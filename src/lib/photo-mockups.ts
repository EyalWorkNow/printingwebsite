// Photo mockups: real blank-product photos + calibrated print zones. The customer places artwork in centimetres
// inside a zone; the zone's pixel box on the photo maps those cm onto the image. Assets: scripts/prep-mockup.mjs.
// Pixel coordinates are in the prepared photo (1600px wide).
export type View = {
  src: string; mask?: string; shade: string;
  size: [number, number];
  crop: [number, number, number, number]; // visible square window [x, y, w, h] around the product
};
export type Zone = {
  label: string;
  view: View;
  box: [number, number, number, number]; // zone on the photo [x, y, w, h] px
  cm: [number, number];                    // real printable width × height
  ref:                                      // how the shop measures the position
    | { kind: "garment"; fromCollarCm: number; centreCm: number } // zone top below the collar seam; zone centre sideways (+ = wearer's left)
    | { kind: "sheet" };                                           // full product face: measured from its top/left edge
  back?: Zone;                              // same artwork + placement also printed here (front + back)
};
export type PhotoMockup = { zoneFor: (sel: Record<string, string>, cm?: [number, number]) => Zone };

const view = (name: string, size: [number, number], crop: View["crop"], mask = false): View =>
  ({ src: `/mockups/${name}.webp`, shade: `/mockups/${name}-shade.webp`, mask: mask ? `/mockups/${name}-mask.png` : undefined, size, crop });

// T-shirt: white flat lays (front: Pexels 12025472; back: generated). Adult M — front 10.33px/cm, back 12.6px/cm.
const TEE_FRONT = view("tshirt", [1600, 1067], [245, 0, 1067, 1067], true);
const TEE_BACK = view("tshirt-back", [1600, 1067], [272, 0, 1067, 1067], true);
const garment = (v: View, label: string, x: number, y: number, pxPerCm: number, cm: [number, number], fromCollarCm: number, centreCm = 0): Zone =>
  ({ label, view: v, box: [x, y, cm[0] * pxPerCm, cm[1] * pxPerCm], cm, ref: { kind: "garment", fromCollarCm, centreCm } });
const TEE_ZONES = {
  front: garment(TEE_FRONT, "קדמי", 622, 260, 10.33, [28, 35], 8.5),
  pocket: garment(TEE_FRONT, "כיס קדמי", 819, 267, 10.33, [10, 10], 9, 10),
  back: garment(TEE_BACK, "גב", 635, 191, 12.6, [28, 35], 7),
};

// Sheets: the whole face is printable; its real size is whatever size the customer picked (cm from the catalog option).
// ponytail: one photo per product, so a portrait/square choice is shown on the landscape face (cm turned to match the photo)
const sheet = (v: View, label: string, box: Zone["box"], fallback: [number, number]) => (cm = fallback): Zone => {
  const landscapeBox = box[2] >= box[3], landscapeCm = cm[0] >= cm[1];
  return { label, view: v, box, cm: landscapeBox === landscapeCm ? cm : [cm[1], cm[0]], ref: { kind: "sheet" } };
};
// generated photos were rescaled vertically so the faces match the real proportions (9×5, 85×200)
const CARD = sheet(view("business-card", [1600, 1012], [294, 0, 1012, 1012]), "כרטיס", [353, 246, 879, 488], [9, 5]);
const ROLLUP = sheet(view("roll-up", [1600, 2185], [150, 0, 1300, 2185]), "רול-אפ", [446, 211, 715, 1682], [85, 200]);

export const PHOTO_MOCKUPS: Record<string, PhotoMockup> = {
  tshirt: { zoneFor: (sel) => sel.print === "pocket" ? TEE_ZONES.pocket : sel.print === "front-back" ? { ...TEE_ZONES.front, label: "קדמי + גב", back: TEE_ZONES.back } : TEE_ZONES.front },
  "business-card": { zoneFor: (_, cm) => CARD(cm) },
  "roll-up": { zoneFor: (_, cm) => ROLLUP(cm) },
};

export type Placement = { w: number; x: number; y: number }; // cm: artwork width and top-left offset inside the zone

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Biggest width that fits the zone for an artwork of aspect h/w. */
export const maxWidth = (z: Zone, aspect: number) => Math.min(z.cm[0], z.cm[1] / aspect);

/** Clamp a placement so the artwork stays inside the zone. */
export function clampPlacement(z: Zone, aspect: number, p: Placement): Placement {
  const w = Math.min(Math.max(Math.min(2, z.cm[0]), p.w), maxWidth(z, aspect)), h = w * aspect;
  return { w, x: Math.min(Math.max(0, p.x), z.cm[0] - w), y: Math.min(Math.max(0, p.y), z.cm[1] - h) };
}

/** Garments: centred, 70% wide, 3cm below the zone top (pocket: fills it). Sheets: as big as fits, centred. */
export function defaultPlacement(z: Zone, aspect: number): Placement {
  const big = z.ref.kind === "garment" && z.cm[0] > 15;
  const w = Math.min(big ? z.cm[0] * 0.7 : z.cm[0] * (z.ref.kind === "sheet" ? 1 : 0.9), maxWidth(z, aspect));
  return clampPlacement(z, aspect, { w, x: (z.cm[0] - w) / 2, y: big ? 3 : (z.cm[1] - w * aspect) / 2 });
}

/** Human + shop readable placement, e.g. "קדמי: 19.6×13.2 ס״מ · 11.5 ס״מ מתחת לצווארון · ממורכז". */
export function describePlacement(z: Zone, aspect: number, p: Placement): string {
  const w = r1(p.w), h = r1(p.w * aspect);
  if (z.ref.kind === "sheet") {
    if (w >= r1(z.cm[0]) - 0.1 && h >= r1(z.cm[1]) - 0.1) return `${z.label}: כיסוי מלא ${r1(z.cm[0])}×${r1(z.cm[1])} ס״מ`;
    return `${z.label} ${r1(z.cm[0])}×${r1(z.cm[1])}: גרפיקה ${w}×${h} ס״מ · ${r1(p.y)} ס״מ מהקצה העליון · ${r1(p.x)} ס״מ מהקצה השמאלי`;
  }
  const side = r1(z.ref.centreCm + (p.x + p.w / 2 - z.cm[0] / 2)); // artwork centre vs garment centre (+ = wearer's left)
  const where = Math.abs(side) < 0.3 ? "ממורכז" : `${Math.abs(side)} ס״מ ${side > 0 ? "שמאלה (חזה שמאל)" : "ימינה (חזה ימין)"} ממרכז החולצה`;
  return `${z.label}: ${w}×${h} ס״מ · ${r1(z.ref.fromCollarCm + p.y)} ס״מ מתחת לצווארון · ${where}`;
}
