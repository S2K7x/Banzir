// Regenerates docs/screenshots/banzir.png for the README from the real app,
// with a fixed clock and sample data. Usage: npm run build && npx vite preview
// --port 4173 & node scripts/screenshots.mjs
import { mkdirSync } from 'node:fs';
import { chromium, devices } from 'playwright';

const APP = process.env.APP_URL || 'http://localhost:4173/';
const OUT = new URL('../docs/screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2, timezoneId: 'Europe/London' });
const page = await ctx.newPage();
await page.clock.setFixedTime(new Date('2026-11-12T17:40:00Z'));
const click = (name) => page.locator('button', { hasText: name }).first().click({ timeout: 8000 });
const tab = async (t) => {
  await page.locator('nav.tabbar button', { hasText: t }).click();
  await page.waitForTimeout(500);
};

await page.goto(APP);
await page.fill('input[placeholder="First name"]', 'Alex');
await click('Continue');
await click('Build muscle');
for (let i = 0; i < 16; i++) {
  if ((await page.locator('body').innerText()).includes('Make it yours')) break;
  const age = page.getByLabel('Age');
  if ((await age.count()) && !(await age.inputValue())) {
    await age.fill('31');
    await click('Female');
    await page.getByLabel('Height').fill('168');
    await page.getByLabel('Weight').fill('64');
  }
  if (await page.locator('button', { hasText: 'Use this plan' }).count()) await click('Use this plan');
  else await click('Continue');
}
for (const m of ['Food and calories', 'Runs and heart rate', 'Fasting']) {
  const chip = page.locator('button[aria-pressed=false]', { hasText: m });
  if (await chip.count()) await chip.click();
}
await click('Continue');
await click('Start training');
await page.waitForTimeout(500);

// Three weeks of history so charts and suggestions have something to show.
await page.evaluate(async () => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('banzir');
    r.onsuccess = () => res(r.result);
    r.onerror = rej;
  });
  const put = (store, rows) =>
    new Promise((res, rej) => {
      const tx = db.transaction(store, 'readwrite');
      rows.forEach((r) => tx.objectStore(store).put(r));
      tx.oncomplete = res;
      tx.onerror = rej;
    });
  const day = (n, h = 7) => {
    const d = new Date(Date.now() - n * 86400000);
    d.setHours(h, 30, 0, 0);
    return d;
  };
  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  await put('body', Array.from({ length: 21 }, (_, i) => ({ date: key(day(i)), kg: Math.round((63.2 + i * 0.045 + (i % 3) * 0.15) * 10) / 10 })));
  await put('foods', [
    { id: 'f1', date: key(day(0)), time: '08:10', name: 'Greek yoghurt, oats and berries', kcal: 420, protein: 28, carbs: 52, fat: 10 },
    { id: 'f2', date: key(day(0)), time: '13:00', name: 'Chicken, rice and greens', kcal: 610, protein: 45, carbs: 70, fat: 14 },
  ]);
  await put('runs', [
    { id: 'r1', date: day(2, 18).toISOString(), seconds: 1860, meters: 5200, kind: 'easy', source: 'gpx', avgHr: 142 },
    { id: 'r2', date: day(6, 9).toISOString(), seconds: 2700, meters: 7400, kind: 'long', source: 'gpx', avgHr: 145 },
    { id: 'r3', date: day(10, 18).toISOString(), seconds: 1500, meters: 4300, kind: 'easy', source: 'manual' },
  ]);
  await put('fasts', [
    { id: 'x1', start: day(1, 20).toISOString(), end: day(0, 8).toISOString(), feel: 4 },
    { id: 'x2', start: day(2, 20).toISOString(), end: day(1, 8).toISOString(), feel: 5 },
    { id: 'x3', start: day(3, 20).toISOString(), end: day(2, 7).toISOString(), feel: 3 },
  ]);
});
await page.reload();
await page.waitForTimeout(800);

const shots = [];
const shot = async (name) => {
  await page.waitForTimeout(400);
  shots.push(await page.screenshot());
};
await shot('today');
await click('Start workout');
await page.waitForSelector('.overlay');
await click('Mark as done');
await page.getByRole('button', { name: /^Next/ }).click();
await shot('player');
await page.getByLabel('Close workout').click();
await page.locator('.sheet button', { hasText: 'Discard' }).click();
await page.waitForTimeout(300);
await tab('Progress');
await shot('progress');
await tab('Food');
await shot('food');
await tab('Today');
await page.getByLabel('Open fasting').click();
await shot('fasting');

// One strip, five phones.
const imgs = shots.map((b) => `<img src="data:image/png;base64,${b.toString('base64')}" width="236">`).join('');
const strip = await browser.newPage({ deviceScaleFactor: 2 });
await strip.setViewportSize({ width: 5 * 236 + 6 * 12, height: 536 });
await strip.setContent(`<body style="margin:0;padding:12px;display:flex;gap:12px;background:#0e1113">${imgs.replaceAll('<img ', '<img style="border-radius:18px" ')}</body>`);
await strip.screenshot({ path: `${OUT}banzir.png` });
await browser.close();
console.log(`wrote ${OUT}banzir.png`);
