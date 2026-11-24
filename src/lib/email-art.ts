import sharp from "sharp";

// Animated hero for the emails: a sheet slides in, a print head lays down the design, a check mark pops, the sheet leaves.
// A GIF because Gmail strips CSS animation; GIF animates in Gmail, Apple Mail, iOS and Outlook.com (Outlook desktop shows frame 1).
// Rendered once per server instance with sharp (SVG frames → animated GIF), ~1s.
const W = 1200, H = 360;
const INK = ["#dd7bbb", "#d79f1e", "#5a922c", "#4c7894"];
const SX = 390, SY = 40, SW = 420, SH = 280; // sheet box when centred
const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
const back = (t: number) => { const c = 1.9; t = Math.min(1, Math.max(0, t)); return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };

/** The printed design (absolute coords, sheet at SX/SY). */
const design = `
<circle cx="${SX + 110}" cy="${SY + 110}" r="58" fill="${INK[0]}"/>
<rect x="${SX + 190}" y="${SY + 56}" width="190" height="22" rx="11" fill="#171717"/>
<rect x="${SX + 190}" y="${SY + 92}" width="140" height="14" rx="7" fill="#a3a3a3"/>
<rect x="${SX + 190}" y="${SY + 118}" width="160" height="14" rx="7" fill="#a3a3a3"/>
<path d="M${SX + 52} ${SY + 238} l40 -56 l30 34 l22 -24 l44 46z" fill="${INK[2]}"/>
<rect x="${SX + 210}" y="${SY + 180}" width="74" height="58" rx="10" fill="${INK[1]}"/>
<rect x="${SX + 296}" y="${SY + 180}" width="74" height="58" rx="10" fill="${INK[3]}"/>
${INK.map((c, i) => `<rect x="${SX + 30 + i * 22}" y="${SY + SH - 22}" width="18" height="8" fill="${c}"/>`).join("")}`;

const crop = (x: number, y: number) => [[x, y, -1, -1], [x + SW, y, 1, -1], [x, y + SH, -1, 1], [x + SW, y + SH, 1, 1]]
  .map(([cx, cy, dx, dy]) => `<path d="M${cx + dx * 6} ${cy} h${dx * 18} M${cx} ${cy + dy * 6} v${dy * 18}" stroke="#525252" stroke-width="2"/>`).join("");

function frame(o: { dx: number; printed: number; head: boolean; check: number; burst: number; fade: number }) {
  const y = SY + o.printed * SH; // print head line
  const drops = o.head && o.printed < 1 ? INK.map((c, i) => `<circle cx="${SX + 80 + i * 90 + ((o.printed * 997 + i * 37) % 40)}" cy="${y + 10 + ((o.printed * 400 + i * 13) % 14)}" r="4" fill="${c}"/>`).join("") : "";
  const s = back(o.check);
  const cx = SX + SW - 18, cy = SY + 18;
  const burst = o.burst > 0 && o.burst < 1 ? Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2, r = 40 + ease(o.burst) * 70;
    return `<circle cx="${cx + Math.cos(a) * r}" cy="${cy + Math.sin(a) * r}" r="${5 * (1 - o.burst) + 1}" fill="${INK[i % 4]}" opacity="${1 - o.burst}"/>`;
  }).join("") : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<radialGradient id="g" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="#dd7bbb" stop-opacity=".22"/><stop offset=".5" stop-color="#4c7894" stop-opacity=".08"/><stop offset="1" stop-color="#0a0a0a" stop-opacity="0"/></radialGradient>
<clipPath id="ink"><rect x="${SX}" y="${SY}" width="${SW}" height="${o.printed * SH}"/></clipPath>
</defs>
<rect width="${W}" height="${H}" fill="#0a0a0a"/>
<rect width="${W}" height="${H}" fill="url(#g)"/>
<g opacity="${1 - o.fade}" transform="translate(${o.dx} 0)">
  <rect x="${SX + 10}" y="${SY + 12}" width="${SW}" height="${SH}" rx="6" fill="#000" opacity=".6"/>
  <rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" rx="6" fill="#fafafa"/>
  ${crop(SX, SY)}
  <g clip-path="url(#ink)">${design}</g>
  ${o.head && o.printed < 1 ? `<rect x="${SX - 40}" y="${y - 14}" width="${SW + 80}" height="22" rx="11" fill="#262626" stroke="#404040"/>
  ${INK.map((c, i) => `<rect x="${SX + 60 + i * 90}" y="${y - 8}" width="54" height="10" rx="5" fill="${c}"/>`).join("")}${drops}` : ""}
  ${burst}
  ${o.check > 0 ? `<g transform="translate(${cx} ${cy}) scale(${s})"><circle r="30" fill="#5a922c" stroke="#0a0a0a" stroke-width="6"/><path d="M-13 1 l9 9 l17 -19" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></g>` : ""}
</g>
</svg>`;
}

function frames() {
  const out: { svg: string; delay: number }[] = [];
  const base = { dx: 0, printed: 0, head: false, check: 0, burst: 0, fade: 0 };
  for (let i = 0; i <= 8; i++) out.push({ svg: frame({ ...base, dx: -(1 - ease(i / 8)) * 820, fade: 1 - ease(i / 8) }), delay: 50 });
  for (let i = 1; i <= 24; i++) out.push({ svg: frame({ ...base, head: true, printed: i / 24 }), delay: 50 });
  for (let i = 1; i <= 10; i++) out.push({ svg: frame({ ...base, printed: 1, check: i / 7, burst: i / 10 }), delay: 50 });
  out.at(-1)!.delay = 2600; // hold the finished sheet
  for (let i = 1; i <= 6; i++) out.push({ svg: frame({ ...base, printed: 1, check: 1, dx: ease(i / 6) * 820, fade: ease(i / 6) }), delay: 50 });
  out.at(-1)!.delay = 300;
  return out;
}

let cached: Promise<Buffer> | undefined;
export function printGif(): Promise<Buffer> {
  cached ??= (async () => {
    const f = frames();
    const pngs = await Promise.all(f.map((x) => sharp(Buffer.from(x.svg)).png().toBuffer()));
    return sharp(pngs, { join: { animated: true } }).gif({ delay: f.map((x) => x.delay), loop: 0, colours: 64, effort: 7, dither: 0.6 }).toBuffer();
  })();
  cached.catch(() => { cached = undefined; });
  return cached;
}
