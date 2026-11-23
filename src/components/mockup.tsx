import type { Mockup as Kind } from "@/lib/catalog";

// Inline-SVG mockups: the uploaded artwork is clipped into each product's print area.
// ponytail: flat vector mockups; swap for photo mockups + displacement maps if marketing wants realism
const SHAPES: Record<Kind, { body: React.ReactNode; area: [number, number, number, number]; clip?: string }> = {
  card: {
    body: <><rect x="58" y="108" width="300" height="172" rx="10" fill="#000" opacity=".35" transform="rotate(-6 200 200)" /><rect x="50" y="100" width="300" height="172" rx="10" fill="#fafafa" /></>,
    area: [50, 100, 300, 172],
  },
  flyer: {
    body: <><rect x="98" y="38" width="210" height="300" fill="#000" opacity=".35" /><rect x="90" y="30" width="210" height="300" fill="#fafafa" /></>,
    area: [90, 30, 210, 300],
  },
  poster: {
    body: <><rect x="70" y="20" width="260" height="350" rx="4" fill="#262626" /><rect x="82" y="32" width="236" height="326" fill="#fafafa" /></>,
    area: [82, 32, 236, 326],
  },
  sticker: {
    body: <><circle cx="204" cy="204" r="135" fill="#000" opacity=".35" /><circle cx="200" cy="200" r="135" fill="#fafafa" /></>,
    area: [75, 75, 250, 250],
    clip: "circle",
  },
  mug: {
    body: <><path d="M300 150 q70 0 70 60 t-70 60" fill="none" stroke="#e5e5e5" strokeWidth="22" /><rect x="90" y="100" width="220" height="230" rx="18" fill="#fafafa" /><ellipse cx="200" cy="102" rx="110" ry="14" fill="#d4d4d4" /></>,
    area: [115, 140, 170, 150],
  },
  shirt: {
    body: <path d="M140 40 l-90 45 l30 75 l35 -15 v215 h170 v-215 l35 15 l30 -75 l-90 -45 q-60 40 -120 0z" fill="#fafafa" />,
    area: [145, 110, 110, 140],
  },
};

export function Mockup({ kind, src, zoom = 1, fit = false, uid = "" }: { kind: Kind; src?: string; zoom?: number; fit?: boolean; uid?: string }) {
  const { body, area, clip } = SHAPES[kind];
  const [x, y, w, h] = area;
  const id = `clip-${kind}${uid}`; // unique per instance: several mockups can share a page
  const [iw, ih] = [w * zoom, h * zoom];
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" role="img" aria-label="תצוגה מקדימה של המוצר עם הגרפיקה">
      <defs>
        <clipPath id={id}>{clip === "circle" ? <circle cx="200" cy="200" r="135" /> : <rect x={x} y={y} width={w} height={h} rx={kind === "card" ? 10 : 0} />}</clipPath>
      </defs>
      {body}
      {src ? (
        <image href={src} x={x + (w - iw) / 2} y={y + (h - ih) / 2} width={iw} height={ih} preserveAspectRatio={fit ? "xMidYMid meet" : "xMidYMid slice"} clipPath={`url(#${id})`} />
      ) : (
        <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fill="#a3a3a3" fontSize="16">הגרפיקה שלך כאן</text>
      )}
    </svg>
  );
}
