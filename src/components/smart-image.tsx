import Image, { type ImageProps } from "next/image";

/** Hosts that next/image may optimize (must match images.remotePatterns in next.config.ts). */
const OPTIMIZABLE = [/\.supabase\.co$/i, /(^|\.)alicdn\.com$/i, /(^|\.)aliexpress-media\.com$/i, /(^|\.)ltwebstatic\.com$/i];

export function canOptimize(src: string): boolean {
  if (/\.svg(\?|$)/i.test(src)) return false;
  if (src.startsWith("/")) return true;
  try {
    const host = new URL(src).hostname;
    return OPTIMIZABLE.some((re) => re.test(host));
  } catch {
    return false;
  }
}

type Props = Omit<ImageProps, "src"> & { src: string };

export function SmartImage({ src, alt, unoptimized, ...props }: Props) {
  return <Image src={src} alt={alt} unoptimized={unoptimized ?? !canOptimize(src)} {...props} />;
}
