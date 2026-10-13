import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";
import { ADMIN_EMAIL } from "@/lib/env";

export const metadata: Metadata = { title: "Admin login", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  forbidden: "This account is not allowed to access the Drape dashboard.",
  link: "That login link is invalid or has expired. Request a new one.",
  config: "Supabase is not configured on this deployment.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  const error = sp.error ? (ERRORS[sp.error] ?? "Login failed.") : null;
  const next = sp.next && sp.next.startsWith("/admin") ? sp.next : "/admin";
  return (
    <main className="relative grid min-h-dvh place-items-center px-4 py-12">
      <div className="drape-backdrop" aria-hidden />
      <div className="glass chrome-border w-full max-w-sm rounded-3xl p-7">
        <p className="chrome-wordmark text-5xl" data-text="Drape">
          Drape
        </p>
        <h1 className="mt-4 text-lg font-semibold">Dashboard sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Owner access only.</p>
        <LoginForm defaultEmail={ADMIN_EMAIL} next={next} initialError={error} />
      </div>
    </main>
  );
}
