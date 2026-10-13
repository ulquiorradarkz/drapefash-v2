import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "ahmedqlila99@gmail.com").trim().toLowerCase();

export async function middleware(request: NextRequest) {
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
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
