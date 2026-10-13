import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 4_000_000;
const MAX_REDIRECTS = 6;

export class FetchError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  const v = ip.toLowerCase();
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:127.") || v.startsWith("::ffff:10.") || v.startsWith("::ffff:192.168.");
}

/** Blocks requests to localhost / private networks (SSRF protection). */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchError("That doesn't look like a valid link.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new FetchError("Only http(s) links are supported.");
  const host = url.hostname;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new FetchError("That address is not allowed.");
  }
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addresses.length) throw new FetchError(`Could not resolve ${host}.`);
  if (addresses.some((a) => isPrivateIp(a.address))) throw new FetchError("That address is not allowed.");
  return url;
}

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

/** Base site (last two host labels) so cookies set by login.aliexpress.us are sent back to www.aliexpress.us. */
function siteOf(host: string): string {
  return host.split(".").slice(-2).join(".");
}

/**
 * Plain server-side GET following redirects manually (each hop re-validated), keeping cookies across
 * hops like a normal browser does. No headless browser, no challenge solving: if the store blocks us we report it.
 */
export async function fetchPage(raw: string, timeoutMs = 12_000): Promise<{ url: string; html: string; status: number }> {
  let current = raw;
  const jar = new Map<string, Map<string, string>>();
  for (let hop = 0; hop <= MAX_REDIRECTS + 2; hop++) {
    const url = await assertPublicUrl(current);
    const cookies = jar.get(siteOf(url.hostname));
    const headers: Record<string, string> = { ...BROWSER_HEADERS };
    if (cookies?.size) headers.Cookie = Array.from(cookies, ([k, v]) => `${k}=${v}`).join("; ");
    let res: Response;
    try {
      res = await fetch(url, {
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    } catch (e) {
      const msg = e instanceof Error && e.name === "TimeoutError" ? "The store took too long to respond." : "Could not reach the store.";
      throw new FetchError(msg);
    }
    const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    if (setCookies.length) {
      const site = siteOf(url.hostname);
      const bag = jar.get(site) ?? new Map<string, string>();
      for (const sc of setCookies) {
        const [pair] = sc.split(";");
        const eq = pair.indexOf("=");
        if (eq > 0) bag.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
      jar.set(site, bag);
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new FetchError("Redirect without destination.", res.status);
      current = new URL(loc, url).toString();
      continue;
    }
    const reader = res.body?.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > MAX_BYTES) {
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }
    const html = new TextDecoder("utf-8").decode(concat(chunks));
    return { url: url.toString(), html, status: res.status };
  }
  throw new FetchError("Too many redirects.");
}

/** Follows redirects without downloading bodies (used to expand short links). */
export async function resolveFinalUrl(raw: string): Promise<string> {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current);
    const res = await fetch(url, {
      method: "GET",
      headers: BROWSER_HEADERS,
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    }).catch(() => null);
    if (!res) return current;
    res.body?.cancel().catch(() => undefined);
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, url).toString();
      continue;
    }
    return url.toString();
  }
  return current;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}
