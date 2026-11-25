// Prepare a transparent-background product cutout for the photo mockup:
//   node scripts/prep-cutout.mjs <cutout.png> <name>
//   → public/mockups/<name>.webp (product on a soft grey studio backdrop + contact shadow),
//     <name>-mask.png (exact product alpha, for colour changes), <name>-shade.webp (folds/shading for the print)
import sharp from "sharp";
const [src, name] = process.argv.slice(2);
const W = 1600;
const cut = sharp(src).resize(W);
const { width: w, height: h } = await cut.clone().metadata().then(async (m) => ({ width: W, height: Math.round((m.height * W) / m.width) }));
const rgba = await cut.clone().ensureAlpha().png().toBuffer();
const alpha = await sharp(rgba).extractChannel(3).raw().toBuffer();

// backdrop: light grey with a gentle radial falloff
const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><radialGradient id="g" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="#ececec"/><stop offset="1" stop-color="#d6d6d6"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
// soft shadow from the product silhouette, offset down-right
const shadow = await sharp({ create: { width: w, height: h, channels: 3, background: "#000" } })
  .joinChannel(await sharp(alpha, { raw: { width: w, height: h, channels: 1 } }).linear(0.32, 0).blur(14).extractChannel(0).raw().toBuffer(), { raw: { width: w, height: h, channels: 1 } })
  .png().toBuffer();
await sharp(bg).composite([{ input: shadow, left: 0, top: 0, blend: "over", top: 10, left: 8 }, { input: rgba }]).webp({ quality: 88 }).toFile(`public/mockups/${name}.webp`);

await sharp({ create: { width: w, height: h, channels: 3, background: "#fff" } }).joinChannel(alpha, { raw: { width: w, height: h, channels: 1 } }).png().toFile(`public/mockups/${name}-mask.png`);

// shading: product luminance / its typical (85th pct) luminance → 255 = flat surface, darker = folds; outside = 255
const lum = await sharp(rgba).flatten({ background: "#fff" }).greyscale().raw().toBuffer();
const inside = [];
for (let i = 0; i < alpha.length; i += 7) if (alpha[i] > 250) inside.push(lum[i]);
inside.sort((a, b) => a - b);
const ref = inside[Math.floor(inside.length * 0.85)];
await sharp(Buffer.from(lum.map((v, i) => (alpha[i] < 128 ? 255 : Math.min(255, Math.round((v / ref) * 255))))), { raw: { width: w, height: h, channels: 1 } }).webp({ quality: 90 }).toFile(`public/mockups/${name}-shade.webp`);

let [x0, y0, x1, y1] = [w, h, 0, 0];
for (let i = 0; i < alpha.length; i++) if (alpha[i] > 128) { const x = i % w, y = (i / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
console.log(name, w, h, "ref", ref, "bbox", [x0, y0, x1 - x0 + 1, y1 - y0 + 1].join(","));
