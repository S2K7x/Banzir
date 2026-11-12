// Keyboard use: dialogs take focus, keep Tab inside, close with Escape and give focus back.
// Run with the app served on BASE_URL (default http://localhost:4173/); see e2e/run.mjs.
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  const click = (name) => page.locator('button', { hasText: name }).first().click({ timeout: 8000 });
  const inside = (sel) => page.evaluate((s) => !!document.activeElement?.closest(s), sel);
  const fail = (m) => {
    throw new Error(m);
  };

  await page.goto(BASE);
  await click('Continue');
  await click('General fitness');
  for (let i = 0; i < 16; i++) {
    if ((await page.locator('body').innerText()).includes('Make it yours')) break;
    if (await page.locator('button', { hasText: 'Use this plan' }).count()) await click('Use this plan');
    else await click('Continue');
  }
  await click('Continue');
  await click('Start training');
  await page.waitForSelector('text=This week');

  // The workout overlay takes focus when it opens.
  await click('Start workout');
  await page.waitForSelector('.overlay');
  if (!(await inside('.overlay'))) fail('focus should move into the workout overlay');

  // A sheet over it takes focus and keeps it.
  await page.getByLabel('Close workout').focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('.sheet');
  if (!(await inside('.sheet'))) fail('focus should move into the sheet');
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    if (!(await inside('.sheet'))) fail(`Tab ${i + 1} left the sheet`);
  }
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Shift+Tab');
    if (!(await inside('.sheet'))) fail(`Shift+Tab ${i + 1} left the sheet`);
  }

  // Escape closes it and focus returns to the button that opened it.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  if (await page.locator('.sheet').count()) fail('Escape should close the sheet');
  const label = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  if (label !== 'Close workout') fail(`focus should return to "Close workout", got ${label}`);

  // Tab stays inside the overlay too.
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    if (!(await inside('.overlay'))) fail(`Tab ${i + 1} left the workout overlay`);
  }

  if (errors.length) process.exitCode = 1;
  console.log(errors.length ? 'errors: ' + errors.join('\n') : 'keyboard ok');
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
