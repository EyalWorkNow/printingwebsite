import { timingSafeEqual } from "node:crypto";

// ponytail: single shared admin login via HTTP Basic; per-user accounts when there's more than one operator
const same = (x: string, y: string) => { const a = Buffer.from(x), b = Buffer.from(y); return a.length === b.length && timingSafeEqual(a, b); };

export function isAdmin(authorization: string | null): boolean {
  const user = process.env.ADMIN_USER ?? "admin", pw = process.env.ADMIN_PASSWORD;
  if (!pw || pw.length < 8 || !authorization?.startsWith("Basic ")) return false; // fail closed
  const decoded = Buffer.from(authorization.slice(6), "base64").toString();
  const i = decoded.indexOf(":");
  if (i < 0) return false;
  const okUser = same(decoded.slice(0, i), user), okPw = same(decoded.slice(i + 1), pw); // always compare both
  return okUser && okPw;
}
