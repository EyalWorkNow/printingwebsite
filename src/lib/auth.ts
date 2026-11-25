import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { db, HAS_DB } from "./db";
import { byName, DB_URL } from "./env";

// Customer accounts + admin access (one login for both: an account with is_admin opens /admin).
// Passwords: scrypt + per-user salt. Sessions: random token in an httpOnly cookie, only its sha256 is stored (table sessions).
// Brute force: 10 wrong passwords lock the account for 15 minutes.
// ponytail: no email verification — orders are linked by account id only (never by email), so an unverified email can't
// expose someone else's orders. Add verification when accounts get more powers than "my own orders".
export const SESSION_COOKIE = "dfus_session";
const DAYS = 30;
export const PW_MIN = 8;

export type Profile = { address?: string; city?: string; zip?: string; business?: string; businessId?: string };
export type User = { id: string; email: string; name: string; phone: string; isAdmin: boolean; lang: string; profile: Profile; createdAt: string };
export type AuthError = "noDb" | "email" | "password" | "name" | "taken" | "invalid" | "locked" | "expired" | "badCode" | "wrongPassword";
type Row = { id: string; email: string; name: string; phone: string | null; is_admin: boolean; lang: string; profile: Profile | null; created_at: Date; salt: string; hash: string; failed_logins: number; locked_until: Date | null };

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const scrypt = (pw: string, salt: string) => scryptSync(pw, salt, 32).toString("hex");
const same = (a: string, b: string) => timingSafeEqual(Buffer.from(sha(a)), Buffer.from(sha(b)));
const toUser = (r: Row): User => ({ id: r.id, email: r.email, name: r.name, phone: r.phone ?? "", isAdmin: r.is_admin, lang: r.lang, profile: r.profile ?? {}, createdAt: new Date(r.created_at).toISOString() });
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const normEmail = (e: unknown) => str(e).toLowerCase();
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const secret = (pw: string) => { const salt = randomBytes(16).toString("hex"); return { salt, hash: scrypt(pw, salt) }; };
const DUMMY = secret("dummy-password"); // equal timing whether or not the email exists

async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const sql = await db();
  await sql`insert into sessions (token_hash, user_id, expires_at) values (${sha(token)}, ${userId}, now() + make_interval(days => ${DAYS}))`;
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: DAYS * 86400 });
}

/** The account behind a session token (or null). Used by currentUser and by the proxy (admin check). */
export async function userByToken(token: string | undefined): Promise<User | null> {
  if (!HAS_DB || !token || token.length > 100) return null;
  const sql = await db();
  const [r] = await sql<Row[]>`select u.* from sessions s join users u on u.id = s.user_id where s.token_hash = ${sha(token)} and s.expires_at > now()`;
  return r ? toUser(r) : null;
}

/** Signed-in account for this request (Server Components, actions, route handlers). */
export const currentUser = cache(async () => userByToken((await cookies()).get(SESSION_COOKIE)?.value));
export const isAdmin = async () => !!(await currentUser())?.isAdmin;

export async function register(input: { email: unknown; password: unknown; name: unknown; phone?: unknown; lang?: string }): Promise<AuthError | null> {
  if (!HAS_DB) return "noDb";
  const email = normEmail(input.email), name = str(input.name, 100), phone = str(input.phone, 24), pw = typeof input.password === "string" ? input.password : "";
  if (!validEmail(email)) return "email";
  if (name.length < 2) return "name";
  if (pw.length < PW_MIN || pw.length > 200) return "password";
  const id = randomUUID(), s = secret(pw), sql = await db();
  const r = await sql`insert into users (id, email, name, phone, lang, salt, hash) values (${id}, ${email}, ${name}, ${phone || null}, ${input.lang ?? "he"}, ${s.salt}, ${s.hash})
    on conflict (email) do nothing`;
  if (!r.count) return "taken";
  await startSession(id);
  return null;
}

export async function login(emailIn: unknown, pwIn: unknown): Promise<AuthError | null> {
  if (!HAS_DB) return "noDb";
  const email = normEmail(emailIn), pw = typeof pwIn === "string" ? pwIn : "";
  const sql = await db();
  const [r] = await sql<Row[]>`select * from users where email = ${email}`;
  if (r?.locked_until && r.locked_until > new Date()) return "locked";
  const ok = same(scrypt(pw, r?.salt ?? DUMMY.salt), r?.hash ?? DUMMY.hash) && !!r;
  if (!ok) {
    if (r) await sql`update users set failed_logins = case when failed_logins >= 9 then 0 else failed_logins + 1 end,
      locked_until = case when failed_logins >= 9 then now() + interval '15 minutes' else locked_until end where id = ${r.id}`;
    return "invalid";
  }
  await sql`update users set failed_logins = 0, locked_until = null where id = ${r.id}`;
  await startSession(r.id);
  return null;
}

export async function logout() {
  const jar = await cookies(), token = jar.get(SESSION_COOKIE)?.value;
  if (token && HAS_DB) { const sql = await db(); await sql`delete from sessions where token_hash = ${sha(token)}`; }
  jar.delete(SESSION_COOKIE);
}

