import { DatabaseZap, Loader2 } from "lucide-react";
import { adminI18n } from "@/i18n/admin/server";

export const Spinner = () => <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />;

/** Shown instead of admin data when no business database is connected. */
export async function NoDb() {
  const { t } = await adminI18n();
  return <p className="flex items-start gap-3 rounded-2xl border border-amber-500/50 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-300" role="alert"><DatabaseZap className="h-5 w-5 shrink-0" />{t.noDb}</p>;
}
