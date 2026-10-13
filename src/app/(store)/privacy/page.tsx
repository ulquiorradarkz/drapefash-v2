import type { Metadata } from "next";
import { CONTACT_EMAIL, LegalPage, LEGAL_UPDATED } from "@/components/store/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Drape collects, why, and your rights under GDPR and US privacy laws.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lead="Drape collects as little as possible. This page explains what that means." updated={LEGAL_UPDATED}>
      <h2>Who we are</h2>
      <p>
        Drape is an affiliate fashion catalog. The data controller can be reached at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
      <h2>No accounts, no checkout</h2>
      <p>You can&apos;t create an account or pay on Drape, so we never collect your name, address or card details.</p>
      <h2>Anonymous statistics (only with your consent)</h2>
      <p>If you click &quot;Accept analytics&quot; in the cookie banner, we record each page view with:</p>
      <ul>
        <li>the page path (for example /product/silver-puffer)</li>
        <li>your country, as a two-letter code supplied by our hosting provider</li>
        <li>your device type (mobile, tablet or desktop)</li>
        <li>the website you came from (domain only)</li>
      </ul>
      <p>
        We do <strong>not</strong> store IP addresses, we don&apos;t set analytics cookies, and we don&apos;t build profiles or track you across
        websites. Legal basis: your consent (GDPR Art. 6(1)(a)). You can withdraw it at any time with &quot;Cookie settings&quot; in the footer.
      </p>
      <h2>Shop Now clicks</h2>
      <p>
        When you press Shop Now we count the click to know which pieces are popular and to reconcile affiliate commissions. The count stores the
        product, time, country code, device type, the referring domain and any campaign tag in the link (utm_source / utm_medium / utm_campaign).
        No IP address or identifier is stored, so this data is not linked to you. Legal basis: our legitimate interest in running the catalog (GDPR
        Art. 6(1)(f)).
      </p>
      <h2>Retailer sites</h2>
      <p>
        When you follow a shop link, the retailer and its affiliate network may set their own cookies to attribute the sale. Their privacy policies
        apply on their sites.
      </p>
      <h2>Service providers</h2>
      <ul>
        <li>Vercel (hosting): processes requests to deliver the site.</li>
        <li>Supabase (database, EU region): stores the catalog and the anonymous counts above.</li>
      </ul>
      <p>Fonts are self-hosted, so no request goes to Google Fonts.</p>
      <h2>Retention</h2>
      <p>Anonymous page-view and click counts are kept for up to 24 months, then deleted.</p>
      <h2>Your rights</h2>
      <p>
        Under the GDPR and UK GDPR you can ask for access, correction, deletion, restriction or objection, and complain to your data protection
        authority. California residents have similar rights under the CCPA/CPRA; we do not sell or share personal information. Because we hold no
        identifiers, we usually cannot link any record to you, but write to us and we will help.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about privacy? Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we&apos;ll reply within 30 days.
      </p>
    </LegalPage>
  );
}
