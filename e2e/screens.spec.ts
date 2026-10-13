import { test, type Page } from "@playwright/test";
import { loginAsAdmin, serviceClient } from "./helpers";

/** Full-page screenshots at 390px (mobile) and 1440px (desktop) for visual review. */
const WIDTHS = [
  { name: "390", width: 390, height: 844 },
  { name: "1440", width: 1440, height: 900 },
];

test.setTimeout(400_000);

async function snap(page: Page, path: string, name: string) {
  await page.goto(path, { waitUntil: "load", timeout: 60_000 }).catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
  // Trigger lazy reveals, then return to top.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
}

for (const w of WIDTHS) {
  test(`screenshots @${w.name}px`, async ({ browser, baseURL }) => {
    const { data } = await serviceClient().from("products").select("slug").eq("is_published", true).order("created_at", { ascending: false }).limit(2);
    const slugs = (data ?? []).map((d) => d.slug);
    const mobile = w.width < 500;
    const ctx = await browser.newContext({ viewport: { width: w.width, height: w.height }, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile });
    const page = await ctx.newPage();
    await snap(page, "/?hero=static", `store-home-banner-${w.name}`);
    await ctx.addCookies([{ name: "drape_consent", value: "denied", url: baseURL! }]);
    await snap(page, "/?hero=static", `store-home-${w.name}`);
    await snap(page, "/women", `store-women-${w.name}`);
    await snap(page, "/category/outerwear", `store-category-${w.name}`);
    await snap(page, "/search?q=puffer", `store-search-${w.name}`);
    await snap(page, "/privacy", `store-privacy-${w.name}`);
    for (const [i, slug] of slugs.entries()) await snap(page, `/product/${slug}`, `store-product-${i + 1}-${w.name}`);
    await snap(page, "/admin/login", `admin-login-${w.name}`);
    await loginAsAdmin(page, baseURL!);
    await snap(page, "/admin", `admin-overview-${w.name}`);
    await snap(page, "/admin/products", `admin-products-${w.name}`);
    await snap(page, "/admin/import", `admin-import-${w.name}`);
    await snap(page, "/admin/categories", `admin-categories-${w.name}`);
    await ctx.close();
  });
}
