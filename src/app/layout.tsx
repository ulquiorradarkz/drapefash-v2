import type { Metadata, Viewport } from "next";
import { Inter, Unbounded } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/env";
import "./globals.css";
import "./drape.css";

const display = Unbounded({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  display: "swap",
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}: chrome-cut fashion finds`,
    template: `%s | ${SITE_NAME}`,
  },
  description: `${SITE_TAGLINE}. Hand-picked Y2K and streetwear pieces for women and men.`,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: SITE_URL,
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#08080c",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${display.variable} ${body.variable}`} suppressHydrationWarning>
      <body className="bg-background font-sans text-foreground antialiased">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
