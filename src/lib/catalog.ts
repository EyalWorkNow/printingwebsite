// Single source of truth for products, options and pricing — used by the site, the cart, the server AND the AI chat.
// Model: every product has base tier prices, and every option value may add its own per-unit tier price.
//   unit  = round2((base(q) + Σ value(q)) × (1 + production surcharge))
//   line  = unit × q + setup
//   order = Σ lines + shipping, + VAT
export type Mockup = "card" | "card-v" | "card-sq" | "flyer" | "poster" | "sticker" | "mug" | "shirt" | "bag" | "bottle" | "pen" | "cap";
export type Tier = [from: number, unit: number]; // ₪ per unit before VAT, from `from` units up
export type Value = { id: string; title: string; tiers?: Tier[]; color?: string; cm?: [number, number]; mockup?: Mockup; active?: boolean }; // active:false = hidden from customers
// first value is the default. kind "split" = quantity is split across values (e.g. shirt sizes S×5, M×3)
export type Option = { id: string; title: string; kind?: "color" | "split"; values: Value[] };
export type Rule = { if: [option: string, values: string[]]; hide: [option: string, values: string[]] };
export type Product = {
  id: string; name: string; desc: string; category: string; mockup: Mockup; active?: boolean; image?: string; // image: product photo in /public
  base: Tier[]; setup?: number; options: Option[]; rules?: Rule[];
  qty: { min: number; max: number; step: number; presets: number[] };
  production: ProductionId[]; printCm?: [number, number]; details: string[];
};

export const VAT = 0.18;

export const PRODUCTION_IDS = ["express", "fast", "standard", "saver"] as const;
export type ProductionId = (typeof PRODUCTION_IDS)[number];
export type Production = { label: string; days: number; pct: number };
const PRODUCTION: Record<ProductionId, Production> = {
  express: { label: "אקספרס", days: 1, pct: 0.5 },
  fast: { label: "מהיר", days: 3, pct: 0.2 },
  standard: { label: "רגיל", days: 5, pct: 0 },
  saver: { label: "חסכוני", days: 8, pct: -0.1 },
};

export const SHIPPING_IDS = ["pickup", "home", "express"] as const;
export type ShippingId = (typeof SHIPPING_IDS)[number];
export type Shipping = { label: string; desc: string; price: number; days: number; freeFrom: number; active?: boolean };
const SHIPPING: Record<ShippingId, Shipping> = {
  pickup: { label: "איסוף עצמי", desc: "מהסטודיו, בתיאום טלפוני", price: 0, days: 0, freeFrom: 0 },
  home: { label: "שליח עד הבית", desc: "לכל הארץ · חינם מעל ₪500 לפני מע״מ", price: 39, days: 2, freeFrom: 500 },
  express: { label: "שליח אקספרס", desc: "יום עסקים אחד אחרי הייצור", price: 79, days: 1, freeFrom: 0 },
};

export type Category = { id: string; name: string; desc: string; image?: string };
const CATEGORIES: Category[] = [
  { id: "print", name: "מוצרי דפוס", desc: "כרטיסי ביקור, פליירים, ברושורים, נייר לוגו ומחברות", image: "/img/brochure.webp" },
  { id: "signs", name: "מדבקות ושילוט", desc: "מדבקות בחיתוך, פוסטרים, רול-אפ והדפסה על קנבס", image: "/img/poster.webp" },
  { id: "apparel", name: "ביגוד ממותג", desc: "חולצות, קפוצ׳ונים, כובעים וחולצות ילדים עם הלוגו שלכם", image: "/img/set-apparel.webp" },
  { id: "promo", name: "מוצרי פרסום", desc: "ספלים, עטים, בקבוקים ותיקים ממותגים ללקוחות ולצוות", image: "/img/set-office.webp" },
];

const SIDES: Option = { id: "sides", title: "צידי הדפסה", values: [{ id: "1", title: "צד אחד" }, { id: "2", title: "דו צדדי", tiers: [[1, 0.12], [500, 0.06], [2000, 0.03]] }] };
const LAMINATION: Option = { id: "lamination", title: "למינציה", values: [
  { id: "none", title: "ללא" },
  { id: "matte", title: "למינציה מט", tiers: [[1, 0.05], [1000, 0.03]] },
  { id: "gloss", title: "למינציה מבריקה", tiers: [[1, 0.05], [1000, 0.03]] },
  { id: "soft", title: "סופט טאץ׳ (משי)", tiers: [[1, 0.1], [1000, 0.06]] },
] };
const SHIRT_COLORS: Value[] = [["white", "לבן", "#fafafa"], ["black", "שחור", "#171717"], ["navy", "כחול כהה", "#1e2a5a"], ["red", "אדום", "#c62828"], ["green", "ירוק", "#2e7d4f"], ["gray", "אפור", "#9e9e9e"]]
  .map(([id, title, color]) => ({ id, title, color }));
// Garment print: front (small included / large) and back (none / small / large), each with its own price and print area.
const garmentPrint = (big: [number, number], small: [number, number] = [10, 10]): Option[] => [
  { id: "front", title: "הדפסה קדמית", values: [
    { id: "small", title: `קטנה — חזה (עד ${small[0]}×${small[1]} ס״מ)`, cm: small },
    { id: "large", title: `גדולה — חזית מלאה (עד ${big[0]}×${big[1]} ס״מ)`, tiers: [[1, 6], [20, 5], [100, 4]], cm: big },
  ] },
  { id: "back", title: "הדפסה בגב", values: [
    { id: "none", title: "ללא" },
    { id: "small", title: `קטנה — מתחת לצווארון (עד ${small[0]}×${small[1]} ס״מ)`, tiers: [[1, 8], [20, 6], [100, 5]], cm: small },
    { id: "large", title: `גדולה — גב מלא (עד ${big[0]}×${big[1]} ס״מ)`, tiers: [[1, 12], [20, 10], [100, 8]], cm: big },
  ] },
];
const sizes = (...s: string[]): Option => ({ id: "size", title: "מידה", kind: "split", values: s.map((x) => ({ id: x, title: x })) });
const PRINT_DAYS: ProductionId[] = ["express", "fast", "standard", "saver"];

