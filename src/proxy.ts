import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, userByToken } from "@/lib/auth";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";

// 1. /admin + /api/admin: only for a signed-in account with admin rights (lib/auth). Not signed in → the site's login page,
//    which comes back here. /admin/setup (turn your account into the first admin with an owner secret) needs a login only.
// 2. Shop: Hebrew lives at the root — "/p/mug" is served by app/[lang] with lang=he (internal rewrite), and "/he/…"
//    redirects to the clean URL. Other languages have their own prefix ("/en/p/mug") and pass through untouched.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const user = await userByToken(req.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
    if (user?.isAdmin || (user && pathname === "/admin/setup")) return NextResponse.next();
    if (pathname.startsWith("/api/")) return new NextResponse(null, { status: 401 });
    if (user) return NextResponse.redirect(new URL("/admin/setup", req.url)); // signed in, not an admin (yet)
    return NextResponse.redirect(new URL(`/account?next=${encodeURIComponent(pathname)}`, req.url));
  }
  const first = pathname.split("/")[1];
  if (first === DEFAULT_LOCALE) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(DEFAULT_LOCALE.length + 1) || "/";
    return NextResponse.redirect(url, 308);
  }
  if (isLocale(first)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

// everything except Next internals, API routes, uploaded media and static files (anything with an extension)
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*", "/((?!api|_next|media|__/|.*\\..*).*)"] };
