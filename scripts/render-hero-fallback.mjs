// Renders the WebGL hero once and saves it as the static fallback image (public/hero/chrome-fallback.webp).
// Usage: node scripts/render-hero-fallback.mjs [baseUrl]
import { chromium } from "@playwright/test";
import sharp from "sharp";

const base = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1400, height: 1100 }, deviceScaleFactor: 1.5 });
page.on("console", (m) => m.type() === "error" && console.log("[console]", m.text()));
await page.goto(`${base}/?hero=3d`, { waitUntil: "networkidle", timeout: 120_000 });
await page.addStyleTag({ content: "#hero-title, header, [role=dialog], .chrome-wordmark, section p, section a { visibility: hidden !important; }" });
await page.waitForSelector('[data-hero-mode="3d"]', { timeout: 120_000 });
await page.waitForTimeout(6000);
const canvas = page.locator('[data-hero-mode="3d"] canvas').first();
const png = await canvas.screenshot({ type: "png" });
await sharp(png).resize(1080, 1080, { fit: "cover" }).webp({ quality: 78, effort: 6 }).toFile("public/hero/chrome-fallback.webp");
const meta = await sharp("public/hero/chrome-fallback.webp").metadata();
console.log("saved public/hero/chrome-fallback.webp", meta.width, "x", meta.height);
await browser.close();
