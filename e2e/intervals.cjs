// A beginner running plan: interval timer with work and walk steps, finish, Program tab, light theme.
// Run with the app served on BASE_URL (default http://localhost:4173/); see e2e/run.mjs.
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const out = process.argv[2] || require('node:os').tmpdir();
require('node:fs').mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  const shot = async (n) => { await page.waitForTimeout(350); await page.screenshot({ path: `${out}/${n}.png` }); };
  const click = (name) => page.locator('button', { hasText: name }).first().click({ timeout: 8000 });
  const tab = (t) => page.locator('nav.tabbar button', { hasText: t }).click();
  await page.goto(BASE);
  await click('Continue');
  await click('Run'); await click('Continue');
  await click('Continue');
  await click('No equipment'); await click('Continue');
  await click('Continue'); await click('Continue');
  await page.waitForSelector('text=ere is your plan'); await shot('01-run-plan');
  await click('Use this plan'); await click('Sky'); await click('Continue'); await click('Start training');
  await page.waitForSelector('text=This week'); await shot('02-today-sky');
  await click('Start workout'); await page.waitForSelector('text=1 of');
  await click('Mark as done'); await page.getByRole('button', { name: /^Next/ }).click();
  await shot('03-intervals-idle');
  await click('Start'); await page.waitForTimeout(2600); await shot('04-intervals-running');
  await click('Skip step'); await shot('05-intervals-walk');
  await click('Mark as done'); await shot('06-intervals-done');
  await page.getByRole('button', { name: /^Next/ }).click(); await click('Finish workout'); await page.waitForSelector('text=Sets done');
  await click('Save workout'); await page.waitForSelector('text=Workout complete'); await click('Done');
  await tab('Program'); await shot('07-program-run');
  await tab('Progress'); await shot('08-progress-run');
  // edit profile -> calisthenics
  await tab('Profile'); await click('Lilac'); await shot('09-profile-lilac');
  await click('Edit');
  await click('Calisthenics skills'); await click('Continue'); await click('None yet'); await click('Continue');
  await click('Pull-up bar'); await click('Continue'); await click('Continue'); await click('Continue');
  await page.waitForSelector('text=ere is your plan'); await shot('10-cal-plan');
  await click('Switch to this plan');
  await page.waitForTimeout(400);
  await tab('Program'); await shot('11-program-cal');
  await tab('Today'); await shot('12-today-lilac');
  // backup -> erase -> restore from welcome
  await tab('Profile');
  const [dl] = await Promise.all([page.waitForEvent('download'), click('Save a backup')]);
  const file = `${out}/backup.json`; await dl.saveAs(file);
  await click('Erase everything'); await click('Erase all data');
  await page.waitForSelector('text=What should we call you'); await shot('13-after-erase');
  await page.setInputFiles('input[type=file]', file);
  await page.waitForSelector('text=This week'); await shot('14-restored');
  await tab('Progress'); await shot('15-restored-progress');
  for (const th of ['Carbon', 'Sand', 'Forest', 'Sunset', 'Mono', 'Contrast', 'System']) {
    await tab('Profile'); await click(th); await tab('Today'); await shot('20-theme-' + th.toLowerCase());
  }
  console.log('errors:', JSON.stringify(errors));
  if (errors.length) process.exitCode = 1;
  await browser.close();
})().catch((e) => { console.error('FLOW FAILED', e.message); process.exit(1); });