const PRODUCTS: Product[] = [
  // ── print
  { id: "business-card", name: "כרטיס ביקור", desc: "כרומו מט 300 גרם, הדפסה צבעונית חדה", category: "print", mockup: "card", image: "/img/business-card.webp",
    base: [[100, 0.95], [300, 0.42], [500, 0.27], [1000, 0.16], [2000, 0.12], [5000, 0.08]],
    options: [
      { id: "size", title: "גודל", values: [{ id: "standard", title: "סטנדרטי 9×5 ס״מ", cm: [9, 5] }, { id: "wallet", title: "לארנק 8.5×5.5 ס״מ", cm: [8.5, 5.5] }, { id: "square", title: "ריבועי 6.5×6.5 ס״מ", cm: [6.5, 6.5], mockup: "card-sq" }] },
      { id: "orientation", title: "פורמט", values: [{ id: "landscape", title: "שוכב" }, { id: "portrait", title: "עומד", mockup: "card-v" }] },
      SIDES, LAMINATION,
      { id: "corners", title: "פינות", values: [{ id: "straight", title: "ישרות" }, { id: "round", title: "מעוגלות", tiers: [[1, 0.1], [1000, 0.06]] }] },
      { id: "paper", title: "נייר", values: [{ id: "matte300", title: "כרומו מט 300 גרם" }, { id: "eco300", title: "נטול עץ 300 גרם", tiers: [[1, 0.04]] }, { id: "premium400", title: "פרימיום 400 גרם", tiers: [[1, 0.15], [1000, 0.08]] }] },
    ],
    rules: [{ if: ["size", ["square"]], hide: ["orientation", ["landscape", "portrait"]] }, { if: ["paper", ["eco300"]], hide: ["lamination", ["matte", "gloss", "soft"]] }],
    qty: { min: 100, max: 10000, step: 50, presets: [100, 300, 500, 1000, 2000, 5000] }, production: PRINT_DAYS,
    details: ["הדפסה דיגיטלית צבעונית מלאה", "אפשרות לגימור למינציה ופינות מעוגלות", "מומלץ להשאיר 3 מ״מ שוליים לחיתוך"] },
  { id: "flyer", name: "פלייר", desc: "כרומו 135–250 גרם, צבע מלא", category: "print", mockup: "flyer", setup: 20,
    base: [[100, 0.7], [250, 0.48], [500, 0.33], [1000, 0.22], [2500, 0.16], [5000, 0.12]],
    options: [
      { id: "size", title: "גודל", values: [{ id: "a5", title: "A5 ‏14.8×21 ס״מ", cm: [14.8, 21] }, { id: "a4", title: "A4 ‏21×29.7 ס״מ", tiers: [[1, 0.25], [1000, 0.12]], cm: [21, 29.7] }, { id: "a6", title: "A6 ‏10.5×14.8 ס״מ", tiers: [[1, -0.15], [1000, -0.07]], cm: [10.5, 14.8] }] },
      { id: "paper", title: "נייר", values: [{ id: "135", title: "כרומו מט 135 גרם" }, { id: "170", title: "כרומו מט 170 גרם", tiers: [[1, 0.04]] }, { id: "250", title: "כרומו מט 250 גרם", tiers: [[1, 0.09], [1000, 0.06]] }] },
      SIDES,
    ],
    qty: { min: 100, max: 20000, step: 50, presets: [100, 250, 500, 1000, 2500, 5000] }, production: PRINT_DAYS,
    details: ["פלייר ללא קיפול", "הדפסה בצבע מלא על כרומו מט", "מתאים לחלוקה, תיבות דואר ודוכנים"] },
  { id: "brochure", name: "ברושור מקופל", desc: "A4 בקיפול לשלושה, כרומו 170 גרם", category: "print", mockup: "flyer", setup: 30, image: "/img/brochure.webp",
    base: [[100, 1.6], [250, 1.05], [500, 0.75], [1000, 0.55], [2500, 0.42]],
    options: [{ id: "fold", title: "קיפול", values: [{ id: "tri", title: "קיפול לשלושה (Z / C)", cm: [21, 29.7] }, { id: "half", title: "קיפול לחצי", cm: [21, 29.7] }] }, { id: "paper", title: "נייר", values: [{ id: "170", title: "כרומו מט 170 גרם" }, { id: "250", title: "כרומו מט 250 גרם", tiers: [[1, 0.12]] }] }],
    qty: { min: 100, max: 10000, step: 50, presets: [100, 250, 500, 1000, 2500] }, production: ["fast", "standard", "saver"],
    details: ["הדפסה דו צדדית כלולה", "קיפול מכונה מדויק", "שישה עמודי תוכן"] },
  { id: "letterhead", name: "נייר לוגו", desc: "A4 ‏100 גרם, מתאים למדפסת משרדית", category: "print", mockup: "flyer",
    base: [[100, 0.85], [250, 0.6], [500, 0.42], [1000, 0.3], [2500, 0.24]],
    options: [{ id: "paper", title: "נייר", values: [{ id: "100", title: "אופסט 100 גרם", cm: [21, 29.7] }, { id: "120", title: "אופסט 120 גרם", tiers: [[1, 0.05]], cm: [21, 29.7] }] }],
    qty: { min: 100, max: 10000, step: 50, presets: [100, 250, 500, 1000, 2500] }, production: ["fast", "standard"],
    details: ["מותאם להדפסה חוזרת במדפסת לייזר", "צבע מלא, צד אחד"] },
  { id: "notebook", name: "מחברת ממותגת", desc: "A5, כריכה מודפסת — ספירלה או כריכה קשה עם גומייה", category: "print", mockup: "flyer", setup: 40, image: "/img/notebook.webp",
    base: [[10, 22], [25, 17], [50, 14], [100, 11.5], [250, 9.5]],
    options: [{ id: "pages", title: "דפים", values: [{ id: "50", title: "50 דפים שורה", cm: [14.8, 21] }, { id: "100", title: "100 דפים שורה", tiers: [[1, 3.5]], cm: [14.8, 21] }] }, { id: "cover", title: "כריכה", values: [{ id: "soft", title: "ספירלה, כריכה רכה" }, { id: "hard", title: "כריכה קשה עם גומייה וסימנייה", tiers: [[1, 6], [100, 4.5]] }] }],
    qty: { min: 10, max: 2000, step: 5, presets: [10, 25, 50, 100, 250] }, production: ["fast", "standard", "saver"],
    details: ["ספירלת מתכת או כריכה קשה עם גומייה וסימנייה", "כריכה בהדפסה מלאה מקדימה ומאחור", "מתנה מושלמת לכנסים ולעובדים"] },
  // ── stickers & signs
  { id: "sticker", name: "מדבקות", desc: "חיתוך לפי צורה, נייר או ויניל עמיד", category: "signs", mockup: "sticker", image: "/img/sticker.webp", setup: 25,
    base: [[50, 1.9], [100, 1.2], [250, 0.7], [500, 0.45], [1000, 0.3], [5000, 0.18]],
    options: [
      { id: "size", title: "גודל", values: [{ id: "5", title: "5×5 ס״מ", cm: [5, 5] }, { id: "7", title: "7×7 ס״מ", tiers: [[1, 0.3], [1000, 0.1]], cm: [7, 7] }, { id: "10", title: "10×10 ס״מ", tiers: [[1, 0.7], [1000, 0.25]], cm: [10, 10] }] },
      { id: "material", title: "חומר", values: [{ id: "paper", title: "נייר מבריק" }, { id: "vinyl", title: "ויניל עמיד במים", tiers: [[1, 0.25], [1000, 0.1]] }, { id: "clear", title: "שקוף", tiers: [[1, 0.35], [1000, 0.14]] }] },
      { id: "shape", title: "צורה", values: [{ id: "circle", title: "עיגול" }, { id: "square", title: "ריבוע" }, { id: "die", title: "חיתוך לפי קו העיצוב", tiers: [[1, 0.15], [1000, 0.05]] }] },
    ],
    qty: { min: 50, max: 20000, step: 50, presets: [50, 100, 250, 500, 1000, 5000] }, production: PRINT_DAYS,
    details: ["מגיעות על גיליונות נוחים לקילוף", "ויניל עמיד במים ובשמש — מתאים לבקבוקים ולחוץ", "חיתוך לפי קו: שלחו קובץ עם קו חיתוך או שנכין עבורכם"] },
  { id: "poster", name: "פוסטר", desc: "נייר פוטו 200 גרם, דיו עמיד", category: "signs", mockup: "poster", image: "/img/poster.webp",
    base: [[1, 28], [5, 22], [10, 17], [25, 13], [50, 10]],
    options: [{ id: "size", title: "גודל", values: [{ id: "a3", title: "A3 ‏29.7×42 ס״מ", cm: [29.7, 42] }, { id: "a2", title: "A2 ‏42×59.4 ס״מ", tiers: [[1, 14], [25, 8]], cm: [42, 59.4] }, { id: "50x70", title: "50×70 ס״מ", tiers: [[1, 24], [25, 14]], cm: [50, 70] }, { id: "70x100", title: "70×100 ס״מ", tiers: [[1, 46], [25, 28]], cm: [70, 100] }] },
      { id: "paper", title: "נייר", values: [{ id: "photo", title: "פוטו סאטן 200 גרם" }, { id: "matte", title: "מט אמנותי 230 גרם", tiers: [[1, 6], [25, 4]] }] }],
    qty: { min: 1, max: 500, step: 1, presets: [1, 5, 10, 25, 50] }, production: ["express", "fast", "standard"],
    details: ["הדפסת הזרקת דיו פיגמנט", "מגיע מגולגל בשרוול קשיח"] },
  { id: "roll-up", name: "רול-אפ", desc: "מתקן אלומיניום + הדפסה + תיק נשיאה", category: "signs", mockup: "poster", image: "/img/rollup.webp",
    base: [[1, 260], [3, 235], [10, 210]],
    options: [{ id: "size", title: "גודל", values: [{ id: "85", title: "85×200 ס״מ", cm: [85, 200] }, { id: "100", title: "100×200 ס״מ", tiers: [[1, 40]], cm: [100, 200] }] }],
    qty: { min: 1, max: 50, step: 1, presets: [1, 3, 10] }, production: ["express", "fast", "standard"],
    details: ["הדפסה על בד/PVC ללא השתקפות", "מתקן אלומיניום ותיק נשיאה כלולים", "מוכן לתערוכה תוך דקה"] },
  { id: "canvas", name: "הדפסה על קנבס", desc: "קנבס כותנה על מסגרת עץ 2 ס״מ", category: "signs", mockup: "poster", image: "/img/canvas.webp",
    base: [[1, 95], [5, 82], [10, 70]],
    options: [{ id: "size", title: "גודל", values: [{ id: "30x40", title: "30×40 ס״מ", cm: [30, 40] }, { id: "40x60", title: "40×60 ס״מ", tiers: [[1, 50]], cm: [40, 60] }, { id: "60x90", title: "60×90 ס״מ", tiers: [[1, 140]], cm: [60, 90] }] }],
    qty: { min: 1, max: 100, step: 1, presets: [1, 5, 10] }, production: ["fast", "standard"],
    details: ["מתיחה ידנית על מסגרת עץ", "מגיע עם תלייה מוכנה"] },
  // ── apparel
  { id: "tshirt", name: "חולצה ממותגת", desc: "כותנה 100%, הדפסת DTF חדה ועמידה", category: "apparel", mockup: "shirt", image: "/img/tshirt.webp",
    base: [[1, 32], [10, 27], [20, 24], [50, 21], [100, 18]],
    options: [{ id: "color", title: "צבע חולצה", kind: "color", values: SHIRT_COLORS }, ...garmentPrint([28, 35]), sizes("S", "M", "L", "XL", "XXL")],
    qty: { min: 1, max: 1000, step: 1, presets: [1, 10, 20, 50, 100] }, production: ["fast", "standard", "saver"], printCm: [28, 35],
    details: ["כותנה סרוקה 160 גרם", "הדפסת DTF — עמידה בכביסה", "אפשר לחלק את הכמות בין מידות"] },
  { id: "hoodie", name: "קפוצ׳ון ממותג", desc: "פליז 280 גרם עם כיס קנגורו", category: "apparel", mockup: "shirt", image: "/img/hoodie.webp",
    base: [[1, 89], [10, 79], [20, 72], [50, 65]],
    options: [{ id: "color", title: "צבע", kind: "color", values: SHIRT_COLORS.filter((c) => ["black", "navy", "gray", "white"].includes(c.id)) }, ...garmentPrint([25, 25]), sizes("S", "M", "L", "XL", "XXL")],
    qty: { min: 1, max: 500, step: 1, presets: [1, 10, 20, 50] }, production: ["fast", "standard"], printCm: [28, 35],
    details: ["פליז מוברש מבפנים", "קפוצ׳ון עם שרוך וכיס קנגורו", "אפשר לחלק את הכמות בין מידות"] },
  { id: "jacket", name: "ג׳קט פליז ממותג", desc: "פליז 300 גרם עם רוכסן מלא, רקמה או הדפסה בחזה", category: "apparel", mockup: "shirt", image: "/img/jacket.webp", setup: 60,
    base: [[1, 119], [10, 105], [25, 96], [50, 88]],
    options: [{ id: "color", title: "צבע", kind: "color", values: SHIRT_COLORS.filter((c) => ["black", "navy", "gray"].includes(c.id)) },
      { id: "branding", title: "מיתוג", values: [{ id: "chest-print", title: "הדפסה בחזה", cm: [10, 10] }, { id: "chest-embroidery", title: "רקמה בחזה", tiers: [[1, 12], [25, 9]], cm: [10, 10] }, { id: "chest-back", title: "חזה + גב מלא (הדפסה)", tiers: [[1, 22], [25, 17]], cm: [28, 35] }] },
      sizes("S", "M", "L", "XL", "XXL")],
    qty: { min: 1, max: 500, step: 1, presets: [1, 10, 25, 50] }, production: ["standard", "saver"], printCm: [10, 10],
    details: ["פליז אנטי-פילינג עם שני כיסי רוכסן", "רקמה בחזה — מראה יוקרתי לצוות", "עלות הכנה כוללת דיגיטציה לרקמה", "אפשר לחלק את הכמות בין מידות"] },
  { id: "kids-tshirt", name: "חולצת ילדים", desc: "כותנה 100%, מידות 2–14", category: "apparel", mockup: "shirt",
    base: [[1, 28], [10, 23], [20, 20], [50, 17]],
    options: [{ id: "color", title: "צבע חולצה", kind: "color", values: SHIRT_COLORS }, ...garmentPrint([20, 25], [8, 8]), sizes("2", "4", "6", "8", "10", "12", "14")],
    qty: { min: 1, max: 1000, step: 1, presets: [1, 10, 20, 50] }, production: ["fast", "standard", "saver"], printCm: [20, 25],
    details: ["מושלם לחוגים, ימי הולדת וגנים", "הדפסה בטוחה לעור", "אפשר לחלק את הכמות בין מידות"] },
  { id: "cap", name: "כובע מצחייה ממותג", desc: "כותנה מוברשת, רקמה או הדפסה בחזית", category: "apparel", mockup: "cap", image: "/img/cap.webp", setup: 60,
    base: [[10, 34], [25, 28], [50, 24], [100, 21], [250, 18]],
    options: [{ id: "color", title: "צבע כובע", kind: "color", values: SHIRT_COLORS.filter((c) => ["black", "navy", "white", "red", "gray"].includes(c.id)) },
      { id: "branding", title: "מיתוג", values: [{ id: "print", title: "הדפסה בחזית", cm: [8, 5] }, { id: "embroidery", title: "רקמה בחזית", tiers: [[1, 9], [100, 6]], cm: [8, 5] }] }],
    qty: { min: 10, max: 2000, step: 5, presets: [10, 25, 50, 100, 250] }, production: ["standard", "saver"],
    details: ["סגירה מתכווננת — מידה אחת לכולם", "רקמה עמידה במיוחד ללוגו קטן", "עלות הכנה כוללת דיגיטציה לרקמה"] },
  // ── promo
  { id: "mug", name: "ספל ממותג", desc: "קרמיקה 330 מ״ל, הדפסת סובלימציה", category: "promo", mockup: "mug", image: "/img/mug.webp",
    base: [[1, 39], [12, 27], [36, 19], [72, 15], [144, 12]],
    options: [{ id: "inside", title: "צבע פנים", kind: "color", values: [{ id: "white", title: "לבן", color: "#fafafa" }, { id: "black", title: "שחור", color: "#171717", tiers: [[1, 4]] }, { id: "red", title: "אדום", color: "#c62828", tiers: [[1, 4]] }, { id: "blue", title: "כחול", color: "#1e4fa3", tiers: [[1, 4]] }] },
      { id: "print", title: "הדפסה", values: [{ id: "one", title: "צד אחד", cm: [9, 8] }, { id: "wrap", title: "מסביב (360°)", tiers: [[1, 3]], cm: [20, 8] }] }],
    qty: { min: 1, max: 2000, step: 1, presets: [1, 12, 36, 72, 144] }, production: ["fast", "standard", "saver"],
    details: ["מתאים למדיח כלים", "הדפסת סובלימציה בצבע מלא", "נארז בקופסה אישית"] },
  { id: "pen", name: "עט ממותג", desc: "עט כדורי לחיץ, גוף מט, דיו כחולה", category: "promo", mockup: "pen", image: "/img/pen.webp",
    base: [[50, 3.9], [100, 2.9], [250, 2.2], [500, 1.7], [1000, 1.3]],
    options: [{ id: "color", title: "צבע עט", kind: "color", values: [{ id: "black", title: "שחור", color: "#171717" }, { id: "navy", title: "כחול", color: "#1e2a5a" }, { id: "white", title: "לבן", color: "#fafafa" }, { id: "red", title: "אדום", color: "#c62828" }] },
      { id: "branding", title: "מיתוג", values: [{ id: "one", title: "הדפסה בצבע אחד", cm: [4, 0.8] }, { id: "full", title: "הדפסה צבעונית מלאה", tiers: [[1, 0.6], [500, 0.35]], cm: [4, 0.8] }, { id: "engrave", title: "חריטת לייזר", tiers: [[1, 0.9], [500, 0.5]], cm: [4, 0.8] }] }],
    qty: { min: 50, max: 10000, step: 50, presets: [50, 100, 250, 500, 1000] }, production: ["standard", "saver"],
    details: ["מתאים לכנסים, ימי עיון ודלפקי קבלה", "אזור הדפסה עד 4×0.8 ס״מ", "דיו כחולה איכותית"] },
  { id: "bottle", name: "בקבוק נירוסטה", desc: "750 מ״ל דופן כפולה, חריטה או הדפסה", category: "promo", mockup: "bottle", image: "/img/bottle.webp",
    base: [[10, 62], [25, 52], [50, 45], [100, 39]],
    options: [{ id: "color", title: "צבע", kind: "color", values: [{ id: "white", title: "לבן", color: "#fafafa" }, { id: "black", title: "שחור", color: "#171717" }, { id: "steel", title: "נירוסטה", color: "#b0b6bc" }, { id: "navy", title: "כחול", color: "#1e2a5a" }] },
      { id: "branding", title: "מיתוג", values: [{ id: "print", title: "הדפסה צבעונית", cm: [6, 8] }, { id: "engrave", title: "חריטת לייזר", tiers: [[1, 6]], cm: [6, 8] }] }],
    qty: { min: 10, max: 2000, step: 5, presets: [10, 25, 50, 100] }, production: ["standard", "saver"],
    details: ["שומר קור 24 שעות וחום 12 שעות", "חריטת לייזר — לוגו בצבע אחד שלא יורד"] },
  { id: "sleeve", name: "שרוול למחשב נייד", desc: "ניאופרן עם רוכסן, מגן על מחשב 13–15.6 אינץ׳", category: "promo", mockup: "bag", image: "/img/sleeve.webp",
    base: [[10, 49], [25, 42], [50, 37], [100, 33]],
    options: [{ id: "size", title: "גודל", values: [{ id: "13", title: "13–14 אינץ׳", cm: [20, 12] }, { id: "15", title: "15.6 אינץ׳", tiers: [[1, 5]], cm: [22, 14] }] },
      { id: "color", title: "צבע", kind: "color", values: [{ id: "black", title: "שחור", color: "#171717" }, { id: "gray", title: "אפור", color: "#9e9e9e" }, { id: "navy", title: "כחול", color: "#1e2a5a" }] }],
    qty: { min: 10, max: 1000, step: 5, presets: [10, 25, 50, 100] }, production: ["standard", "saver"],
    details: ["ניאופרן 5 מ״מ סופג זעזועים", "הדפסה צבעונית עמידה", "מתנה שימושית לעובדים חדשים ולכנסים"] },
  { id: "charger", name: "מטען אלחוטי ממותג", desc: "משטח טעינה 15W, תואם אייפון ואנדרואיד", category: "promo", mockup: "sticker", image: "/img/charger.webp",
    base: [[10, 59], [25, 49], [50, 42], [100, 37], [250, 33]],
    options: [{ id: "color", title: "צבע", kind: "color", values: [{ id: "black", title: "שחור", color: "#171717" }, { id: "white", title: "לבן", color: "#fafafa" }] },
      { id: "branding", title: "מיתוג", values: [{ id: "print", title: "הדפסה צבעונית", cm: [6, 6] }, { id: "engrave", title: "חריטת לייזר", tiers: [[1, 3]], cm: [6, 6] }] }],
    qty: { min: 10, max: 2000, step: 5, presets: [10, 25, 50, 100, 250] }, production: ["standard", "saver"],
    details: ["טעינה מהירה עד 15W, כבל USB-C כלול", "נורית חיווי עדינה", "נארז בקופסת מתנה"] },
  { id: "tote", name: "תיק בד ממותג", desc: "כותנה 140 גרם, ידיות ארוכות", category: "promo", mockup: "bag", image: "/img/tote.webp",
    base: [[25, 14], [50, 11], [100, 8.5], [250, 7], [500, 6]],
    options: [{ id: "color", title: "צבע תיק", kind: "color", values: [{ id: "natural", title: "טבעי", color: "#efe6d2" }, { id: "black", title: "שחור", color: "#171717", tiers: [[1, 1]] }, { id: "navy", title: "כחול", color: "#1e2a5a", tiers: [[1, 1]] }] },
      { id: "print", title: "הדפסה", values: [{ id: "one", title: "צד אחד", cm: [25, 25] }, { id: "two", title: "שני צדדים", tiers: [[1, 3.5], [250, 2.5]], cm: [25, 25] }] }],
    qty: { min: 25, max: 5000, step: 5, presets: [25, 50, 100, 250, 500] }, production: ["standard", "saver"],
    details: ["38×42 ס״מ", "מתאים לכנסים, חנויות ואירועים"] },
];

