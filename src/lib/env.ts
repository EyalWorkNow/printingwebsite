// Connection settings, tolerant of Vercel Storage "custom prefix" names (e.g. SUPABASE_POSTGRES_URL, STORE_BLOB_READ_WRITE_TOKEN).
const byName = (re: RegExp) => { const k = Object.keys(process.env).sort().find((k) => re.test(k) && process.env[k]); return k ? process.env[k] : undefined; };

/** Postgres URL: DATABASE_URL / POSTGRES_URL (pooled; Supabase + Neon integrations), with or without a prefix. */
export const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || byName(/(^|_)POSTGRES_URL$/) || byName(/(^|_)DATABASE_URL$/);
/** Vercel Blob read/write token, with or without a prefix. */
export const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || byName(/_BLOB_READ_WRITE_TOKEN$/);
