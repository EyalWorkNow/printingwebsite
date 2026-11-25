"use server";

import { saveAdmin, type SetupError } from "@/lib/admin-auth";

// Public on purpose (the proxy lets /admin/setup through): saveAdmin checks the owner secret first.
export async function setupAdmin(_: { ok?: boolean; error?: SetupError } | null, f: FormData) {
  const error = await saveAdmin(String(f.get("code") ?? ""), String(f.get("user") ?? "").trim(), String(f.get("password") ?? ""), String(f.get("confirm") ?? ""));
  return error ? { error } : { ok: true };
}
