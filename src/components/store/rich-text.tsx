import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { localePath, type Locale } from "@/i18n/config";

/**
 * Renders the small inline syntax used in translated copy:
 * [label](/path) -> localized link, **bold**, `code` (kept left-to-right), {email} -> mailto link.
 */
export function RichText({ text, locale, email }: { text: string; locale: Locale; email?: string }) {
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\{email\}/g;
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (let m = pattern.exec(text); m; m = pattern.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      const href = m[2].startsWith("/") ? localePath(locale, m[2]) : m[2];
      out.push(
        <Link key={key++} href={href}>
          {m[1]}
        </Link>,
      );
    } else if (m[3] !== undefined) {
      out.push(<strong key={key++}>{m[3]}</strong>);
    } else if (m[4] !== undefined) {
      out.push(
        <code key={key++} dir="ltr">
          {m[4]}
        </code>,
      );
    } else if (email) {
      out.push(
        <a key={key++} href={`mailto:${email}`}>
          <bdi dir="ltr">{email}</bdi>
        </a>,
      );
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return <Fragment>{out}</Fragment>;
}