/** Market a catalog is priced for: currency, VAT, number/date format and weekend days. Prices in the catalog are in this currency. */
export type Market = { currency: string; vat: number; intl: string; weekend: number[] };
export const HE_MARKET: Market = { currency: "ILS", vat: 0.18, intl: "he-IL", weekend: [5, 6] };
/** Customer-facing texts produced by the pricing engine ({x} = placeholder). Localized catalogs carry a translation. */
export const CATALOG_TEXT = {
  noProduct: "מוצר לא קיים: {id}", unavailable: "{name} אינו זמין כרגע", noSizes: "אין {title} זמינה ל{name}", noSuchSize: "{title} לא קיימת: {k}",
  badSizeQty: "כמות לא תקינה למידה {k}", minQty: "כמות מינימלית ל{name}: {min}", maxQty: "כמות מקסימלית ל{name}: {max} — לכמויות גדולות דברו איתנו",
  stepQty: "ל{name} אפשר להזמין בכפולות של {step}", priceError: "שגיאת מחירון ב{name} — פנו אלינו", noShipping: "אין שיטת משלוח זמינה",
  front: "קדמי", back: "גב", outside: "צד חיצוני (שער + גב)", inside: "צד פנימי", sideFront: "צד קדמי", sideBack: "צד אחורי",
  chest: "חזה", fullBack: "גב מלא", artwork: "גרפיקה",
};
export type CatalogText = typeof CATALOG_TEXT;
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

