// The calisthenics planche plan, then the program builder: edit, reorder, swap and save.
// Run with the app served on BASE_URL (default http://localhost:4173/); see e2e/run.mjs.
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const out = process.argv[2] || require('node:os').tmpdir();
require('node:fs').mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  const shot = async (n) => { await page.waitForTimeout(350); await page.screenshot({ path: `${out}/${n}.png` }); };
  const click = (name) => page.locator('button', { hasText: name }).first().click({ timeout: 8000 });
  const tab = async (t) => { await page.locator('nav.tabbar button', { hasText: t }).click(); await page.waitForTimeout(400); };
  const text = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  const expectInput = async (value) => { const vals = await page.locator('input').evaluateAll((els) => els.map((e) => e.value)); if (!vals.includes(value)) throw new Error(`expected an input with value "${value}", got ${JSON.stringify(vals)}`); };
  const expect = async (needle, label) => { for (let i = 0; ; i++) { const t = await text(); if (t.includes(needle)) return; if (i >= 25) throw new Error(`expected "${needle}"${label ? ` (${label})` : ''} in: ${t.slice(0, 600)}`); await page.waitForTimeout(200); } };

  await page.goto(BASE);
  await click('Continue');
  await click('Calisthenics skills'); await click('Continue');
  await click('Intermediate'); await click('Planche'); await shot('01-focus'); await click('Continue');
  await click('No equipment'); await click('Pull-up bar'); await click('Continue');
  await page.locator('.seg button', { hasText: /^4$/ }).click(); await page.locator('.seg button', { hasText: /^60$/ }).click(); await click('Continue');
  await click('Continue');
  await expect('Planche focus', 'recommended plan'); await shot('02-plan');
  await click('Use this plan'); await click('Continue'); await click('Start training');
  await page.waitForSelector('text=This week'); await shot('03-today');

  // --- builder on the planche plan ---
  await tab('Program'); await click('Edit plan');
  await page.waitForSelector('text=Saved automatically'); await shot('04-builder');
  await page.getByLabel('Program name').fill('My planche plan');
  await page.getByLabel('Edit Tuck planche').first().click();
  await page.getByLabel('More: Sets').click(); await shot('05-item-sheet');
  await click('Change variation or exercise'); await shot('06-ladder');
  await page.locator('.sheet button', { hasText: 'Advanced tuck planche' }).click();
  await page.locator('.sheet').getByLabel('Close').click();
  await expect('Advanced tuck planche 6 ×', 'sets changed and variation swapped');
  // add an exercise to day 1 and move it up
  await click('Add exercise'); await page.getByLabel('Search exercises').fill('leg raise'); await shot('07-picker');
  await page.locator('.sheet button', { hasText: 'Lying leg raise' }).click();
  await page.getByLabel('Move Lying leg raise up').click();
  await click('Duplicate'); await expectInput('Planche strength copy');
  await page.getByLabel('Delete Planche strength copy').click(); await click('Confirm delete');
  await click('Add a day'); await expectInput('Day 5');
  await page.evaluate(() => window.scrollTo(0, 0)); await shot('08-builder-edited');
  await click('Done');
  await expect('My planche plan', 'renamed'); await expect('Customised', 'marked as customised'); await expect('No exercises yet', 'empty day shown');
  const adv = (await text()).split('Advanced tuck planche').length - 1;
  if (adv < 2) throw new Error('variation should change on both planche days, found ' + adv);
  await shot('09-program-after');

  // --- new program from scratch ---
  await click('Change plan'); await shot('10-plan-sheet');
  await click('New program');
  await page.locator('.sheet input.input').first().fill('Garage day');
  await click('Create and add exercises');
  await page.waitForSelector('text=Saved automatically');
  for (const name of ['Push-up', 'Plank', 'Brisk walk']) {
    await click('Add exercise'); await page.getByLabel('Search exercises').fill(name);
    await page.locator('.sheet .list button', { hasText: name }).first().click();
  }
  await shot('11-new-program'); await click('Done');
  await tab('Today'); await expect('Day 1', 'new program on Today'); await shot('12-today-custom');
  await click('Start workout'); await page.waitForSelector('text=1 of 3');
  await page.getByRole('button', { name: /Set 1 not done/ }).click();
  await page.getByRole('button', { name: /^Next/ }).click(); await page.getByRole('button', { name: /^Next/ }).click();
  await click('Mark as done'); await click('Finish workout'); await page.waitForSelector('text=Sets done');
  await click('Save workout'); await page.waitForSelector('text=Workout complete'); await click('Done');

  // --- saved programs list ---
  await tab('Program'); await click('Change plan'); await page.waitForSelector('text=Your programs', { timeout: 5000 });
  await expect('Your programs', 'saved programs section'); await expect('My planche plan', 'edited plan kept'); await shot('13-your-programs');
  await page.locator('.sheet .card', { hasText: 'My planche plan' }).locator('button', { hasText: 'Use' }).click();
  await page.waitForTimeout(400);
  await expect('My planche plan', 'switched back');
  await tab('Progress'); await expect('Day 1', 'history kept');
  console.log('errors:', JSON.stringify(errors));
  if (errors.length) process.exitCode = 1;
  await browser.close();
})().catch((e) => { console.error('FLOW FAILED', e.message); process.exit(1); });
