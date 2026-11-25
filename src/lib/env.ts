// Connection settings, tolerant of Vercel Storage "custom prefix" names (e.g. SUPABASE_POSTGRES_URL, STORE_BLOB_READ_WRITE_TOKEN).
export const byName = (re: RegExp) => { const k = Object.keys(process.env).sort().find((k) => re.test(k) && process.env[k]); return k ? process.env[k] : undefined; };

/** Postgres URL: DATABASE_URL / POSTGRES_URL (pooled; Supabase + Neon integrations), with or without a prefix. */
export const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || byName(/(^|_)POSTGRES_URL$/) || byName(/(^|_)DATABASE_URL$/);
/** Public site address for links in emails, sitemap and metadata: SITE_URL when it's a valid address (https:// added if
 *  missing), else the Vercel production domain, else localhost. Never throws — a bad value must not break the build. */
export const SITE_URL = (() => {
  for (const v of [process.env.SITE_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]) {
    const t = v?.trim();
    if (!t) continue;
    try { return new URL(/^https?:\/\//.test(t) ? t : `https://${t}`).origin; } catch {}
  }
  return "http://localhost:3007";
})();
