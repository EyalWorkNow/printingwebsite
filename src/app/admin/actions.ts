"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { setStatus } from "@/lib/orders";

export async function updateStatus(form: FormData) {
  // actions are reachable outside the proxy matcher — re-verify here
  if (!await isAdmin((await headers()).get("authorization"))) throw new Error("unauthorized");
  await setStatus(String(form.get("id")), String(form.get("status")));
  refresh();
}
