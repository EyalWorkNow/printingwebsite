import { currentUser } from "@/lib/auth";

// The signed-in account for client components (header button, checkout prefill). Null when signed out.
export async function GET() {
  const u = await currentUser().catch(() => null);
  const user = u && { name: u.name, email: u.email, phone: u.phone, profile: u.profile, isAdmin: u.isAdmin };
  return Response.json({ user }, { headers: { "Cache-Control": "private, no-store" } });
}
