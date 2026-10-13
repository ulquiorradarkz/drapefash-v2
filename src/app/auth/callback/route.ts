import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
}

/** Handles both PKCE (?code=) and token-hash (?token_hash=&type=) magic links. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const next = safeNext(sp.get("next"));
  const supabase = await createServerSupabase();

  const code = sp.get("code");
  const tokenHash = sp.get("token_hash");
  const type = sp.get("type") as EmailOtpType | null;

  let error: string | null = null;
  if (code) {
    const res = await supabase.auth.exchangeCodeForSession(code);
    error = res.error?.message ?? null;
  } else if (tokenHash && type) {
    const res = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    error = res.error?.message ?? null;
  } else {
    error = "Missing login token";
  }

  if (error) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("error", "link");
    return NextResponse.redirect(url);
  }
  return NextResponse.redirect(new URL(next, request.url));
}