export type Catalog = { categories: Category[]; products: Product[]; production: Record<ProductionId, Production>; shipping: Record<ShippingId, Shipping>; market?: Market; t?: CatalogText };
const mk = (cat?: Pick<Catalog, "market">) => cat?.market ?? HE_MARKET;
const tx = (cat?: Pick<Catalog, "t">) => cat?.t ?? CATALOG_TEXT;
/** Built-in catalog. The live one is data/catalog.json (edited in /admin/catalog) — see catalog-store.ts. */
export const DEFAULT_CATALOG: Catalog = { categories: CATEGORIES, products: PRODUCTS, production: PRODUCTION, shipping: SHIPPING };
export const liveProducts = (cat: Catalog) => cat.products.filter((p) => p.active !== false);
export const liveShipping = (cat: Catalog) => SHIPPING_IDS.filter((id) => cat.shipping[id].active !== false);

const r2 = (n: number) => Math.round(n * 100 + 1e-9) / 100; // epsilon: 1.425 must round up
const r4 = (n: number) => Math.round(n * 10000 + 1e-9) / 10000;
/** Sub-10-cent amounts (unit prices of bulk paper) keep up to 4 decimals so they never show as 0. */
const decimals = (n: number) => (n !== 0 && Math.abs(n) < 0.1 ? 4 : 2);
export const ils = (n: number) => `₪${n.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: decimals(n) })}`;
/** Price formatter for a catalog's market (₪ / $ / € / AED). */
export function money(cat?: Pick<Catalog, "market">) {
  const m = mk(cat);
  if (m.currency === "ILS") return ils;
  const f = (d: number) => new Intl.NumberFormat(m.intl, { style: "currency", currency: m.currency, minimumFractionDigits: 0, maximumFractionDigits: d });
  const f2 = f(2), f4 = f(4);
  return (n: number) => (decimals(n) === 4 ? f4 : f2).format(n);
}
export const num = (cat: Pick<Catalog, "market"> | undefined, n: number) => n.toLocaleString(mk(cat).intl);
export const findProduct = (cat: Catalog, id: string) => cat.products.find((p) => p.id === id || p.name === id);
export const tierAt = (t: Tier[] | undefined, q: number) => (t?.length ? (t.findLast(([from]) => q >= from) ?? t[0])[1] : 0);

