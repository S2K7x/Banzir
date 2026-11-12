// The desktop layout: sidebar navigation, two columns, centred dialogs, onboarding panel.
// Run with the app served on BASE_URL (default http://localhost:4173/); see e2e/run.mjs.
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const out = process.argv[2] || require('node:os').tmpdir();
require('node:fs').mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  const click = (name) => page.locator('button', { hasText: name }).first().click({ timeout: 8000 });
  const box = (sel) => page.locator(sel).first().boundingBox();
  const fail = (m) => {
    throw new Error(m);
  };

  await page.goto(BASE);
  // Onboarding is a centred panel, not a full-height column.
  const panel = await box('.overlay-inner.panel');
  if (!panel || panel.height > 860 || Math.abs(panel.x + panel.width / 2 - 720) > 4) fail(`onboarding panel not centred: ${JSON.stringify(panel)}`);
  await click('Continue');
  await click('Build muscle');
  for (let i = 0; i < 16; i++) {
    if ((await page.locator('body').innerText()).includes('Make it yours')) break;
    if (await page.locator('button', { hasText: 'Use this plan' }).count()) await click('Use this plan');
    else await click('Continue');
  }
  await click('Food and calories');
  await click('Continue');
  await click('Start training');
  await page.waitForSelector('text=This week');
  await page.screenshot({ path: `${out}/01-today.png` });

  // A sidebar on the left with the brand, and Today in two columns.
  const nav = await box('nav.tabbar');
  if (!nav || nav.x !== 0 || nav.height < 880 || nav.width > 260) fail(`expected a full-height sidebar, got ${JSON.stringify(nav)}`);
  if (!(await page.locator('.nav-brand').isVisible())) fail('brand missing in the sidebar');
  const cols = await page.locator('.cols > .col').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)));
  if (cols.length !== 2 || cols[1] <= cols[0] + 300) fail(`Today should have two columns side by side, got x=${cols}`);
  const main = await box('main');
  if (main.x < nav.width - 1) fail('content must start right of the sidebar');

  // Every tab opens from the sidebar.
  for (const t of ['Program', 'Progress', 'Food', 'Coach', 'Profile', 'Today']) {
    await page.locator('nav.tabbar button', { hasText: t }).click();
    await page.waitForTimeout(300);
    if (t !== 'Today' && !(await page.locator('h1', { hasText: t }).count())) fail(`${t} did not open`);
  }

  // Sheets are centred dialogs on large screens.
  await page.locator('nav.tabbar button', { hasText: 'Food' }).click();
  await click('Add food');
  await page.waitForSelector('.sheet');
  const sheet = await box('.sheet');
  if (!sheet || sheet.width > 560 || sheet.y < 20 || sheet.y + sheet.height > 880) fail(`sheet should be a centred dialog: ${JSON.stringify(sheet)}`);
  await page.screenshot({ path: `${out}/02-sheet.png` });
  await page.keyboard.press('Escape');

  if (errors.length) process.exitCode = 1;
  console.log(errors.length ? 'errors: ' + errors.join('\n') : 'desktop ok');
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
