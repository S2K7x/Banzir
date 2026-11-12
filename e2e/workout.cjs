// Onboarding for muscle at home, a full guided workout with sets, rest and finish, then Progress.
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
  const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
  const click = (name) => page.locator('button', { hasText: name }).first().click({ timeout: 8000 });
  await page.goto(BASE);
  await page.waitForSelector('text=Banzir');
  await page.fill('input[placeholder="First name"]', 'Sam');
  await shot('01-welcome');
  await click('Continue');
  await click('Build muscle'); await shot('02-goal');
  await click('Continue');
  await click('6-15'); await shot('03-level');
  await click('Continue');
  await click('Home, with weights'); await click('Pull-up bar'); await shot('04-equipment');
  await click('Continue');
  await shot('05-schedule'); await click('Continue');
  await shot('06-about'); await click('Continue');
  await page.waitForSelector('text=here is your plan'); await shot('07-plan');
  await click('Use this plan');
  await click('Lilac'); await shot('08-look'); await click('Midnight');
  await click('Continue');
  await shot('09-ready');
  await click('Start training');
  await page.waitForSelector('text=This week'); await shot('10-today');
  await click('Start workout');
  await page.waitForSelector('text=1 of'); await shot('11-player-warmup');
  await click('Mark as done');
  await page.getByRole('button', { name: /^Next/ }).click();
  await page.waitForTimeout(200); await shot('12-player-sets');
  // log first exercise: weight 20, tick all sets
  const title = await page.locator('.overlay h1.h1').innerText();
  const w = page.getByLabel('Set 1 weight');
  if (await w.count()) await w.fill('20');
  for (let i = 0; i < 8; i++) { const b = page.getByRole('button', { name: /Set \d not done/ }); if (!(await b.count())) break; await b.first().click(); await page.waitForTimeout(60); }
  await shot('13-player-rest');
  await click('Skip');
  // go to the end
  for (let i = 0; i < 12; i++) { const n = page.getByRole('button', { name: /^Next/ }); if (!(await n.count())) break; await n.click(); await page.waitForTimeout(60); }
  await shot('14-player-last');
  await click('Finish workout');
  await page.waitForSelector('text=Sets done'); await page.waitForTimeout(400); await shot('15-finish');
  await click('Hard'); await click('Save workout'); await page.waitForTimeout(1500); await shot('15b-after-save'); console.log('errors so far:', JSON.stringify(errors));
  await page.waitForSelector('text=Workout complete'); await shot('16-summary');
  await click('Done');
  await page.waitForSelector('text=This week'); await shot('17-today-after');
  for (const t of ['Program', 'Progress', 'Coach', 'Profile']) {
    await page.locator('nav.tabbar').getByRole('button', { name: t }).click();
    await page.waitForTimeout(300); await shot('18-' + t.toLowerCase());
  }
  await page.screenshot({ path: `${out}/19-profile-full.png`, fullPage: true });
  console.log('first logged exercise:', title);
  console.log('errors:', JSON.stringify(errors));
  if (errors.length) process.exitCode = 1;
  await browser.close();
})().catch(async (e) => { console.error('FLOW FAILED', e.message); process.exit(1); });
