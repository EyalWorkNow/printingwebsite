// One-off: copy the old file storage (data/orders/*.json, data/catalog.json) into the business database.
//   DATABASE_URL=postgres://… node scripts/migrate-db.mjs        (reads .env.local when DATABASE_URL isn't set)
// Safe to re-run: existing order ids are skipped; the catalog is imported only when the database has none yet.
import { readdir, readFile } from "node:fs/promises";
import postgres from "postgres";

process.loadEnvFile?.(".env.local");
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require", onnotice: () => {} });

// same schema as src/lib/db.ts
await sql.unsafe(`
create table if not exists orders (id text primary key, created_at timestamptz not null, status text not null, source text not null,
  lang text not null default 'he', currency text not null default 'ILS', customer_name text not null, phone text not null,
  email text, city text, total numeric(14,4) not null, data jsonb not null);
create index if not exists orders_created_idx on orders (created_at desc);
create table if not exists catalog_versions (id bigserial primary key, saved_at timestamptz not null default now(), data jsonb not null);`);

let n = 0;
for (const f of (await readdir("data/orders").catch(() => [])).filter((f) => f.endsWith(".json"))) {
  const o = JSON.parse(await readFile(`data/orders/${f}`, "utf8"));
  const r = await sql`insert into orders ${sql({
    id: o.id, created_at: o.createdAt, status: o.status, source: o.source, lang: o.lang ?? "he", currency: o.currency ?? "ILS",
    customer_name: o.customer.name, phone: o.customer.phone, email: o.customer.email ?? null, city: o.customer.city ?? null,
    total: o.totals.total, data: sql.json(o),
  })} on conflict (id) do nothing`;
  n += r.count;
}
console.log(`orders imported: ${n}`);

const cat = await readFile("data/catalog.json", "utf8").catch(() => null);
const [{ c }] = await sql`select count(*)::int as c from catalog_versions`;
if (cat && !c) { await sql`insert into catalog_versions (data) values (${sql.json(JSON.parse(cat))})`; console.log("catalog imported"); }
else console.log(cat ? "catalog: database already has one — skipped" : "catalog: no saved catalog — built-in defaults stay");
await sql.end();
