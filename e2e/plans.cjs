// Plan matching for runners and sport, including prerequisites and switching plans.
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
  const shot = async (n) => { await page.waitForTimeout(300); await page.screenshot({ path: `${out}/${n}.png` }); };
  const click = (name) => page.locator('button', { hasText: name }).first().click({ timeout: 8000 });
  const text = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  const expect = async (needle, label) => { for (let i = 0; ; i++) { const t = await text(); if (t.includes(needle)) return; if (i >= 25) throw new Error(`expected "${needle}"${label ? ` (${label})` : ''} in: ${t.slice(0, 600)}`); await page.waitForTimeout(200); } };
  const tab = async (t) => { await page.locator('nav.tabbar button', { hasText: t }).click(); await page.waitForTimeout(400); };

  // A runner who wants a half marathon but can only run 20 minutes is built up first.
  await page.goto(BASE);
  await click('Continue'); await click('Run'); await click('Continue');
  await click('Intermediate'); await click('Half marathon'); await click('About 20 min');
  await expect('This plan starts from about 30 minutes'); await shot('01-run-focus');
  await click('An hour or more'); await click('Continue');
  await click('Continue');
  await page.locator('.seg button', { hasText: /^4$/ }).click(); await page.locator('.seg button', { hasText: /^60$/ }).click(); await click('Continue');
  await click('Continue');
  await expect('Half marathon'); await expect('12 weeks'); await shot('02-half-plan');
  await click('Use this plan'); await click('Continue'); await click('Start training');
  await page.waitForSelector('text=This week'); await expect('Easy run + strides'); await shot('03-today-half');
  await tab('Program'); await expect('Week 1 of 12'); await expect('Tempo 2 × 10 min');

  // Switch the profile to boxing and accept the boxing plan.
  await tab('Profile'); await click('Edit');
  await click('Better at a sport'); await click('Continue'); await click('Boxing'); await shot('04-sport-focus'); await click('Continue');
  await click('Gym'); await click('Continue'); await click('Continue'); await click('Continue');
  await expect('Boxing support'); await shot('05-boxing-plan');
  await click('Switch to this plan'); await page.waitForTimeout(400);
  await tab('Program'); await expect('Boxing support'); await expect('Medicine ball rotational throw'); await shot('06-boxing-program');
  // Do the conditioning rounds day.
  await page.locator('.card', { hasText: 'Conditioning rounds' }).locator('button', { hasText: 'Start' }).click();
  await page.waitForSelector('text=1 of 3');
  await click('Mark as done'); await page.getByRole('button', { name: /^Next/ }).click();
  await expect('Round 1 of 6'); await shot('07-bag-rounds');
  console.log('errors:', JSON.stringify(errors));
  if (errors.length) process.exitCode = 1;
  await browser.close();
})().catch((e) => { console.error('FLOW FAILED', e.message); process.exit(1); });
