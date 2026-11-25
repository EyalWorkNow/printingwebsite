import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db, HAS_DB } from "./db";
import { byName, DB_URL } from "./env";

// Admin login (HTTP Basic). Accepted credentials: ADMIN_USER/ADMIN_PASSWORD env vars, and/or the login saved in the
// database at /admin/setup (scrypt hash in table settings). /admin/setup proves ownership with a secret the owner can
// read in Supabase/Vercel (service-role key or database password) — so the owner can set or reset the login without env vars.
// ponytail: single shared admin login; per-user accounts when there's more than one operator
type Stored = { user: string; salt: string; hash: string };
const g = globalThis as unknown as { __dfusAdmin?: { at: number; v: Promise<Stored | null> }; __dfusAdminOk?: Set<string> };
const sha = (s: string) => createHash("sha256").update(s).digest();
const same = (x: string, y: string) => timingSafeEqual(sha(x), sha(y));
const scrypt = (pw: string, salt: string) => scryptSync(pw, salt, 32).toString("hex");
const envPw = () => { const pw = process.env.ADMIN_PASSWORD; return pw && pw.length >= 8 ? pw : undefined; };

function stored(): Promise<Stored | null> {
  if (!HAS_DB) return Promise.resolve(null);
  if (!g.__dfusAdmin || Date.now() - g.__dfusAdmin.at > 30_000) {
    const v = db().then((sql) => sql<{ value: Stored }[]>`select value from settings where key = 'admin'`).then((r) => r[0]?.value ?? null).catch(() => null);
    g.__dfusAdmin = { at: Date.now(), v };
  }
  return g.__dfusAdmin.v;
}

export const adminConfigured = async () => !!envPw() || !!(await stored());

export async function isAdmin(authorization: string | null): Promise<boolean> {
  if (!authorization?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(authorization.slice(6), "base64").toString();
  const i = decoded.indexOf(":");
  if (i < 0) return false;
  const user = decoded.slice(0, i), pw = decoded.slice(i + 1);
  const e = envPw();
  if (e) { const u = same(user, process.env.ADMIN_USER ?? "admin"), p = same(pw, e); if (u && p) return true; } // always compare both
  const s = await stored();
  if (!s) return false;
  const ok = (g.__dfusAdminOk ??= new Set()), k = `${s.hash}|${authorization}`; // scrypt is slow on purpose: verify once per instance
  if (ok.has(k)) return true;
  const u = same(user, s.user), p = same(scrypt(pw, s.salt), s.hash);
  if (u && p) { if (ok.size > 50) ok.clear(); ok.add(k); }
  return u && p;
}

/** Secrets only the owner can read (Supabase dashboard / Vercel Storage), present in the server's env. */
function ownerCodes(): string[] {
  let dbPw = "";
  try { dbPw = decodeURIComponent(new URL(DB_URL ?? "").password); } catch {}
  return [byName(/(^|_)SUPABASE_SERVICE_ROLE_KEY$/), byName(/(^|_)SUPABASE_SECRET_KEY$/), byName(/(^|_)POSTGRES_PASSWORD$/), process.env.ADMIN_SETUP_CODE, dbPw]
    .filter((c): c is string => !!c && c.length >= 8);
}

export type SetupError = "noDb" | "badCode" | "badUser" | "weak" | "mismatch";

export async function saveAdmin(code: string, user: string, pw: string, pw2: string): Promise<SetupError | null> {
  if (!HAS_DB) return "noDb";
  const codes = ownerCodes();
  if (!codes.length || !codes.map((c) => same(code.trim(), c)).includes(true)) return "badCode";
  if (!/^[^:\s]{2,40}$/.test(user)) return "badUser";
  if (pw.length < 10) return "weak";
  if (pw !== pw2) return "mismatch";
  const salt = randomBytes(16).toString("hex");
  const value: Stored = { user, salt, hash: scrypt(pw, salt) };
  const sql = await db();
  await sql`insert into settings (key, value) values ('admin', ${sql.json(value)}) on conflict (key) do update set value = excluded.value`;
  g.__dfusAdmin = undefined;
  g.__dfusAdminOk?.clear();
  return null;
}
