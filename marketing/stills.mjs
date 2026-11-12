// Stills of the real app with the demo account, shared by the video and the
// social posts. Needs the app served (APP_URL, default http://localhost:4173/).
import { devices } from 'playwright';
import { clicker, onboard, seed } from '../scripts/demo.mjs';

export const APP = process.env.APP_URL || 'http://localhost:4173/';
/** A Thursday evening: the eating window is open and a fast follows tonight. */
export const NOW = new Date('2026-11-12T17:40:00Z');

export async function appPage(browser, device = 'phone', theme = 'midnight', scale = 2) {
  const ctx = await browser.newContext({
    ...(device === 'phone' ? { ...devices['iPhone 13'], deviceScaleFactor: scale } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 }),
    timezoneId: 'Europe/London',
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(NOW);
  await page.addInitScript((t) => {
    const s = JSON.parse(localStorage.getItem('banzir.settings') || '{}');
    if (s.theme !== t) localStorage.setItem('banzir.settings', JSON.stringify({ ...s, theme: t }));
  }, theme);
  return page;
}

export const dataUrl = (buf) => `data:image/jpeg;base64,${buf.toString('base64')}`;
export const snap = async (page) => dataUrl(await page.screenshot({ type: 'jpeg', quality: 92 }));

/**
 * Returns { stills, live }: data URLs of the main screens, and a phone page
 * left on Today with the demo account, for scenes captured live.
 */
export async function captureStills(browser, { scale = 2 } = {}) {
  const stills = {};
  {
    const p = await appPage(browser, 'phone', 'midnight', scale);
    const click = clicker(p);
    await p.goto(APP);
    await p.fill('input[placeholder="First name"]', 'Alex');
    await click('Continue');
    await click('Build muscle');
    await p.waitForTimeout(300);
    stills.goal = await snap(p);
    for (let i = 0; i < 12 && !(await p.locator('button', { hasText: 'Use this plan' }).count()); i++) await click('Continue');
    await p.waitForTimeout(300);
    stills.plan = await snap(p);
    await p.context().close();
  }
  const live = await appPage(browser, 'phone', 'midnight', scale);
  const tab = async (t) => {
    await live.locator('nav.tabbar button', { hasText: t }).click();
    await live.waitForTimeout(500);
  };
  await live.goto(APP);
  await onboard(live);
  await seed(live);
  stills.today = await snap(live);
  await clicker(live)('Start workout');
  await live.waitForSelector('.overlay');
  await clicker(live)('Mark as done');
  await live.getByRole('button', { name: /^Next/ }).click();
  for (const n of [1, 2]) await live.getByRole('button', { name: `Set ${n} not done` }).click();
  await live.clock.setFixedTime(new Date(NOW.getTime() + 21000));
  await live.waitForTimeout(700);
  stills.workout = await snap(live);
  await live.getByLabel('Close workout').click();
  await live.locator('.sheet button', { hasText: 'Discard' }).click();
  await live.clock.setFixedTime(NOW);
  await live.waitForTimeout(300);
  await tab('Progress');
  stills.progress = await snap(live);
  await tab('Food');
  stills.food = await snap(live);
  await tab('Coach');
  stills.coach = await snap(live);
  await live.evaluate(() => window.scrollTo(0, 0));
  await live.waitForTimeout(200);
  stills.coachTop = await snap(live);
  await tab('Today');
  await live.getByLabel('Open fasting').click();
  await live.waitForTimeout(400);
  stills.fasting = await snap(live);
  await live.getByLabel('Close fasting').click();
  await live.waitForTimeout(300);
  stills.themes = [];
  for (const theme of ['lilac', 'sky', 'midnight', 'sand', 'sunset']) {
    const p = await appPage(browser, 'phone', theme, scale);
    await p.goto(APP);
    await onboard(p);
    await seed(p);
    stills.themes.push(await snap(p));
    await p.context().close();
  }
  {
    const p = await appPage(browser, 'desktop');
    await p.goto(APP);
    await onboard(p);
    await seed(p);
    stills.desktop = await snap(p);
    await p.context().close();
  }
  return { stills, live };
}