/** Values that stay visible after applying the product's rules to the current selection. */
export function visibleValues(p: Product, sel: Record<string, string>) {
  const off = p.options.flatMap((o) => o.values.filter((v) => v.active === false).map((v) => `${o.id}:${v.id}`));
  const hidden = new Set([...off, ...(p.rules ?? []).filter((r) => r.if[1].includes(sel[r.if[0]])).flatMap((r) => r.hide[1].map((v) => `${r.hide[0]}:${v}`))]);
  return Object.fromEntries(p.options.map((o) => [o.id, o.values.filter((v) => !hidden.has(`${o.id}:${v.id}`))]));
}

/** Fill defaults, drop hidden/unknown choices. Options with nothing visible are left out. Split options are not in `sel`. */
export function normalize(p: Product, sel: Record<string, string> = {}) {
  const out: Record<string, string> = {};
  for (let pass = 0; pass < 2; pass++) { // second pass: rules may depend on values fixed in the first
    const vis = visibleValues(p, { ...sel, ...out });
    for (const o of p.options) {
      if (o.kind === "split") continue;
      const v = vis[o.id];
      if (!v.length) { delete out[o.id]; continue; }
      out[o.id] = v.some((x) => x.id === sel[o.id]) ? sel[o.id] : v[0].id;
    }
  }
  return out;
}

