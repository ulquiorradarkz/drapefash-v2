import "server-only";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { hasSupabase, isAdminEmail } from "@/lib/env";

export async function getAdmin(): Promise<{ user: User; supabase: SupabaseClient } | null> {
  if (!hasSupabase) return null;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return { user, supabase };
}

/** For admin pages (server components): redirect to login when not the admin. */
export async function requireAdminPage() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

type AdminApiResult =
  | { ok: true; user: User; supabase: SupabaseClient }
  | { ok: false; response: NextResponse };

/** For admin route handlers: second line of defence after middleware. */
export async function requireAdminApi(): Promise<AdminApiResult> {
  const admin = await getAdmin();
  if (!admin) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, ...admin };
}
