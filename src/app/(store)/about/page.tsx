import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage } from "@/components/store/legal-page";

export const metadata: Metadata = {
  title: "About",
  description: "Drape is an independent edit of Y2K chrome and streetwear pieces from AliExpress, SHEIN and Bulchic.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <LegalPage title="About Drape" lead="Drape is an independent edit of Y2K streetwear: liquid chrome, frosted glass, mesh, platforms and everything that glows.">
      <h2>What we do</h2>
      <p>
        We search AliExpress, SHEIN and Bulchic for pieces that fit the look, then collect them here with honest notes. We don&apos;t make clothes
        and we don&apos;t hold stock.
      </p>
      <h2>How you buy</h2>
      <p>
        When you choose a piece, we send you to the retailer that sells it. You check out on their site, and they handle payment, shipping, sizing
        and returns.
      </p>
      <h2>How we&apos;re paid</h2>
      <p>
        Some links earn us a small commission when you buy. It never adds to your price, and it never decides what we feature. Read the full{" "}
        <Link href="/affiliate-disclosure">affiliate disclosure</Link>.
      </p>
      <h2>Prices</h2>
      <p>Prices are recorded when we add a piece and can change at any time. The retailer&apos;s page always shows the final price, sizes and stock.</p>
    </LegalPage>
  );
}
