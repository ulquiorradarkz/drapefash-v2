export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "ahmedqlila99@gmail.com").trim().toLowerCase();

export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && !explicit.includes("localhost")) return explicit.replace(/\/$/, "");
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return `https://${vercelProd}`;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return (explicit ?? "http://localhost:3000").replace(/\/$/, "");
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = "Drape";
export const SITE_TAGLINE = "Chrome-cut fashion finds from AliExpress, SHEIN and Bulchic";
export const DISCLOSURE =
  "We may earn a commission when you buy through our links, at no extra cost to you.";

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === ADMIN_EMAIL;
}