/** One printed side of a line: its file and where/how big it goes. */
export type SideFile = { side: string; label?: string; artwork?: string; placement?: string };
export type LineInput = { productId: string; quantity?: number; options?: Record<string, string>; split?: Record<string, number>; production?: string; artwork?: string; placement?: string; files?: SideFile[] };
export type Line = {
  productId: string; productName: string; quantity: number; options: Record<string, string>; labels: [string, string][];
  split?: Record<string, number>; production: ProductionId; productionLabel: string; productionDays: number;
  unitPrice: number; setup: number; subtotal: number; artwork?: string; placement?: string; files?: SideFile[];
};

export type Side = { id: string; label: string; cm?: [number, number]; single?: boolean };
/** The printed sides of a product for the chosen options (one upload + placement each). */
export function sidesOf(p: Product, sel: Record<string, string>, t: CatalogText = CATALOG_TEXT): Side[] {
  const val = (o: string) => p.options.find((x) => x.id === o)?.values.find((v) => v.id === sel[o]);
  if (p.options.some((o) => o.id === "front")) {
    return ([["front", t.front], ["back", t.back]] as const).flatMap(([id, label]) => {
      const v = val(id);
      return v && v.id !== "none" ? [{ id, label: `${label} · ${v.title.split(" — ")[0]}`, cm: v.cm }] : [];
    });
  }
  const cm = printCmFor(p, sel);
  if (p.id === "brochure") return [{ id: "outside", label: t.outside, cm }, { id: "inside", label: t.inside, cm }];
  if (sel.sides === "2" || sel.print === "two") return [{ id: "front", label: t.sideFront, cm }, { id: "back", label: t.sideBack, cm }];
  if (sel.branding === "chest-back") return [{ id: "front", label: t.chest, cm: [10, 10] }, { id: "back", label: t.fullBack, cm: [28, 35] }];
  return [{ id: "front", label: t.artwork, cm, single: true }];
}

const ART_ID = /^[\w-]+\.(png|jpg|webp|pdf|svg)$/;
/** All files of a line, old single-file lines included. */
export const lineFiles = (l: Pick<Line, "artwork" | "placement" | "files">): SideFile[] =>
  l.files?.length ? l.files : l.artwork || l.placement ? [{ side: "front", artwork: l.artwork, placement: l.placement }] : [];

export function priceLine(cat: Catalog, input: LineInput): Line {
  const p = findProduct(cat, String(input.productId));
  const t = tx(cat);
  if (!p) throw new Error(fill(t.noProduct, { id: String(input.productId) }));
  if (p.active === false) throw new Error(fill(t.unavailable, { name: p.name }));
  const sel = normalize(p, input.options ?? {});
  const splitOpt = p.options.find((o) => o.kind === "split");
  let quantity = Number(input.quantity);
  let split: Record<string, number> | undefined;
  if (splitOpt) {
    const sizes = splitOpt.values.filter((v) => v.active !== false);
    if (!sizes.length) throw new Error(fill(t.noSizes, { title: splitOpt.title, name: p.name }));
    const raw = input.split && Object.keys(input.split).length ? input.split : { [sizes[0].id]: quantity };
    split = {};
    for (const [k, n] of Object.entries(raw)) {
      if (!sizes.some((v) => v.id === k)) throw new Error(fill(t.noSuchSize, { title: splitOpt.title, k }));
      if (!Number.isInteger(n) || n < 0) throw new Error(fill(t.badSizeQty, { k }));
      if (n) split[k] = n;
    }
    quantity = Object.values(split).reduce((a, b) => a + b, 0);
  }
  const { min, max, step, presets } = p.qty;
  if (!Number.isInteger(quantity) || quantity < min) throw new Error(fill(t.minQty, { name: p.name, min: num(cat, min) }));
  if (quantity > max) throw new Error(fill(t.maxQty, { name: p.name, max: num(cat, max) }));
  if (!presets.includes(quantity) && quantity % step) throw new Error(fill(t.stepQty, { name: p.name, step }));
  const production = (p.production.includes(input.production as ProductionId) ? input.production : p.production.includes("standard") ? "standard" : p.production[0]) as ProductionId;

  const chosen = p.options.filter((o) => sel[o.id]).map((o) => [o, o.values.find((v) => v.id === sel[o.id])!] as const);
  const raw = tierAt(p.base, quantity) + chosen.reduce((s, [, v]) => s + tierAt(v.tiers, quantity), 0);
  // sub-10-cent units keep 4 decimals (5000 business cards in € are fractions of a cent); the line total is rounded to cents
  const u = raw * (1 + cat.production[production].pct), unitPrice = u < 0.1 ? r4(u) : r2(u);
  if (!(unitPrice > 0)) throw new Error(fill(t.priceError, { name: p.name }));
  const setup = p.setup ?? 0;
  return {
    productId: p.id, productName: p.name, quantity, options: sel,
    labels: [...chosen.map(([o, v]) => [o.title, v.title] as [string, string]), ...(split ? [[splitOpt!.title, Object.entries(split).map(([k, n]) => `${k}×${n}`).join(", ")] as [string, string]] : [])],
    split, production, productionLabel: cat.production[production].label, productionDays: cat.production[production].days,
    unitPrice, setup, subtotal: r2(unitPrice * quantity + setup),
    ...lineArt(p, sel, input, t),
  };
}

