import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";

// 1. /admin + /api/admin: HTTP Basic auth.
// 2. Shop: Hebrew lives at the root — "/p/mug" is served by app/[lang] with lang=he (internal rewrite), and "/he/…"
//    redirects to the clean URL. Other languages have their own prefix ("/en/p/mug") and pass through untouched.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (isAdmin(req.headers.get("authorization"))) return NextResponse.next();
    return new NextResponse("נדרשת התחברות", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="dfus-admin", charset="UTF-8"' } });
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
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*", "/((?!api|_next|media|.*\\..*).*)"] };
