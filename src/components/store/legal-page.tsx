export function LegalPage({ title, lead, updated, children }: { title: string; lead?: string; updated?: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 pt-10 sm:px-6 sm:pt-16">
      <h1 className="chrome-text text-4xl font-black sm:text-5xl">{title}</h1>
      {lead && <p className="mt-4 text-lg leading-relaxed text-white/75">{lead}</p>}
      {updated && <p className="mt-2 text-xs text-white/40">Last updated: {updated}</p>}
      <div className="prose-drape glass chrome-border mt-8 rounded-3xl p-6 sm:p-8">{children}</div>
    </article>
  );
}

export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.ADMIN_EMAIL || "ahmedqlila99@gmail.com";
export const LEGAL_UPDATED = "October 13, 2026";
