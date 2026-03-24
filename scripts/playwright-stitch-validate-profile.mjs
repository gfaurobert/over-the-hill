import { chromium } from "@playwright/test";

async function run() {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3003";
  const profileDir = process.env.PLAYWRIGHT_PROFILE_DIR || `${process.env.HOME}/.config/chromium`;
  const outputPath = process.env.PLAYWRIGHT_OUTPUT || "/tmp/hill-current-profile-auth.png";

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    viewport: { width: 1376, height: 768 },
  });

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: outputPath, fullPage: false });
    console.log(`Saved screenshot: ${outputPath}`);
  } finally {
    await context.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
