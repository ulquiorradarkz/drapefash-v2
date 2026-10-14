import type { Metadata } from "next";
import { LegalPage, LEGAL_UPDATED } from "@/components/store/legal-page";
import { DISCLOSURE } from "@/lib/env";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description: "How Drape earns money through affiliate links.",
  alternates: { canonical: "/affiliate-disclosure" },
};

export default function DisclosurePage() {
  return (
    <LegalPage title="Affiliate Disclosure" lead={DISCLOSURE} updated={LEGAL_UPDATED}>
      <h2>Affiliate links</h2>
      <p>
        Every &quot;Shop Now&quot; button on Drape is an affiliate link. If you click one and buy something, the retailer or its affiliate network
        (for example the AliExpress Portals program or the SHEIN affiliate program) may pay us a commission.
      </p>
      <h2>Your price stays the same</h2>
      <p>The commission comes from the retailer&apos;s marketing budget. You pay the same price you would pay going to the store directly.</p>
      <h2>Editorial independence</h2>
      <p>Retailers cannot pay to appear on Drape. We choose pieces for how they look, then add an affiliate link afterwards.</p>
      <h2>Prices and stock</h2>
      <p>Prices shown here are a guide, recorded when we added the piece. The retailer&apos;s site always has the final price, sizes and availability.</p>
      <h2>Links marked as sponsored</h2>
      <p>
        Outbound shop links are tagged <code>rel=&quot;sponsored nofollow&quot;</code> so search engines know they are paid links. This disclosure is
        made in line with the US FTC Endorsement Guides and EU/UK consumer protection rules.
      </p>
    </LegalPage>
  );
}
