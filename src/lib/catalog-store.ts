import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cacheTag } from "next/cache";
import { DEFAULT_CATALOG, type Catalog } from "./catalog";

// The live catalog: data/catalog.json if the admin saved one, otherwise the built-in defaults.
// Cached under the "catalog" tag — the admin save action calls updateTag("catalog").
const DATA = path.join(process.cwd(), "data");
const FILE = path.join(DATA, "catalog.json");
export const MEDIA = path.join(DATA, "media"); // admin-uploaded photos
export const CATALOG_TAG = "catalog";

export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheTag(CATALOG_TAG);
  return readCatalog();
}

/** Uncached read — for the admin editor and for saving. */
export async function readCatalog(): Promise<Catalog> {
  const raw = await readFile(FILE, "utf8").catch(() => null);
  if (!raw) return DEFAULT_CATALOG;
  const saved = JSON.parse(raw) as Catalog;
  // products added to the code later still show up; saved edits win for products that exist in the file
  const ids = new Set(saved.products.map((p) => p.id));
  return { ...DEFAULT_CATALOG, ...saved, products: [...saved.products, ...DEFAULT_CATALOG.products.filter((p) => !ids.has(p.id))] };
}

let chain = Promise.resolve(); // ponytail: in-process write lock, single-instance only
export async function writeCatalog(next: Catalog) {
  const job = chain.then(async () => {
    await mkdir(path.join(DATA, "catalog-history"), { recursive: true });
    const prev = await readFile(FILE, "utf8").catch(() => null);
    if (prev) await writeFile(path.join(DATA, "catalog-history", `${new Date().toISOString().replace(/[:.]/g, "-")}.json`), prev); // every save keeps the previous version
    await writeFile(FILE, JSON.stringify(next, null, 2));
  });
  chain = job.catch(() => {});
  await job;
}
