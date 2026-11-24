// Photo mockups: a real blank-product photo + a calibrated print zone. The customer places artwork in centimetres
// inside the zone; the zone is drawn onto the photo. Assets come from scripts/prep-mockup.mjs (photo, mask, shade).
// Coordinates are in pixels of the prepared 1600px photo.
export type Zone = {
  label: string;
  x: number; y: number;          // top-left of the zone in photo px
  cm: [number, number];          // printable width × height
  fromCollarCm: number;          // zone top, measured down from the collar seam (how the shop positions the print)
  centreCm: number;              // zone centre, sideways from the garment centre (0 = centred; + = wearer's left chest)
};
export type PhotoMockup = {
  src: string; mask?: string; shade: string;
  size: [number, number];
  crop: [number, number, number, number]; // visible window [x, y, w, h] (square, around the product)
  pxPerCm: number;
  zones: Record<string, Zone>;
  zoneFor: (sel: Record<string, string>) => string;
};

// White flat-lay tee (Pexels 12025472, Pexels License). Calibrated to an adult M: 52cm chest ≈ 537px → 10.33px/cm.
const TEE: PhotoMockup = {
  src: "/mockups/tshirt.webp", mask: "/mockups/tshirt-mask.png", shade: "/mockups/tshirt-shade.webp",
  size: [1600, 1067], crop: [245, 0, 1067, 1067], pxPerCm: 10.33,
  zones: {
    front: { label: "קדמי", x: 622, y: 260, cm: [28, 35], fromCollarCm: 8.5, centreCm: 0 },
    pocket: { label: "כיס קדמי", x: 819, y: 267, cm: [10, 10], fromCollarCm: 9, centreCm: 10 },
  },
  zoneFor: (sel) => (sel.print === "pocket" ? "pocket" : "front"),
};

export const PHOTO_MOCKUPS: Record<string, PhotoMockup> = { tshirt: TEE };

export type Placement = { w: number; x: number; y: number }; // cm: artwork width and top-left offset inside the zone

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Biggest width that fits the zone for an artwork of aspect h/w. */
export const maxWidth = (z: Zone, aspect: number) => Math.min(z.cm[0], z.cm[1] / aspect);

/** Clamp a placement so the artwork stays inside the zone. */
export function clampPlacement(z: Zone, aspect: number, p: Placement): Placement {
  const w = Math.min(Math.max(2, p.w), maxWidth(z, aspect)), h = w * aspect;
  return { w, x: Math.min(Math.max(0, p.x), z.cm[0] - w), y: Math.min(Math.max(0, p.y), z.cm[1] - h) };
}

/** Default: centred, 70% of the zone width (or as big as fits), 3cm from the zone top on the full front. */
export function defaultPlacement(z: Zone, aspect: number): Placement {
  const w = Math.min(z.cm[0] * (z.cm[0] > 15 ? 0.7 : 0.9), maxWidth(z, aspect));
  return clampPlacement(z, aspect, { w, x: (z.cm[0] - w) / 2, y: z.cm[0] > 15 ? 3 : (z.cm[1] - w * aspect) / 2 });
}

/** Human + shop readable placement, e.g. "קדמי: 19.6×13.2 ס״מ · 11.5 ס״מ מתחת לצווארון · ממורכז". */
export function describePlacement(z: Zone, aspect: number, p: Placement): string {
  const h = p.w * aspect;
  const side = r1(z.centreCm + (p.x + p.w / 2 - z.cm[0] / 2)); // artwork centre vs garment centre (+ = wearer's left)
  const where = Math.abs(side) < 0.3 ? "ממורכז" : `${Math.abs(side)} ס״מ ${side > 0 ? "שמאלה (חזה שמאל)" : "ימינה (חזה ימין)"} ממרכז החולצה`;
  return `${z.label}: ${r1(p.w)}×${r1(h)} ס״מ · ${r1(z.fromCollarCm + p.y)} ס״מ מתחת לצווארון · ${where}`;
}
