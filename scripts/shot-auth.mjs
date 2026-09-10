// scripts/shot-auth.mjs — Visual Evidence (rule #25) for authenticated routes
// Usage: node scripts/shot-auth.mjs <route> [name]
//   node scripts/shot-auth.mjs /dashboard dashboard
//   node scripts/shot-auth.mjs /dashboard/freelancers freelancers
// Env: BASE_URL (default http://localhost:3000)
//      DEMO_EMAIL / DEMO_PASSWORD (default dev seed admin@talentflow.dev)
// Output: docs/ui-audit/<name>/{desktop-1280,mobile-375}-{light,dark}.png
import { chromium } from "playwright";
import fs from "node:fs";

const route = process.argv[2];
if (!route) {
  console.error("usage: node scripts/shot-auth.mjs <route> [name]");
  process.exit(1);
}
const name =
  process.argv[3] ??
  route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const email = process.env.DEMO_EMAIL ?? "admin@talentflow.dev";
const password = process.env.DEMO_PASSWORD ?? "password123";

const viewports = [
  ["desktop-1280", 1280, 800],
  ["mobile-375", 375, 812],
];

fs.mkdirSync(`docs/ui-audit/${name}`, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// Sign in through the credentials form.
await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL(`${base}/dashboard*`, { timeout: 15_000 });

async function setTheme(dark) {
  const isDark = await page.evaluate(() =>
    document.documentElement.classList.contains("dark"),
  );
  if (isDark !== dark) {
    await page.click(
      dark
        ? 'button[aria-label="Switch to dark theme"]'
        : 'button[aria-label="Switch to light theme"]',
    );
    await page.waitForTimeout(250);
  }
}

for (const theme of ["light", "dark"]) {
  await setTheme(theme === "dark");
  for (const [label, w, h] of viewports) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(base + route, { waitUntil: "networkidle" });
    await page.screenshot({
      path: `docs/ui-audit/${name}/${label}-${theme}.png`,
      fullPage: true,
    });
    console.log(`ok docs/ui-audit/${name}/${label}-${theme}.png`);
  }
}

await browser.close();
