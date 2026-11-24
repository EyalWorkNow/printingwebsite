// Prepare a blank product photo for the photo mockup: web copy, product mask (for colour tint) and shading map (folds).
//   node scripts/prep-mockup.mjs <photo> <name>   → public/mockups/<name>.webp, <name>-mask.png, <name>-shade.webp
// Mask = pixels that differ from a quadratic model of the backdrop (fitted on the outer frame), holes filled.
import sharp from "sharp";
const [src, name, tolArg] = process.argv.slice(2);
const W = 1600, TOL = Number(tolArg ?? 6);
const base = sharp(src).resize(W);
await base.clone().webp({ quality: 86 }).toFile(`public/mockups/${name}.webp`);
const { data, info } = await base.clone().greyscale().blur(1.5).raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height;
// least squares fit v ≈ a + bx + cy + dx² + ey² + fxy on the outer 8% frame
const feats = (x, y) => { const u = x / w - 0.5, v = y / h - 0.5; return [1, u, v, u * u, v * v, u * v]; };
const A = Array.from({ length: 6 }, () => new Array(6).fill(0)), B = new Array(6).fill(0);
const fx = w * 0.08, fy = h * 0.08;
for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) {
  if (x > fx && x < w - fx && y > fy && y < h - fy) continue;
  const f = feats(x, y), v = data[y * w + x];
  for (let i = 0; i < 6; i++) { B[i] += f[i] * v; for (let j = 0; j < 6; j++) A[i][j] += f[i] * f[j]; }
}
for (let i = 0; i < 6; i++) { // gaussian elimination
  let m = i; for (let r = i + 1; r < 6; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r;
  [A[i], A[m]] = [A[m], A[i]]; [B[i], B[m]] = [B[m], B[i]];
  for (let r = 0; r < 6; r++) if (r !== i) { const k = A[r][i] / A[i][i]; for (let c = i; c < 6; c++) A[r][c] -= k * A[i][c]; B[r] -= k * B[i]; }
}
const coef = B.map((b, i) => b / A[i][i]);
const fg = new Uint8Array(w * h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const f = feats(x, y); const model = f.reduce((s, t, i) => s + t * coef[i], 0); fg[y * w + x] = Math.abs(data[y * w + x] - model) > TOL ? 1 : 0; }
// close small gaps (collar, hem) so the hole fill can't leak: dilate by blur+low threshold; erode after filling
const morph = async (buf, sigma, thr) => new Uint8Array((await sharp(Buffer.from(buf.map((b) => b * 255)), { raw: { width: w, height: h, channels: 1 } }).blur(sigma).extractChannel(0).raw().toBuffer()).map((v) => (v > thr ? 1 : 0)));
const closed = await morph(fg, 6, 20);
fg.set(closed);
// fill holes: background = not-fg region connected to the border
const bg = new Uint8Array(w * h), stack = [];
const seed = (i) => { if (!fg[i] && !bg[i]) { bg[i] = 1; stack.push(i); } };
for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
while (stack.length) { const i = stack.pop(), x = i % w; if (x > 0) seed(i - 1); if (x < w - 1) seed(i + 1); if (i >= w) seed(i - w); if (i < w * (h - 1)) seed(i + w); }
const solid = await morph(bg.map((b) => (b ? 0 : 1)), 6, 235); // erode back
const mask = Buffer.from(solid.map((b) => (b ? 255 : 0)));
const alpha = await sharp(mask, { raw: { width: w, height: h, channels: 1 } }).median(5).blur(0.8).extractChannel(0).png().toBuffer();
await sharp({ create: { width: w, height: h, channels: 3, background: "#fff" } }).joinChannel(alpha).png().toFile(`public/mockups/${name}-mask.png`); // white + alpha (canvas masks use alpha)
// shading: luminance normalised so flat fabric ≈ white and folds/shadows darken (multiplied over the print)
const g = await base.clone().greyscale().raw().toBuffer();
const inside = [...g].filter((_, i) => solid[i]).sort((a, b) => a - b);
const ref = inside[Math.floor(inside.length * 0.85)];
await sharp(Buffer.from(g.map((v) => Math.min(255, Math.round((v / ref) * 255)))), { raw: { width: w, height: h, channels: 1 } }).webp({ quality: 90 }).toFile(`public/mockups/${name}-shade.webp`);
let [x0, y0, x1, y1] = [w, h, 0, 0];
solid.forEach((b, i) => { if (b) { const x = i % w, y = (i / w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } });
console.log(name, w, h, "fabric ref", ref, "product px", inside.length, "bbox", [x0, y0, x1 - x0 + 1, y1 - y0 + 1].join(","));
