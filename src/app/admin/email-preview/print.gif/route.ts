import { isAdmin } from "@/lib/auth";
import { printGif } from "@/lib/email-art";

export async function GET() {
  if (!await isAdmin()) return new Response(null, { status: 401 });
  return new Response(new Uint8Array(await printGif()), { headers: { "Content-Type": "image/gif", "Cache-Control": "private, max-age=3600" } });
}
