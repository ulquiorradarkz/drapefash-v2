import { Star } from "@/components/store/collage";

/**
 * A harlequin band with the archive running through it: real item IDs and names of the newest pieces.
 * Decorative (the same pieces are listed properly below), so it is hidden from screen readers.
 */
export function IdMarquee({ items }: { items: { code: string | null; title: string }[] }) {
  const run = items.filter((i) => i.code).slice(0, 14);
  if (!run.length) return <div className="harlequin" aria-hidden />;
  const row = (copy: number) =>
    run.map((it, i) => (
      <span key={`${copy}-${i}`} className="flex shrink-0 items-center gap-5 pe-5">
        <span className="font-mono text-[15px] text-grey" dir="ltr">
          {it.code}
        </span>
        <bdi className="font-display text-[clamp(26px,2.6vw,40px)] leading-none">{it.title}</bdi>
        <Star className="size-4 text-grey" />
      </span>
    ));
  return (
    <div className="bg-ink text-paper-3" aria-hidden>
      <div className="harlequin" />
      <div className="marquee overflow-hidden py-4">
        <div className="marquee-track">
          {row(0)}
          {row(1)}
        </div>
      </div>
      <div className="harlequin" />
    </div>
  );
}