export async function updateProfile(u: User, input: { name: unknown; phone: unknown; email: unknown; profile: Record<string, unknown> }): Promise<AuthError | null> {
  const name = str(input.name, 100), email = normEmail(input.email);
  if (name.length < 2) return "name";
  if (!validEmail(email)) return "email";
  const p = input.profile ?? {};
  const profile: Profile = { address: str(p.address), city: str(p.city, 60), zip: str(p.zip, 12), business: str(p.business, 100), businessId: str(p.businessId, 20) };
  const sql = await db();
  const r = await sql`update users set name = ${name}, phone = ${str(input.phone, 24) || null}, email = ${email}, profile = ${sql.json(profile)} where id = ${u.id}`.catch(() => null);
  return r ? null : "taken"; // unique email
}

export async function changePassword(u: User, current: unknown, next: unknown): Promise<AuthError | null> {
  const pw = typeof next === "string" ? next : "";
  if (pw.length < PW_MIN || pw.length > 200) return "password";
  const sql = await db();
  const [r] = await sql<Row[]>`select * from users where id = ${u.id}`;
  if (!r || !same(scrypt(typeof current === "string" ? current : "", r.salt), r.hash)) return "wrongPassword";
  const s = secret(pw);
  await sql`update users set salt = ${s.salt}, hash = ${s.hash} where id = ${u.id}`;
  await sql`delete from sessions where user_id = ${u.id}`; // sign out everywhere else
  await startSession(u.id);
  return null;
}

/** Deletes the account. Its orders stay with the business (needed for invoices) but are unlinked from it. */
export async function deleteAccount(u: User, password: unknown): Promise<AuthError | null> {
  const sql = await db();
  const [r] = await sql<Row[]>`select * from users where id = ${u.id}`;
  if (!r || !same(scrypt(typeof password === "string" ? password : "", r.salt), r.hash)) return "wrongPassword";
  await sql`update orders set user_id = null where user_id = ${u.id}`;
  await sql`delete from users where id = ${u.id}`;
  (await cookies()).delete(SESSION_COOKIE);
  return null;
}

/** Creates a one-hour reset token and returns it with the account (caller emails the link). Null for an unknown email. */
export async function createReset(emailIn: unknown): Promise<{ token: string; user: User } | null> {
  if (!HAS_DB) return null;
  const sql = await db();
  const [r] = await sql<Row[]>`select * from users where email = ${normEmail(emailIn)}`;
  if (!r) return null;
  const token = randomBytes(32).toString("base64url");
  await sql`delete from password_resets where user_id = ${r.id} or expires_at < now()`;
  await sql`insert into password_resets (token_hash, user_id, expires_at) values (${sha(token)}, ${r.id}, now() + interval '1 hour')`;
  return { token, user: toUser(r) };
}

export async function resetPassword(token: unknown, next: unknown): Promise<AuthError | null> {
  const pw = typeof next === "string" ? next : "";
  if (pw.length < PW_MIN || pw.length > 200) return "password";
  if (typeof token !== "string" || !HAS_DB) return "expired";
  const sql = await db();
  const [r] = await sql<{ user_id: string }[]>`delete from password_resets where token_hash = ${sha(token)} and expires_at > now() returning user_id`;
  if (!r) return "expired";
  const s = secret(pw);
  await sql`update users set salt = ${s.salt}, hash = ${s.hash}, failed_logins = 0, locked_until = null where id = ${r.user_id}`;
  await sql`delete from sessions where user_id = ${r.user_id}`;
  await startSession(r.user_id);
  return null;
}

// ---- admin ----

/** Secrets only the owner can read (Supabase dashboard / Vercel Storage), present in the server's env. */
function ownerCodes(): string[] {
  let dbPw = "";
  try { dbPw = decodeURIComponent(new URL(DB_URL ?? "").password); } catch {}
  return [byName(/(^|_)SUPABASE_SERVICE_ROLE_KEY$/), byName(/(^|_)SUPABASE_SECRET_KEY$/), byName(/(^|_)POSTGRES_PASSWORD$/), process.env.ADMIN_SETUP_CODE, dbPw]
    .filter((c): c is string => !!c && c.length >= 8);
}

/** Makes the signed-in account an admin, proven by an owner secret (first admin; later admins are added in /admin/customers). */
export async function claimAdmin(u: User, code: unknown): Promise<AuthError | null> {
  const c = typeof code === "string" ? code.trim() : "";
  if (!ownerCodes().map((x) => same(c, x)).includes(true)) return "badCode";
  const sql = await db();
  await sql`update users set is_admin = true where id = ${u.id}`;
  return null;
}

export async function listUsers(q?: string) {
  const sql = await db();
  const like = q?.trim() ? `%${q.trim().replace(/[\\%_]/g, (c) => "\\" + c)}%` : undefined;
  const rows = await sql<(Row & { orders: number })[]>`
    select u.*, (select count(*)::int from orders o where o.user_id = u.id) as orders from users u
    ${like ? sql`where u.email ilike ${like} or u.name ilike ${like} or coalesce(u.phone, '') ilike ${like}` : sql``}
    order by u.created_at desc limit 500`;
  return rows.map((r) => ({ ...toUser(r), orders: r.orders }));
}

export async function setAdmin(id: string, on: boolean) {
  const sql = await db();
  await sql`update users set is_admin = ${on} where id = ${id}`;
  if (!on) await sql`delete from sessions where user_id = ${id}`; // revoked admin is signed out immediately
}

export async function adminCount(): Promise<number> {
  if (!HAS_DB) return 0;
  const sql = await db();
  const [r] = await sql<{ n: number }[]>`select count(*)::int as n from users where is_admin`;
  return r.n;
}
