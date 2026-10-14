import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { SITE_URL } from "@/lib/env";
import { fontVariables } from "../fonts";
import "../globals.css";
import "../drape.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Dashboard", template: "%s | Drape admin" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#07080d",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

/** Root layout for the owner dashboard (separate from the storefront's per-language root layout). */
export default function AdminRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" className={`dark ${fontVariables}`} suppressHydrationWarning>
      <body className="bg-background font-sans text-foreground antialiased">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
