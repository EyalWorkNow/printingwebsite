import type { Mockup as Kind } from "@/lib/catalog";

// Inline-SVG mockups: the uploaded artwork is clipped into each product's print area; `tint` colours the product body.
// ponytail: flat vector mockups; swap for photo mockups + displacement maps if marketing wants realism
type Shape = { body: (t: string) => React.ReactNode; area: [number, number, number, number]; clip?: "circle"; rx?: number };
const shadow = (x: number, y: number, w: number, h: number, rx = 0) => <rect x={x + 8} y={y + 8} width={w} height={h} rx={rx} fill="#000" opacity=".35" />;
const card = (x: number, y: number, w: number, h: number): Shape => ({ body: (t) => <>{shadow(x, y, w, h, 10)}<rect x={x} y={y} width={w} height={h} rx="10" fill={t} /></>, area: [x, y, w, h], rx: 10 });

const SHAPES: Record<Kind, Shape> = {
  card: card(50, 114, 300, 172),
  "card-v": card(114, 50, 172, 300),
  "card-sq": card(85, 85, 230, 230),
  flyer: { body: (t) => <>{shadow(90, 30, 210, 300)}<rect x="90" y="30" width="210" height="300" fill={t} /></>, area: [90, 30, 210, 300] },
  poster: { body: (t) => <><rect x="70" y="20" width="260" height="350" rx="4" fill="#262626" /><rect x="82" y="32" width="236" height="326" fill={t} /></>, area: [82, 32, 236, 326] },
  sticker: { body: (t) => <><circle cx="204" cy="204" r="135" fill="#000" opacity=".35" /><circle cx="200" cy="200" r="135" fill={t} /></>, area: [75, 75, 250, 250], clip: "circle" },
  mug: {
    body: (t) => <><path d="M300 150 q70 0 70 60 t-70 60" fill="none" stroke="#e5e5e5" strokeWidth="22" /><rect x="90" y="100" width="220" height="230" rx="18" fill={t} /><ellipse cx="200" cy="102" rx="110" ry="14" fill="#d4d4d4" /></>,
    area: [115, 140, 170, 150],
  },
  shirt: {
    body: (t) => <path d="M140 40 l-90 45 l30 75 l35 -15 v215 h170 v-215 l35 15 l30 -75 l-90 -45 q-60 40 -120 0z" fill={t} stroke="#00000022" />,
    area: [145, 110, 110, 140],
  },
  bag: {
    body: (t) => <><path d="M150 120 v-40 a50 50 0 0 1 100 0 v40" fill="none" stroke={t} strokeWidth="10" /><rect x="90" y="110" width="220" height="250" rx="6" fill={t} stroke="#00000022" /></>,
    area: [115, 150, 170, 170],
  },
  pen: {
    body: (t) => <g><rect x="60" y="182" width="280" height="36" rx="18" fill={t} stroke="#00000033" /><path d="M340 188 l34 12 l-34 12z" fill="#a3a3a3" /><rect x="90" y="172" width="90" height="10" rx="5" fill="#737373" /></g>,
    area: [150, 186, 110, 28],
  },
  cap: {
    body: (t) => <><path d="M80 250 q0 -150 140 -150 q140 0 140 150z" fill={t} stroke="#00000033" /><path d="M60 250 q-10 40 60 45 h120 q30 0 20 -45z" fill={t} stroke="#00000055" /><circle cx="220" cy="100" r="9" fill={t} stroke="#00000033" /></>,
    area: [165, 150, 110, 70],
  },
  bottle: {
    body: (t) => <><rect x="170" y="20" width="60" height="40" rx="8" fill="#525252" /><path d="M160 60 h80 q30 30 30 70 v220 q0 25 -25 25 h-90 q-25 0 -25 -25 v-220 q0 -40 30 -70z" fill={t} stroke="#00000022" /></>,
    area: [150, 170, 100, 130],
  },
};

export function Mockup({ kind, src, zoom = 1, fit = false, uid = "", tint = "#fafafa", placeholder = "הגרפיקה שלך כאן", label = "תצוגה מקדימה של המוצר עם הגרפיקה" }: { kind: Kind; src?: string; zoom?: number; fit?: boolean; uid?: string; tint?: string; placeholder?: string; label?: string }) {
  const { body, area, clip, rx = 0 } = SHAPES[kind];
  const [x, y, w, h] = area;
  const id = `clip-${kind}${uid}`; // unique per instance: several mockups can share a page
  const [iw, ih] = [w * zoom, h * zoom];
  const n = parseInt(tint.slice(1), 16);
  const dark = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 128;
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" role="img" aria-label={label}>
      <defs>
        <clipPath id={id}>{clip === "circle" ? <circle cx="200" cy="200" r="135" /> : <rect x={x} y={y} width={w} height={h} rx={rx} />}</clipPath>
      </defs>
      {body(tint)}
      {src ? (
        <image href={src} x={x + (w - iw) / 2} y={y + (h - ih) / 2} width={iw} height={ih} preserveAspectRatio={fit ? "xMidYMid meet" : "xMidYMid slice"} clipPath={`url(#${id})`} />
      ) : (
        <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fill={dark ? "#d4d4d4" : "#a3a3a3"} fontSize="15">{placeholder}</text>
      )}
    </svg>
  );
}