// files per side, validated against the product's sides; artwork/placement mirror the first side for older readers
function lineArt(p: Product, sel: Record<string, string>, input: LineInput, t: CatalogText) {
  const sides = sidesOf(p, sel, t);
  const art = (a?: string) => (a && ART_ID.test(a) ? a : undefined);
  const raw = Array.isArray(input.files) && input.files.length ? input.files : [{ side: sides[0]?.id ?? "front", artwork: input.artwork, placement: input.placement }];
  const files = sides.flatMap((sd) => {
    const f = raw.find((x) => x && x.side === sd.id) ?? (raw.length === 1 && sides.length === 1 ? raw[0] : undefined);
    return f && (art(f.artwork) || f.placement) ? [{ side: sd.id, label: sd.label, artwork: art(f.artwork), placement: typeof f.placement === "string" ? f.placement.slice(0, 160) : undefined }] : [];
  });
  return { files: files.length ? files : undefined, artwork: files[0]?.artwork, placement: files[0]?.placement };
}

export type Totals = { subtotal: number; shipping: number; vat: number; total: number; shippingMethod: ShippingId; shippingLabel: string; shippingDays: number };
export function totals(cat: Catalog, lines: Pick<Line, "subtotal">[], method: string = "home"): Totals {
  const live = liveShipping(cat);
  const m = (live.includes(method as ShippingId) ? method : live.includes("home") ? "home" : live[0]) as ShippingId;
  if (!m) throw new Error(tx(cat).noShipping);
  const subtotal = r2(lines.reduce((s, l) => s + l.subtotal, 0));
  const s = cat.shipping[m];
  const shipping = s.freeFrom && subtotal >= s.freeFrom ? 0 : s.price;
  const vat = r2((subtotal + shipping) * mk(cat).vat);
  return { subtotal, shipping, vat, total: r2(subtotal + shipping + vat), shippingMethod: m, shippingLabel: s.label, shippingDays: s.days };
}

export const withVat = (n: number, cat?: Pick<Catalog, "market">) => { const v = n * (1 + mk(cat).vat); return Math.abs(v) < 0.1 ? r4(v) : r2(v); };
/** Lowest per-unit price incl. VAT (default options, largest preset, cheapest production) — for "החל מ-" labels. */
export function fromPrice(cat: Catalog, p: Product) {
  const cheapest = p.production.toSorted((a, b) => cat.production[a].pct - cat.production[b].pct)[0];
  try { return withVat(priceLine(cat, { productId: p.id, quantity: p.qty.presets.at(-1), production: cheapest }).unitPrice, cat); } catch { return 0; }
}
export const mockupFor = (p: Product, sel: Record<string, string>): Mockup =>
  p.options.flatMap((o) => o.values.filter((v) => sel[o.id] === v.id && v.mockup)).at(-1)?.mockup ?? p.mockup;
export function tintFor(p: Product, sel: Record<string, string>) {
  const o = p.options.find((x) => x.kind === "color" && x.id !== "inside");
  return o?.values.find((v) => v.id === sel[o.id])?.color;
}
export const printCmFor = (p: Product, sel: Record<string, string>): [number, number] | undefined =>
  p.options.flatMap((o) => o.values.filter((v) => sel[o.id] === v.id && v.cm)).at(0)?.cm ?? p.printCm;

/** Effective DPI of a w×h px image printed at cm (orientation-agnostic). */
export function printDpi(cm: [number, number], w: number, h: number): number {
  const [a, b] = cm.toSorted((x, y) => x - y);
  const [pw, ph] = [w, h].toSorted((x, y) => x - y);
  return Math.round(Math.min(pw / (a / 2.54), ph / (b / 2.54)));
}
export const dpiLevel = (dpi: number) => (dpi >= 250 ? "good" : dpi >= 150 ? "ok" : "low");

/** Add business days; `weekend` = day numbers off (Israel: Fri+Sat, elsewhere Sat+Sun). */
export function addBusinessDays(from: Date, n: number, weekend: number[] = HE_MARKET.weekend) {
  const d = new Date(from);
  while (n > 0) { d.setDate(d.getDate() + 1); if (!weekend.includes(d.getDay())) n--; }
  return d;
}

const tiersOk = (t: Tier[] | undefined, signed = false) =>
  !t || (t.every(([f, u], i) => Number.isInteger(f) && f >= 1 && Number.isFinite(u) && (signed || u >= 0) && (i === 0 || f > t[i - 1][0])));

