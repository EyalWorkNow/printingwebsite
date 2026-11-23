import { timingSafeEqual } from "node:crypto";

// ponytail: single shared admin password via HTTP Basic; per-user accounts when there's more than one operator
export function isAdmin(authorization: string | null): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || pw.length < 8 || !authorization?.startsWith("Basic ")) return false; // fail closed
  const given = Buffer.from(authorization.slice(6), "base64").toString().split(":").slice(1).join(":");
  const a = Buffer.from(given), b = Buffer.from(pw);
  return a.length === b.length && timingSafeEqual(a, b);
}
