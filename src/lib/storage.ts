import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, list, put } from "@vercel/blob";
import { BLOB_TOKEN } from "./env";

// Key/value file storage. Vercel Blob (private) when BLOB_READ_WRITE_TOKEN is set, else the local data/ folder.
// Keys look like "orders/DP-X.json", "uploads/<uuid>.pdf", "media/<uuid>.webp", "catalog.json".
export const BLOB = !!BLOB_TOKEN;
const token = BLOB_TOKEN;
const DATA = path.join(process.cwd(), "data");
const local = (key: string) => {
  const p = path.join(DATA, key);
  if (!p.startsWith(DATA + path.sep)) throw new Error("bad key"); // no path traversal
  return p;
};

export async function read(key: string): Promise<Buffer | null> {
  if (!BLOB) return readFile(local(key)).catch(() => null);
  const r = await get(key, { access: "private", useCache: false, token }).catch(() => null); // origin read: always the latest version
  return r?.statusCode === 200 ? Buffer.from(await new Response(r.stream).arrayBuffer()) : null;
}

export const readJson = async <T>(key: string): Promise<T | null> => {
  const b = await read(key);
  return b ? (JSON.parse(b.toString("utf8")) as T) : null;
};

/** `create: true` fails if the key already exists (never silently overwrite an order or upload). */
export async function write(key: string, body: Buffer | string, opts: { contentType?: string; create?: boolean } = {}) {
  if (!BLOB) {
    await mkdir(path.dirname(local(key)), { recursive: true });
    return writeFile(local(key), body, { flag: opts.create ? "wx" : "w" });
  }
  await put(key, body, { access: "private", contentType: opts.contentType, addRandomSuffix: false, allowOverwrite: !opts.create, token });
}

export const writeJson = (key: string, v: unknown, opts: { create?: boolean } = {}) =>
  write(key, JSON.stringify(v, null, 2), { contentType: "application/json", ...opts });

/** Keys under a folder prefix ("orders/"). */
export async function keys(prefix: string): Promise<string[]> {
  if (!BLOB) return (await readdir(local(prefix)).catch(() => [] as string[])).map((f) => prefix + f);
  const out: string[] = [];
  let cursor: string | undefined;
  do {
    const r = await list({ prefix, cursor, token });
    out.push(...r.blobs.map((b) => b.pathname));
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out;
}
