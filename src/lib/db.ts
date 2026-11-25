import postgres from "postgres";
import { DB_URL } from "./env";

// The business database (Postgres — Neon via Vercel Storage in production, any Postgres locally).
// Orders, every saved version of the catalog, customer files/product photos (table files, lib/storage) and customer/admin accounts (lib/auth) live here.
// Vercel's Neon integration sets DATABASE_URL (or POSTGRES_URL); the schema is created on first use.
// Query params are dropped (Supabase adds e.g. supa=…, which Postgres would reject as a setting); SSL is set below.
const URL_ = DB_URL && (() => { try { const u = new URL(DB_URL); u.search = ""; return u.toString(); } catch { return DB_URL; } })();
export const HAS_DB = !!URL_;

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
);
create table if not exists files (
  key text not null,
  part int not null,
  content_type text,
  data bytea not null,
  created_at timestamptz not null default now(),
  primary key (key, part)
);
create table if not exists users (
  id text primary key,
  email text not null unique,
  name text not null,
  phone text,
  salt text not null,
  hash text not null,
  is_admin boolean not null default false,
  lang text not null default 'he',
  profile jsonb not null default '{}',
  failed_logins int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists sessions (
  token_hash text primary key,
  user_id text not null references users (id) on delete cascade,
  expires_at timestamptz not null
);
create table if not exists password_resets (
  token_hash text primary key,
  user_id text not null references users (id) on delete cascade,
  expires_at timestamptz not null
);
alter table orders add column if not exists user_id text;
create index if not exists orders_user_idx on orders (user_id, created_at desc);`;

type Sql = ReturnType<typeof postgres>;
const g = globalThis as unknown as { __dfusSql?: Sql; __dfusReady?: Promise<unknown>; __dfusSchema?: string };

/** Connected client with the schema in place. Throws a clear error when no database is configured. */
export async function db(): Promise<Sql> {
  if (!URL_) throw new Error("DATABASE_URL is not set — connect a Postgres database (Vercel → Storage)");
  // one pool per server instance (and across dev hot reloads)
  // prepare: false — transaction-mode poolers (Supabase :6543, PgBouncer) don't support prepared statements
  // during `next build` every prerender worker opens its own pool: 1 connection each (7 workers × 5 could exhaust the pooler),
  // and a 10s connect timeout so a stuck connection fails fast (the shop falls back to the built-in catalog) instead of
  // hanging a page until the build times out
  const building = process.env.NEXT_PHASE === "phase-production-build";
  g.__dfusSql ??= postgres(URL_, { max: building ? 1 : 5, connect_timeout: 10, idle_timeout: 20, prepare: false, ssl: /localhost|127\.0\.0\.1/.test(URL_) ? false : "require", onnotice: () => {} });
  // the advisory lock serializes schema creation across processes (parallel build workers, cold starts):
  // concurrent "create table if not exists" otherwise races on pg_type
  const sql = g.__dfusSql;
  if (g.__dfusSchema !== SCHEMA) { g.__dfusSchema = SCHEMA; g.__dfusReady = undefined; } // schema edited during dev (hot reload): run it again
  g.__dfusReady ??= sql.begin(async (tx) => { await tx`select pg_advisory_xact_lock(724390125)`; await tx.unsafe(SCHEMA); })
    .catch((e) => { g.__dfusReady = undefined; throw e; });
  await g.__dfusReady;
  return g.__dfusSql;
}
