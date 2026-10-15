import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, matchLocale } from "@/i18n/config";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "ahmedqlila99@gmail.com").trim().toLowerCase();

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin")) {
    return adminGate(request);
  }
  return storefront(request);
}

/**
 * Every storefront page lives under a language prefix (/en, /ar, ...).
 * Paths without one are sent to the visitor's saved language, then their browser language, then English.
 */
function storefront(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1];

  if (isLocale(first)) return NextResponse.next();

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved) ? saved : matchLocale(request.headers.get("accept-language")) || DEFAULT_LOCALE;
  // Old single-language addresses keep working: /search?q=x -> /en/shop?q=x, /product/x -> /en/product/x.
  const rest = pathname === "/" ? "" : pathname === "/search" ? "/shop" : pathname;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${rest}`;
  url.search = search;
  const res = NextResponse.redirect(url, 307);
  res.headers.set("Vary", "Cookie, Accept-Language");
  return res;
}

async function adminGate(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/admin");
  const isLogin = pathname === "/admin/login";

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (isLogin) return response;
    return isApi
      ? NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })
      : NextResponse.redirect(new URL("/admin/login?error=config", request.url));
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refreshes the session cookie if needed and validates the JWT with Supabase Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = !!user?.email && user.email.toLowerCase() === ADMIN_EMAIL;

  if (isLogin) {
    if (isAdmin) return NextResponse.redirect(new URL("/admin", request.url));
    return response;
  }

  if (!isAdmin) {
    if (isApi) {
      return NextResponse.json({ error: user ? "Forbidden" : "Unauthorized" }, { status: user ? 403 : 401 });
    }
    const login = new URL("/admin/login", request.url);
    if (user) login.searchParams.set("error", "forbidden");
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  // Everything except Next internals, API routes (admin APIs are matched separately), the
  // click redirect, auth callbacks and files with an extension (images, robots.txt, sitemap.xml...).
  matcher: ["/((?!_next/|api/|go/|auth/|.*\\.[a-zA-Z0-9]+$).*)", "/api/admin/:path*"],
};
