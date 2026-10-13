import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin, serviceClient, shot } from "./helpers";

/**
 * Full owner flow: login -> import an AliExpress link and a SHEIN link -> publish -> see them on the
 * storefront -> Shop Now -> verify the 302 to the affiliate link and the click in the dashboard.
 */

const RUN = Date.now().toString(36);
const ITEMS = [
  {
    store: "aliexpress",
    url: process.env.E2E_ALI_URL ?? "https://www.aliexpress.com/item/1005012744379501.html",
    affiliate: `https://www.aliexpress.com/item/1005012744379501.html?aff_fcid=drape-e2e-${RUN}`,
    fallbackPrice: "39.99",
  },
  {
    store: "shein",
    url: process.env.E2E_SHEIN_URL ?? "https://us.shein.com/Metallic-Puff-Sleeve-Self-Tie-Open-Back-Crop-Top-p-12291468-cat-1733.html",
    affiliate: `https://us.shein.com/Metallic-Puff-Sleeve-Self-Tie-Open-Back-Crop-Top-p-12291468-cat-1733.html?url_from=drape-e2e-${RUN}`,
    fallbackPrice: "21.29",
  },
] as const;

const published: { store: string; slug: string; title: string; affiliate: string; quality: string; method: string }[] = [];

async function importAndPublish(page: Page, item: (typeof ITEMS)[number]) {
  await page.goto("/admin/import");
  await page.locator("#import-url").fill(item.url);
  await page.locator("#import-affiliate").fill(item.affiliate);
  const resp = page.waitForResponse((r) => r.url().includes("/api/admin/import"));
  await page.getByRole("button", { name: /fetch details/i }).click();
  const json = await (await resp).json();
  console.log(`[import ${item.store}] quality=${json.quality} method=${json.method} title="${json.data.title}" price=${json.data.price} images=${json.data.images.length}`);
  console.log(`[import ${item.store}] message: ${json.message}`);
  const status = page.getByTestId("import-status");
  await expect(status).toBeVisible();
  await shot(page, `admin-import-${item.store}-result`);
  if (item.store === "aliexpress") {
    // AliExpress product pages expose title + photos server-side (price needs the API keys).
    expect(json.data.title.length).toBeGreaterThan(10);
    expect(json.data.images.length).toBeGreaterThan(0);
  }

  // The form is always shown and editable: complete anything the store didn't give us.
  const title = page.locator("#title");
  await expect(title).toBeVisible();
  if (!(await title.inputValue()).trim()) await title.fill(`Drape test ${item.store} ${RUN}`);
  const price = page.locator("#price");
  if (!(await price.inputValue()).trim()) await price.fill(item.fallbackPrice);

  const save = page.waitForResponse((r) => r.url().endsWith("/api/admin/products") && r.request().method() === "POST");
  await page.getByRole("button", { name: /^publish$/i }).click();
  const saved = await save;
  expect(saved.status(), await saved.text()).toBe(201);
  const { product } = await saved.json();
  await expect(page.getByText(/is live\./)).toBeVisible();
  published.push({ store: item.store, slug: product.slug, title: product.title, affiliate: product.affiliate_url, quality: json.quality, method: json.method });
}

test.describe.serial("Drape owner flow", () => {
  test("login, import AliExpress + SHEIN, publish", async ({ page, baseURL }) => {
    await loginAsAdmin(page, baseURL!);
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    for (const item of ITEMS) await importAndPublish(page, item);
    expect(published).toHaveLength(2);
  });

  test("products appear on the storefront, Shop Now redirects and is counted", async ({ page, context }) => {
    // Visitor accepts analytics so page views are recorded too.
    await page.goto("/");
    await page.getByRole("button", { name: /accept analytics/i }).click();

    for (const p of published) {
      await page.goto("/search?q=" + encodeURIComponent(p.title.split(" ").slice(0, 3).join(" ")));
      await expect(page.getByRole("link", { name: p.title }).first()).toBeVisible();

      await page.goto(`/product/${p.slug}`);
      await expect(page.getByRole("heading", { level: 1, name: p.title })).toBeVisible();
      await expect(page.getByText(/We may earn a commission/).first()).toBeVisible();
      const shop = page.getByTestId("shop-now").first();
      await expect(shop).toHaveAttribute("rel", "nofollow sponsored noopener");
      await expect(shop).toHaveAttribute("target", "_blank");

      // Capture the /go redirect response in the new tab.
      const goResponse = context.waitForEvent("response", (r) => r.url().includes(`/go/${p.slug}`));
      const popupPromise = page.waitForEvent("popup");
      await shop.click();
      const popup = await popupPromise;
      const go = await goResponse;
      expect(go.status()).toBe(302);
      expect(go.headers()["location"]).toBe(p.affiliate);
      console.log(`[shop-now ${p.store}] /go/${p.slug} -> 302 ${go.headers()["location"]}`);
      await popup.waitForLoadState("commit").catch(() => undefined);
      console.log(`[shop-now ${p.store}] popup landed on ${popup.url().slice(0, 120)}`);
      await popup.close();
    }
  });

  test("click shows up in the database and the dashboard", async ({ page, baseURL }) => {
    const db = serviceClient();
    await expect
      .poll(
        async () => {
          const { data } = await db.from("products").select("id, clicks(count)").in("slug", published.map((p) => p.slug));
          return (data ?? []).map((r) => (r.clicks as unknown as { count: number }[])[0]?.count ?? 0);
        },
        { timeout: 20_000 },
      )
      .toEqual([1, 1]);

    await loginAsAdmin(page, baseURL!);
    await page.goto("/admin?range=1");
    for (const p of published) {
      await expect(page.locator("ol").getByRole("link", { name: p.title })).toBeVisible();
    }
    await shot(page, "admin-overview-desktop");
  });
});
