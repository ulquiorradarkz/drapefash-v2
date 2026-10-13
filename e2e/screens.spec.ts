import { test, type Page } from "@playwright/test";
import { loginAsAdmin, serviceClient } from "./helpers";

/** Full-page screenshots at 390px (mobile) and 1440px (desktop) for visual review. */
const WIDTHS = [
  { name: "390", width: 390, height: 844 },
  { name: "1440", width: 1440, height: 900 },
];

async function snap(page: Page, path: string, name: string) {
  await page.goto(path, { waitUntil: "networkidle" });
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

test("storefront and admin screenshots", async ({ browser, baseURL }) => {
  const { data } = await serviceClient().from("products").select("slug").eq("is_published", true).order("created_at", { ascending: false }).limit(1);
  const slug = data?.[0]?.slug;

  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w.width, height: w.height }, deviceScaleFactor: 1, hasTouch: w.width < 500, isMobile: w.width < 500 });
    // Pre-set consent so the banner doesn't cover every shot (it is captured once below).
    const page = await ctx.newPage();
    await snap(page, "/?hero=static", `store-home-banner-${w.name}`);
    await ctx.addCookies([{ name: "drape_consent", value: "denied", url: baseURL! }]);
    await snap(page, "/?hero=static", `store-home-${w.name}`);
    await snap(page, "/women", `store-women-${w.name}`);
    await snap(page, "/category/tops", `store-category-${w.name}`);
    await snap(page, "/search?q=puffer", `store-search-${w.name}`);
    await snap(page, "/privacy", `store-privacy-${w.name}`);
    if (slug) await snap(page, `/product/${slug}`, `store-product-${w.name}`);
    await snap(page, "/admin/login", `admin-login-${w.name}`);
    await loginAsAdmin(page, baseURL!);
    await snap(page, "/admin", `admin-overview-${w.name}`);
    await snap(page, "/admin/products", `admin-products-${w.name}`);
    await snap(page, "/admin/import", `admin-import-${w.name}`);
    await snap(page, "/admin/categories", `admin-categories-${w.name}`);
    await ctx.close();
  }
});
