import { connection } from "next/server";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { adminI18n } from "@/i18n/admin/server";
import { fill } from "@/lib/catalog";
import { SetupForm } from "@/components/admin/setup-form";

// A signed-in account that isn't an admin lands here (proxy). Admins go straight to the dashboard.
export default async function AdminSetup() {
  await connection();
  const u = await currentUser();
  if (!u) redirect("/account?next=/admin/setup");
  if (u.isAdmin) redirect("/admin");
  const T = (await adminI18n()).t.setup;
  return (
    <main className="mx-auto max-w-md space-y-5 px-4 py-12">
      <h1 className="text-2xl font-bold">{T.title}</h1>
      <p className="text-sm text-muted-foreground">{fill(T.intro, { email: u.email })}</p>
      <SetupForm />
    </main>
  );
}
