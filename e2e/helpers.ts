import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "ahmedqlila99@gmail.com").toLowerCase();

export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Run with --env-file / .env.local loaded (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Signs in as the admin with a one-time magic link generated server-side (no password involved). */
export async function loginAsAdmin(page: Page, baseURL: string) {
  const { data, error } = await serviceClient().auth.admin.generateLink({ type: "magiclink", email: ADMIN_EMAIL });
  if (error) throw error;
  const u = new URL("/auth/callback", baseURL);
  u.searchParams.set("token_hash", data.properties.hashed_token);
  u.searchParams.set("type", "magiclink");
  u.searchParams.set("next", "/admin");
  await page.goto(u.toString());
  await page.waitForURL(/\/admin(\?.*)?$/);
}

export async function shot(page: Page, name: string) {
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
}