/** Human-readable problems in a catalog (empty = valid). Used live in the admin editor and enforced on save. */
export function catalogErrors(cat: Catalog): string[] {
  const e: string[] = [];
  for (const id of PRODUCTION_IDS) { const x = cat.production[id]; if (!x?.label || !Number.isInteger(x.days) || x.days < 0 || !(x.pct > -1 && x.pct <= 5)) e.push(`זמן ייצור "${x?.label ?? id}": ימים ואחוז לא תקינים`); }
  for (const id of SHIPPING_IDS) { const x = cat.shipping[id]; if (!x?.label || !(x.price >= 0) || !Number.isInteger(x.days) || x.days < 0 || !(x.freeFrom >= 0)) e.push(`משלוח "${x?.label ?? id}": ערכים לא תקינים`); }
  if (!liveShipping(cat).length) e.push("חייבת להיות לפחות שיטת משלוח פעילה אחת");
  const ids = cat.products.map((p) => p.id);
  if (new Set(ids).size !== ids.length) e.push("יש שני מוצרים עם אותו מזהה");
  for (const c of cat.categories) if (!isId(c.id) || !c.name?.trim()) e.push(`קטגוריה "${c.name || c.id}": חסר שם או מזהה לא תקין`);
  for (const p of cat.products) {
    const n = `"${p.name || p.id}"`;
    if (!p.name?.trim()) e.push(`${p.id}: חסר שם`);
    if (!cat.categories.some((c) => c.id === p.category)) e.push(`${n}: קטגוריה לא קיימת`);
    for (const o of p.options) {
      if (!o.title?.trim()) e.push(`${n}: אפשרות בלי שם`);
      if (!o.values.length) e.push(`${n} › ${o.title || "אפשרות"}: חייב להיות לפחות ערך אחד`);
      if (new Set(o.values.map((v) => v.id)).size !== o.values.length) e.push(`${n} › ${o.title}: ערכים כפולים`);
    }
    if (new Set(p.options.map((o) => o.id)).size !== p.options.length) e.push(`${n}: אפשרויות כפולות`);
    const { min, max, step, presets } = p.qty;
    if (!(Number.isInteger(min) && min >= 1 && Number.isInteger(max) && max >= min && Number.isInteger(step) && step >= 1)) e.push(`${n}: מינימום/מקסימום/קפיצה לא תקינים`);
    if (!presets.length || presets.some((q, i) => !Number.isInteger(q) || q < min || q > max || (i && q <= presets[i - 1]))) e.push(`${n}: כמויות מוצעות חייבות להיות בעלייה ובין המינימום למקסימום`);
    if (!p.base.length || !tiersOk(p.base)) e.push(`${n}: מדרגות מחיר בסיס לא תקינות (כמות שלמה בעלייה, מחיר ≥ 0)`);
    if (!(Number.isFinite(p.setup ?? 0) && (p.setup ?? 0) >= 0)) e.push(`${n}: עלות הכנה לא תקינה`);
    if (!p.production.length) e.push(`${n}: יש לבחור לפחות זמן ייצור אחד`);
    for (const o of p.options) for (const v of o.values) {
      if (!v.title?.trim()) e.push(`${n} › ${o.title}: ערך בלי שם`);
      if (!tiersOk(v.tiers, true)) e.push(`${n} › ${o.title} › ${v.title}: מדרגות תוספת לא תקינות`);
    }
    if (p.active === false || e.length) continue;
    for (const q of presets) for (const pr of p.production) // every default combination must price above zero
      try { priceLine(cat, { productId: p.id, quantity: q, production: pr }); } catch (err) { e.push(`${n} (${q} יח׳): ${(err as Error).message}`); break; }
  }
  return e;
}

export const MOCKUPS: [Mockup, string][] = [["card", "כרטיס"], ["flyer", "דף / פלייר"], ["poster", "פוסטר / שלט"], ["sticker", "עיגול / מדבקה"], ["mug", "ספל"], ["shirt", "חולצה"], ["bag", "תיק"], ["bottle", "בקבוק"], ["pen", "עט"], ["cap", "כובע"]];
const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
export const isId = (s: unknown): s is string => typeof s === "string" && ID.test(s);
export const isImage = (s: unknown): s is string => typeof s === "string" && /^\/(img|media)\/[\w.-]+\.webp$/.test(s);

/** A blank (hidden) product to start editing from. */
export function newProduct(id: string, name: string, category: string, mockup: Mockup): Product {
  return { id, name, desc: "", category, mockup, active: false, base: [[1, 10]], options: [],
    qty: { min: 1, max: 1000, step: 1, presets: [1, 10, 50, 100] }, production: ["standard"], details: [] };
}

/** Apply admin edits onto a product. Ids of existing options/values stay fixed; new ones must be valid ids;
 *  option kinds and code-defined extras (rules, print sizes, mockup overrides) are kept from the current product. */
export function mergeProductEdit(cur: Product, ed: Product): Product {
  const num = (x: unknown) => Number(x);
  const str = (x: unknown, max: number) => String(x ?? "").trim().slice(0, max);
  const tiers = (t: unknown): Tier[] => (Array.isArray(t) ? t.slice(0, 20).map((r) => [num(r?.[0]), num(r?.[1])] as Tier) : []);
  const edOpts = Array.isArray(ed.options) ? ed.options.slice(0, 12) : [];
  return {
    ...cur, name: str(ed.name, 80), desc: str(ed.desc, 200), active: ed.active !== false,
    category: str(ed.category, 40) || cur.category,
    mockup: MOCKUPS.some(([m]) => m === ed.mockup) ? ed.mockup : cur.mockup,
    image: ed.image === undefined || ed.image === null || ed.image === "" ? undefined : isImage(ed.image) ? ed.image : cur.image,
    base: tiers(ed.base), setup: num(ed.setup ?? 0),
    qty: { min: num(ed.qty?.min), max: num(ed.qty?.max), step: num(ed.qty?.step), presets: (Array.isArray(ed.qty?.presets) ? ed.qty.presets.slice(0, 12) : []).map(num) },
    production: PRODUCTION_IDS.filter((id) => ed.production?.includes(id)),
    details: (Array.isArray(ed.details) ? ed.details : cur.details).map((d) => str(d, 160)).filter(Boolean).slice(0, 8),
    options: edOpts.filter((eo) => isId(eo?.id)).map((eo) => {
      const co = cur.options.find((o) => o.id === eo.id);
      const kind = co ? co.kind : eo.kind === "color" || eo.kind === "split" ? eo.kind : undefined;
      const values = (Array.isArray(eo.values) ? eo.values.slice(0, 30) : []).filter((ev) => isId(ev?.id)).map((ev) => {
        const cv = co?.values.find((v) => v.id === ev.id);
        const t = tiers(ev.tiers);
        const color = /^#[0-9a-f]{6}$/i.test(String(ev.color)) ? String(ev.color) : cv?.color;
        return { ...cv, id: ev.id, title: str(ev.title, 60), tiers: t.length && kind !== "split" ? t : undefined, active: ev.active !== false,
          ...(kind === "color" ? { color: color ?? "#fafafa" } : {}) };
      });
      return { ...co, id: eo.id, title: str(eo.title, 40), kind, values };
    }),
  };
}
