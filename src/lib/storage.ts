import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { db, HAS_DB } from "./db";

// Files (customer artwork, product photos) live in the business database (Supabase), table `files`, split into parts
// of ≤ PART bytes so every upload request and download chunk stays under Vercel's 4.5MB function body limit.
// Without a database (local dev): the data/ folder. Keys look like "uploads/<uuid>.pdf", "media/<uuid>.webp".
// ponytail: files in Postgres (Supabase free tier = 500MB in total); move to a storage bucket when artwork volume grows.
export const PART = 3 * 1024 * 1024;
const DATA = path.join(process.cwd(), "data");
const local = (key: string) => {
  const p = path.join(DATA, key);
  if (!p.startsWith(DATA + path.sep)) throw new Error("bad key"); // no path traversal
  return p;
};

/** The file's parts in order (stream them for big files). Empty when the file doesn't exist. */
export async function* parts(key: string): AsyncGenerator<Buffer> {
  if (!HAS_DB) { const b = await readFile(local(key)).catch(() => null); if (b) yield b; return; }
  const sql = await db();
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from files where key = ${key}`;
  for (let i = 0; i < n; i++) {
    const [r] = await sql<{ data: Buffer }[]>`select data from files where key = ${key} and part = ${i}`;
    if (!r) return;
    yield r.data;
  }
}

export async function read(key: string): Promise<Buffer | null> {
  const out: Buffer[] = [];
  for await (const p of parts(key)) out.push(p);
  return out.length ? Buffer.concat(out) : null;
}

/** One part of a file. Insert-only: an existing part is never overwritten (throws). */
export async function writePart(key: string, part: number, body: Buffer, contentType?: string) {
  if (!HAS_DB) {
    await mkdir(path.dirname(local(key)), { recursive: true });
    return part === 0 ? writeFile(local(key), body, { flag: "wx" }) : appendFile(local(key), body); // ponytail: parts arrive in order
  }
  const sql = await db();
  await sql`insert into files (key, part, content_type, data) values (${key}, ${part}, ${contentType ?? null}, ${body})`;
}

/** Whole file. `create: true` fails if it exists (never silently overwrite an upload). */
export async function write(key: string, body: Buffer, opts: { contentType?: string; create?: boolean } = {}) {
  if (!opts.create && !HAS_DB) { await mkdir(path.dirname(local(key)), { recursive: true }); return writeFile(local(key), body); }
  if (!opts.create) { const sql = await db(); await sql`delete from files where key = ${key}`; }
  for (let i = 0; i * PART < body.length || i === 0; i++) await writePart(key, i, body.subarray(i * PART, (i + 1) * PART), opts.contentType);
}
