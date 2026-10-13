import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative grid min-h-dvh place-items-center px-4 text-center">
      <div className="drape-backdrop" aria-hidden />
      <div>
        <p className="chrome-wordmark text-[clamp(6rem,30vw,14rem)]" data-text="404">
          404
        </p>
        <h1 className="mt-4 text-xl font-semibold">This piece has left the rack.</h1>
        <p className="mt-2 text-white/60">The page you were looking for doesn&apos;t exist or is no longer available.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="btn-chrome h-11 px-6 text-sm">
            Back to Drape
          </Link>
          <Link href="/search" className="btn-ghost-chrome h-11 px-6 text-sm">
            Search
          </Link>
        </div>
      </div>
    </main>
  );
}
