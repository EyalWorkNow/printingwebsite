"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Profile } from "./auth";

export type Me = { name: string; email: string; phone: string; profile: Profile; isAdmin: boolean } | null;

/** Tell useMe() the account changed (signed in/out, profile saved). */
export const authChanged = () => window.dispatchEvent(new Event("dfus:auth"));

/** The signed-in account (undefined while loading). Re-checked on navigation and after authChanged(). */
export function useMe(): Me | undefined {
  const path = usePathname();
  const [me, setMe] = useState<Me>();
  useEffect(() => {
    let live = true;
    const load = () => fetch("/api/me", { cache: "no-store" }).then((r) => r.json()).then((r) => live && setMe(r.user ?? null)).catch(() => live && setMe(null));
    load();
    window.addEventListener("dfus:auth", load);
    return () => { live = false; window.removeEventListener("dfus:auth", load); };
  }, [path]);
  return me;
}
