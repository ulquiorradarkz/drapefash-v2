import type { Metadata } from "next";
import Image from "next/image";
import { NotFoundText, type NotFoundStrings } from "@/components/store/not-found-text";
import { LOCALES, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";

// The localized title comes from the page that called notFound() (see [...rest]/page.tsx).
export const metadata: Metadata = { robots: { index: false } };

/** Static on purpose: the 404 sits inside every page's tree, so it must not read the request. */
export default function NotFound() {
  const strings = Object.fromEntries(
    LOCALES.map((l) => {
      const { notFound, idSearch } = getDictionary(l);
      return [l, { notFound, idSearch }];
    }),
  ) as Record<Locale, NotFoundStrings>;
  return (
    <div className="page-x page-max relative grid min-h-[78svh] items-center gap-12 py-20 lg:grid-cols-12">
      <NotFoundText strings={strings} />
      <div aria-hidden className="street relative mx-auto aspect-[4/5] w-full max-w-[460px] overflow-hidden bg-paper-2 lg:col-span-4 lg:col-start-9">
        <Image src="/street/street-alley.jpg" alt="" fill sizes="(max-width: 1024px) 80vw, 30vw" className="object-cover object-[30%_50%]" />
      </div>
    </div>
  );
}
