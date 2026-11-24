// One-time: move local data/ to the new layout and (with BLOB_READ_WRITE_TOKEN) copy it into Vercel Blob.
//   node scripts/migrate-storage.mjs            → split data/orders.json into data/orders/<id>.json
//   BLOB_READ_WRITE_TOKEN=… node scripts/migrate-storage.mjs   → also upload everything in data/ to Blob (private)
// Safe to re-run: existing local order files and existing blobs are skipped.
import { readFile, writeFile, mkdir, readdir, rename, stat } from "node:fs/promises";
import path from "node:path";

const DATA = path.resolve("data");
const legacy = path.join(DATA, "orders.json");
const orders = JSON.parse(await readFile(legacy, "utf8").catch(() => "[]"));
if (orders.length) {
  await mkdir(path.join(DATA, "orders"), { recursive: true });
  for (const o of orders) await writeFile(path.join(DATA, "orders", `${o.id}.json`), JSON.stringify(o, null, 2), { flag: "wx" }).catch((e) => { if (e.code !== "EEXIST") throw e; });
  await rename(legacy, legacy + ".migrated");
  console.log(`split ${orders.length} orders into data/orders/`);
}

if (process.env.BLOB_READ_WRITE_TOKEN) {
  const { put, head } = await import("@vercel/blob");
  const TYPES = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", pdf: "application/pdf", svg: "image/svg+xml", json: "application/json" };
  const walk = async (dir) => (await Promise.all((await readdir(dir)).map(async (f) => {
    const p = path.join(dir, f);
    return (await stat(p)).isDirectory() ? walk(p) : [p];
  }))).flat();
  let n = 0, skipped = 0;
  for (const file of await walk(DATA)) {
    const key = path.relative(DATA, file).split(path.sep).join("/");
    const ext = key.split(".").pop();
    if (!TYPES[ext]) continue; // skips orders.json.migrated etc.
    if (await head(key).then(() => true, () => false)) { skipped++; continue; }
    await put(key, await readFile(file), { access: "private", contentType: TYPES[ext], addRandomSuffix: false });
    n++;
  }
  console.log(`uploaded ${n} files to Blob (${skipped} already there)`);
}
