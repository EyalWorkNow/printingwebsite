"use client";

import Link from "next/link";
import { CircleUser } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useMe } from "@/lib/account-client";

export function AccountButton() {
  const { d, href } = useI18n();
  const me = useMe();
  const label = me ? me.name.split(" ")[0] : d.nav.login;
  return (
    <Link href={href("/account")} aria-label={me ? d.nav.account : d.nav.login} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm text-foreground/80 hover:border-foreground/40 hover:text-foreground">
      <CircleUser className="h-4 w-4" /> <span className="hidden max-w-28 truncate sm:inline">{me === undefined ? d.nav.account : label}</span>
    </Link>
  );
}
