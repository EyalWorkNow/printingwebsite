import sharp from "sharp";
const out = process.argv[2], items = process.argv.slice(3);
const tiles = [];
for (const it of items) {
  const [n, ...rects] = it.split(":");
  const m = await sharp(`public/mockups/${n}.webp`).metadata();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${m.width}" height="${m.height}">${Array.from({ length: Math.ceil(m.height / 50) }, (_, i) => `<line x1="0" y1="${i * 50}" x2="${m.width}" y2="${i * 50}" stroke="${i % 2 ? "#93c5fd" : "#2563eb"}" stroke-width="${i % 2 ? 1 : 2}"/><text x="4" y="${i * 50 - 3}" font-size="22" fill="#2563eb">${i * 50}</text>`).join("")}${Array.from({ length: Math.ceil(m.width / 100) }, (_, i) => `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="${m.height}" stroke="#93c5fd" stroke-width="1"/>`).join("")}${rects.map((r) => { const [x, y, w, h] = r.split(",").map(Number); return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#e11d48" stroke-width="4"/>`; }).join("")}</svg>`;
  tiles.push(await sharp(await sharp(`public/mockups/${n}.webp`).composite([{ input: Buffer.from(svg) }]).toBuffer()).resize(750, 520, { fit: "contain", background: "#fff" }).png().toBuffer());
}
const cols = 2, rows = Math.ceil(tiles.length / cols);
await sharp({ create: { width: 750 * cols, height: 520 * rows, channels: 3, background: "#fff" } }).composite(tiles.map((input, i) => ({ input, left: (i % cols) * 750, top: Math.floor(i / cols) * 520 }))).jpeg({ quality: 80 }).toFile(out);
