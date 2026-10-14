import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { ConsentBanner } from "@/components/store/consent-banner";
import { PageViewTracker } from "@/components/store/page-view-tracker";
import { SmoothScroll } from "@/components/store/smooth-scroll";
import { MotionProvider } from "@/components/store/motion";
import { listCategories } from "@/lib/data";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const categories = await listCategories();
  return (
    <MotionProvider>
      <div className="drape-backdrop" aria-hidden />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-black">
        Skip to content
      </a>
      <Header categories={categories} />
      <main id="main">{children}</main>
      <Footer categories={categories} />
      <ConsentBanner />
      <PageViewTracker />
      <SmoothScroll />
    </MotionProvider>
  );
}
