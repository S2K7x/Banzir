// Screenshots of every main screen with the demo account (scripts/demo.mjs).
// Usage (app served on port 4173, for example `npx vite preview --port 4173`):
//   node scripts/screenshots.mjs [--device phone|desktop|tablet] [--theme midnight] [--out dir] [--strip]
// --strip also writes docs/screenshots/banzir.png, the five-phone strip in the README.
import { mkdirSync } from 'node:fs';
import { chromium, devices } from 'playwright';
import { clicker, onboard, seed } from './demo.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const APP = process.env.APP_URL || 'http://localhost:4173/';
const DEVICE = arg('device', 'phone');
const THEME = arg('theme', 'midnight');
const OUT = arg('out', new URL(`../docs/screenshots/${DEVICE}/`, import.meta.url).pathname).replace(/\/?$/, '/');
const STRIP = process.argv.includes('--strip');
// A Thursday evening: the eating window is open and a fast follows tonight.
const NOW = new Date(arg('time', '2026-11-12T17:40:00Z'));

const VIEWPORTS = {
  phone: { ...devices['iPhone 13'], deviceScaleFactor: 3 },
  tablet: { viewport: { width: 834, height: 1112 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
};

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

async function newPage() {
  const ctx = await browser.newContext({ ...VIEWPORTS[DEVICE], timezoneId: 'Europe/London', colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(NOW);
  await page.addInitScript((theme) => {
    const s = JSON.parse(localStorage.getItem('banzir.settings') || '{}');
    if (s.theme !== theme) localStorage.setItem('banzir.settings', JSON.stringify({ ...s, theme }));
  }, THEME);
  return page;
}

const saved = {};
const shot = async (page, name) => {
  await page.waitForTimeout(450);
  saved[name] = await page.screenshot({ path: `${OUT}${name}.png` });
};

// Onboarding screens, from a fresh start.
{
  const page = await newPage();
  const click = clicker(page);
  await page.goto(APP);
  await page.fill('input[placeholder="First name"]', 'Alex');
  await shot(page, '01-welcome');
  await click('Continue');
  await click('Build muscle');
  await shot(page, '02-goal');
  for (let i = 0; i < 12; i++) {
    if (await page.locator('button', { hasText: 'Use this plan' }).count()) break;
    await click('Continue');
  }
  await shot(page, '03-plan');
  await page.context().close();
}

// The app in use.
const page = await newPage();
const click = clicker(page);
const tab = async (t) => {
  await page.locator('nav.tabbar button', { hasText: t }).click();
  await page.waitForTimeout(500);
};
await page.goto(APP);
await onboard(page);
await seed(page);

await shot(page, '04-today');
await click('Start workout');
await page.waitForSelector('.overlay');
await click('Mark as done');
await page.getByRole('button', { name: /^Next/ }).click();
// Log two sets so the rest timer and ticks show.
for (const n of [1, 2]) {
  const b = page.getByRole('button', { name: `Set ${n} not done` });
  if (await b.count()) await b.click();
}
await shot(page, '05-workout');
await page.getByLabel('Close workout').click();
await page.locator('.sheet button', { hasText: 'Discard' }).click();
await page.waitForTimeout(300);
await tab('Program');
await shot(page, '06-program');
await tab('Progress');
await shot(page, '07-progress');
await tab('Food');
await shot(page, '08-food');
await tab('Coach');
await shot(page, '09-coach');
await tab('Profile');
await shot(page, '10-profile');
await tab('Today');
await page.getByLabel('Open fasting').click();
await shot(page, '11-fasting');
await page.getByLabel('Close fasting').click();
await tab('Progress');
await click('Zones and paces');
await shot(page, '12-zones');

if (STRIP) {
  const pick = ['04-today', '05-workout', '07-progress', '09-coach', '11-fasting'].map((n) => saved[n]);
  const strip = await browser.newPage({ deviceScaleFactor: 2 });
  const imgs = pick.map((b) => `<img style="border-radius:18px" src="data:image/png;base64,${b.toString('base64')}" width="236">`).join('');
  await strip.setViewportSize({ width: 5 * 236 + 6 * 12, height: 536 });
  await strip.setContent(`<body style="margin:0;padding:12px;display:flex;gap:12px;background:#0e1113">${imgs}</body>`);
  await strip.screenshot({ path: new URL('../docs/screenshots/banzir.png', import.meta.url).pathname });
}
await browser.close();
console.log(`wrote ${Object.keys(saved).length} screenshots to ${OUT}`);
