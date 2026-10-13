import { requireAdminPage } from "@/lib/auth";
import { PasswordForm } from "@/components/admin/password-form";
import { aliexpressKeysConfigured } from "@/lib/import/aliexpress-api";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const { user } = await requireAdminPage();
  const checks = [
    { label: "Supabase service role key (click & view logging)", ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
    { label: "AliExpress Affiliate API keys (optional)", ok: aliexpressKeysConfigured() },
    { label: "AliExpress tracking ID (optional)", ok: Boolean(process.env.ALIEXPRESS_TRACKING_ID) },
  ];
  return (
    <div className="max-w-xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
      </header>
      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <h2 className="font-semibold">Password</h2>
        <p className="text-sm text-muted-foreground">Set a password so you can sign in without waiting for a magic link email.</p>
        <PasswordForm email={user.email ?? ""} />
      </section>
      <section className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <h2 className="font-semibold">Configuration</h2>
        <ul className="space-y-1.5 text-sm">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2">
              <span className={c.ok ? "text-emerald-300" : "text-amber-300"}>{c.ok ? "✓" : "○"}</span>
              {c.label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
