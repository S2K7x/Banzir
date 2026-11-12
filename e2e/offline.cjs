// The installed app shell, all tabs and the player load with the network off.
// Run with the app served on BASE_URL (default http://localhost:4173/); see e2e/run.mjs.
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const out = process.argv[2] || require('node:os').tmpdir();
require('node:fs').mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(1500);
  for (const n of ['Continue','Continue','Continue','Continue','Continue','Continue','Use this plan','Continue','Start training']) { await page.locator('button', { hasText: n }).first().click(); await page.waitForTimeout(120); }
  await page.waitForSelector('text=This week');
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForSelector('text=This week', { timeout: 8000 });
  for (const t of ['Program', 'Progress', 'Coach', 'Profile']) { await page.locator('nav.tabbar button', { hasText: t }).click(); await page.waitForTimeout(250); }
  await page.locator('nav.tabbar button', { hasText: 'Today' }).click();
  await page.locator('button', { hasText: 'Start workout' }).click();
  await page.waitForSelector('text=1 of');
  console.log('offline: app shell, all tabs and the player load with no network');
  await browser.close();
})().catch((e) => { console.error('OFFLINE FAILED', e.message); process.exit(1); });
