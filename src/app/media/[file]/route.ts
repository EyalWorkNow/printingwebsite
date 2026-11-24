import { read } from "@/lib/storage";

// Public product photos uploaded in the admin (files are immutable: new upload = new uuid name).
export async function GET(_req: Request, ctx: RouteContext<"/media/[file]">) {
  const { file } = await ctx.params;
  if (!/^[0-9a-f-]{36}\.webp$/.test(file)) return new Response(null, { status: 404 });
  const buf = await read(`media/${file}`);
  if (!buf) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
