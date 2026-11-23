// Single source of truth for products + pricing — used by the site AND the AI chat.
export type Mockup = "card" | "flyer" | "poster" | "sticker" | "mug" | "shirt";

export type Product = {
  id: string;
  name: string;
  desc: string;
  mockup: Mockup;
  sizes: string[];
  // tiers: price per unit (₪, before VAT) from `min` quantity up
  tiers: { min: number; unit: number }[];
  minQty: number;
  setup: number; // one-time prepress fee
};

export const VAT = 0.18;
export const SHIPPING = 39; // ponytail: flat home delivery, add zones when the business needs them
export const FREE_SHIPPING_FROM = 500;

export const PRODUCTS: Product[] = [
  { id: "business-cards", name: "כרטיסי ביקור", desc: "כרומו 350 גרם, הדפסה דו-צדדית", mockup: "card", sizes: ["9×5 ס״מ"], minQty: 100, setup: 30,
    tiers: [{ min: 100, unit: 0.9 }, { min: 500, unit: 0.45 }, { min: 1000, unit: 0.3 }] },
  { id: "flyers", name: "פליירים", desc: "כרומו 170 גרם, צבע מלא", mockup: "flyer", sizes: ["A5", "A4"], minQty: 100, setup: 40,
    tiers: [{ min: 100, unit: 1.6 }, { min: 500, unit: 0.8 }, { min: 2000, unit: 0.45 }] },
  { id: "posters", name: "פוסטרים", desc: "נייר פוטו 200 גרם, דיו עמיד", mockup: "poster", sizes: ["A3", "A2", "50×70"], minQty: 1, setup: 0,
    tiers: [{ min: 1, unit: 45 }, { min: 10, unit: 32 }, { min: 50, unit: 22 }] },
  { id: "stickers", name: "מדבקות", desc: "ויניל עמיד במים, חיתוך לפי צורה", mockup: "sticker", sizes: ["5×5 ס״מ", "10×10 ס״מ"], minQty: 50, setup: 25,
    tiers: [{ min: 50, unit: 2.2 }, { min: 250, unit: 1.2 }, { min: 1000, unit: 0.6 }] },
  { id: "mugs", name: "ספלים ממותגים", desc: "קרמיקה לבנה 330 מ״ל, הדפסת סובלימציה", mockup: "mug", sizes: ["330 מ״ל"], minQty: 1, setup: 0,
    tiers: [{ min: 1, unit: 49 }, { min: 12, unit: 35 }, { min: 50, unit: 24 }] },
  { id: "tshirts", name: "חולצות מודפסות", desc: "כותנה 100%, הדפסת DTF", mockup: "shirt", sizes: ["S", "M", "L", "XL", "XXL"], minQty: 1, setup: 0,
    tiers: [{ min: 1, unit: 69 }, { min: 10, unit: 49 }, { min: 50, unit: 35 }] },
];

const SIZE_FACTOR: Record<string, number> = { A4: 1.6, A2: 1.8, "50×70": 2.4, "10×10 ס״מ": 2.5 };

export const findProduct = (id: string) => PRODUCTS.find((p) => p.id === id || p.name === id);

export type Quote = {
  productId: string; productName: string; size: string; quantity: number;
  unitPrice: number; setup: number; subtotal: number; shipping: number; vat: number; total: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function quote(productId: string, quantity: number, size?: string): Quote {
  const p = findProduct(productId);
  if (!p) throw new Error(`מוצר לא קיים: ${productId}`);
  if (!Number.isInteger(quantity) || quantity < p.minQty) throw new Error(`כמות מינימלית ל${p.name}: ${p.minQty}`);
  if (quantity > 100000) throw new Error("לכמויות מעל 100,000 נא לפנות אלינו");
  const s = size && p.sizes.includes(size) ? size : p.sizes[0];
  const tier = [...p.tiers].reverse().find((t) => quantity >= t.min)!;
  const unitPrice = r2(tier.unit * (SIZE_FACTOR[s] ?? 1));
  const subtotal = r2(unitPrice * quantity + p.setup);
  const shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING;
  const vat = r2((subtotal + shipping) * VAT);
  return { productId: p.id, productName: p.name, size: s, quantity, unitPrice, setup: p.setup, subtotal, shipping, vat, total: r2(subtotal + shipping + vat) };
}

export const ils = (n: number) => `₪${n.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// Physical print area (cm) per size — used to warn about low-resolution artwork.
const PRINT_CM: Record<string, [number, number]> = {
  "9×5 ס״מ": [9, 5], A5: [14.8, 21], A4: [21, 29.7], A3: [29.7, 42], A2: [42, 59.4], "50×70": [50, 70],
  "5×5 ס״מ": [5, 5], "10×10 ס״מ": [10, 10], "330 מ״ל": [20, 9],
};
const SHIRT_CM: [number, number] = [28, 35];

/** Effective DPI of a w×h px image printed at the product size (orientation-agnostic). */
export function printDpi(size: string, w: number, h: number): number {
  const [a, b] = (PRINT_CM[size] ?? SHIRT_CM).toSorted((x, y) => x - y);
  const [pw, ph] = [w, h].toSorted((x, y) => x - y);
  return Math.round(Math.min(pw / (a / 2.54), ph / (b / 2.54)));
}
export const dpiLevel = (dpi: number) => (dpi >= 250 ? "good" : dpi >= 150 ? "ok" : "low");
