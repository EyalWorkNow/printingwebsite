import postgres from "postgres";

// The business database (Postgres — Neon via Vercel Storage in production, any Postgres locally).
// Orders + every saved version of the catalog live here; customer files/photos stay in file storage (Blob / data/).
// Vercel's Neon integration sets DATABASE_URL (or POSTGRES_URL); the schema is created on first use.
const URL = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
export const HAS_DB = !!URL;

const SCHEMA = `
create table if not exists orders (
  id text primary key,
  created_at timestamptz not null,
  status text not null,
  source text not null,
  lang text not null default 'he',
  currency text not null default 'ILS',
  customer_name text not null,
  phone text not null,
  email text,
  city text,
  total numeric(14,4) not null,
  data jsonb not null
);
create index if not exists orders_created_idx on orders (created_at desc);
create table if not exists catalog_versions (
  id bigserial primary key,
  saved_at timestamptz not null default now(),
  data jsonb not null
);`;

type Sql = ReturnType<typeof postgres>;
const g = globalThis as unknown as { __dfusSql?: Sql; __dfusReady?: Promise<unknown> };

/** Connected client with the schema in place. Throws a clear error when no database is configured. */
export async function db(): Promise<Sql> {
  if (!URL) throw new Error("DATABASE_URL is not set — connect a Postgres database (Vercel → Storage → Neon)");
  // one pool per server instance (and across dev hot reloads)
  g.__dfusSql ??= postgres(URL, { max: 5, idle_timeout: 20, ssl: /localhost|127\.0\.0\.1/.test(URL) ? false : "require", onnotice: () => {} });
  g.__dfusReady ??= g.__dfusSql.unsafe(SCHEMA).catch((e) => { g.__dfusReady = undefined; throw e; });
  await g.__dfusReady;
  return g.__dfusSql;
}
