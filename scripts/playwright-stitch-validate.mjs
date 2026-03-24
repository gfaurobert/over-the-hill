import { chromium } from "@playwright/test";

async function run() {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3003";
  const email = process.env.PLAYWRIGHT_EMAIL || "tipahej393@mvpmedix.com";
  const password = process.env.PLAYWRIGHT_PASSWORD || "3R9yd3ncCmQ*E8392AP6";
  const outputPath = process.env.PLAYWRIGHT_OUTPUT || "/tmp/hill-current-auth.png";

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1376, height: 768 } });

  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2500);
    await page.screenshot({ path: outputPath, fullPage: false });
    console.log(`Saved screenshot: ${outputPath}`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
