import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | Drape admin" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdminPage();
  return (
    <div className="min-h-dvh bg-[#0a0a0f] md:grid md:grid-cols-[230px_1fr]">
      <AdminNav email={user.email ?? ""} />
      <main className="min-w-0 px-4 pb-16 pt-4 md:px-8 md:pt-8">{children}</main>
    </div>
  );
}
