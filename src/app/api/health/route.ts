import { connection } from "next/server";
import { db, HAS_DB } from "@/lib/db";
import { adminConfigured } from "@/lib/admin-auth";
import { SITE_URL } from "@/lib/env";

// Setup check for the owner: which services are connected and actually answering. Booleans/status words only — no values.
export async function GET() {
  await connection();
  const check = async (on: boolean, fn: () => Promise<unknown>) => {
    if (!on) return "missing";
    try { await fn(); return "ok"; } catch (e) { return `error: ${String((e as { code?: string }).code ?? (e as Error).message).replace(/\S+@\S+|postgres(ql)?:\/\/\S+/g, "…").slice(0, 120)}`; }
  };
  const key = process.env.AI_API_KEY?.trim();
  const [database, files, ai] = await Promise.all([
    check(HAS_DB, async () => { const sql = await db(); await sql`select 1`; }),
    check(HAS_DB, async () => { const sql = await db(); await sql`select 1 from files limit 1`; }), // customer files are stored in the database
    check(!!key, async () => {
      const r = await fetch(`${process.env.AI_BASE_URL ?? "https://api.deepseek.com"}/models`, { headers: { Authorization: `Bearer ${key}` } });
      if (!r.ok) throw new Error(`AI provider HTTP ${r.status}`);
    }),
  ]);
  const set = (k: string) => (process.env[k] ? "set" : "missing");
  return Response.json({
    database, files, ai, email: set("SMTP_URL"), notify: set("NOTIFY_EMAIL"),
    siteUrl: process.env.SITE_URL ? "set" : SITE_URL.startsWith("https://") ? "auto" : "missing",
    admin: (await adminConfigured()) ? "set" : "missing — open /admin/setup",
  }, { headers: { "Cache-Control": "no-store" } });
}
