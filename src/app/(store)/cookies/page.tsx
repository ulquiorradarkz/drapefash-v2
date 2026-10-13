import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage, LEGAL_UPDATED } from "@/components/store/legal-page";
import { CookieSettingsButton } from "@/components/store/consent-banner";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "The cookies and similar technologies used on Drape.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy" lead="Drape uses one cookie of its own. Here is what it does." updated={LEGAL_UPDATED}>
      <h2>Strictly necessary</h2>
      <ul>
        <li>
          <code>drape_consent</code>: remembers whether you accepted or rejected analytics. Kept for 6 months. It contains only
          &quot;granted&quot; or &quot;denied&quot;.
        </li>
      </ul>
      <h2>Analytics (optional)</h2>
      <p>
        We do not use analytics cookies. If you accept analytics, your browser sends an anonymous page-view count to our server (see the{" "}
        <Link href="/privacy">Privacy Policy</Link>). While you browse, campaign tags from the link you arrived on (utm_source etc.) are kept in this
        tab&apos;s session storage, and erased when you close the tab, so the Shop Now button can pass them on.
      </p>
      <h2>Retailer cookies</h2>
      <p>
        When you press Shop Now you leave Drape. The retailer (AliExpress, SHEIN, Bulchic…) and its affiliate network may set their own cookies to
        attribute the purchase. Those are governed by their own cookie policies.
      </p>
      <h2>Admin area</h2>
      <p>The private dashboard used by the site owner sets login cookies (Supabase Auth). Visitors never receive them.</p>
      <h2>Change your choice</h2>
      <p>
        <CookieSettingsButton className="btn-ghost-chrome h-10 px-5 text-sm" />
      </p>
    </LegalPage>
  );
}
