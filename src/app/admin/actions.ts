"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { claimAdmin, currentUser, isAdmin, logout, setAdmin } from "@/lib/auth";
import { setStatus } from "@/lib/orders";

// actions are reachable outside the proxy matcher — every one re-verifies the account here
export async function updateStatus(form: FormData) {
  if (!await isAdmin()) throw new Error("unauthorized");
  await setStatus(String(form.get("id")), String(form.get("status")));
  refresh();
}

export async function adminLogout() {
  await logout();
  redirect("/account");
}

/** /admin/setup: the signed-in account becomes an admin, proven by an owner secret. */
export async function claimAdminAction(_: { ok?: boolean; error?: string } | null, f: FormData) {
  const u = await currentUser();
  if (!u) redirect("/account?next=/admin/setup");
  const error = await claimAdmin(u, f.get("code"));
  return error ? { error } : { ok: true };
}

export async function toggleAdmin(form: FormData) {
  const me = await currentUser();
  if (!me?.isAdmin) throw new Error("unauthorized");
  const id = String(form.get("id"));
  if (id === me.id) throw new Error("can't change your own role"); // never lock the last admin out by accident
  await setAdmin(id, form.get("on") === "1");
  refresh();
}
