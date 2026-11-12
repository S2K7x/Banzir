// Runs axe-core (WCAG 2.1 A and AA plus best practices) on every screen and
// sheet, in a dark, a light and the high-contrast theme, at phone size.
// Usage: npm run build && npx vite preview --port 4173 & node scripts/a11y.mjs
// Exits with 1 on any violation. Colour pairs are checked by scripts/contrast.mjs.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium, devices } from 'playwright';

const APP = process.env.APP_URL || 'http://localhost:4173/';
const THEMES = (process.env.THEMES || 'midnight,sky,contrast').split(',');
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

const found = new Map();
async function audit(where) {
  await page.waitForTimeout(350);
  await page.addScriptTag({ content: axeSource });
  const res = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' :: ' + n.failureSummary.split('\n').slice(1, 2).join('')) }));
  });
  for (const v of res) {
    const key = `${v.id}`;
    const entry = found.get(key) ?? { ...v, where: new Set() };
    entry.where.add(where);
    found.set(key, entry);
  }
}

const click = (name) => page.locator('button', { hasText: name }).first().click({ timeout: 8000 });
const tab = async (t) => {
  await page.locator('nav.tabbar button', { hasText: t }).click();
  await page.waitForTimeout(400);
};

// Onboarding, auditing each step on the way.
await page.goto(APP);
await audit('onboarding: welcome');
await click('Continue');
await audit('onboarding: goal');
await click('Lose fat');
for (let i = 0; i < 16; i++) {
  const text = await page.locator('body').innerText();
  if (text.includes('Make it yours')) break;
  const age = page.getByLabel('Age');
  if ((await age.count()) && !(await age.inputValue())) {
    await age.fill('34');
    await page.getByLabel('Height').fill('172');
    await page.getByLabel('Weight').fill('70');
  }
  await audit(`onboarding: step ${i + 2}`);
  if (await page.locator('button', { hasText: 'Use this plan' }).count()) await click('Use this plan');
  else await click('Continue');
  await page.waitForTimeout(150);
}
for (const m of ['Runs and heart rate', 'Fasting']) await click(m);
await audit('onboarding: look');
await click('Continue');
await audit('onboarding: ready');
await click('Start training');
await page.waitForTimeout(600);

// Some data so lists, charts and history render.
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
  const day = (n) => new Date(Date.now() - n * 86400000);
  const key = (d) => d.toISOString().slice(0, 10);
  await put('body', Array.from({ length: 14 }, (_, i) => ({ date: key(day(i)), kg: 70 + i * 0.05 })));
  await put('foods', [{ id: 'f1', date: key(day(0)), time: '08:00', name: 'Oats with milk', kcal: 380, protein: 18, carbs: 55, fat: 9 }]);
  await put('runs', [{ id: 'r1', date: day(2).toISOString(), seconds: 1800, meters: 5000, kind: 'easy', source: 'manual', avgHr: 140 }]);
  await put('fasts', [{ id: 'x1', start: new Date(Date.now() - 30 * 3600000).toISOString(), end: new Date(Date.now() - 18 * 3600000).toISOString(), feel: 4 }]);
  await put('sessions', [{ id: 's1', date: day(1).toISOString(), dayName: 'Full body A', durationSeconds: 2700, entries: [{ exerciseId: 'goblet_squat', sets: [{ reps: 10, kg: 20, done: true }] }] }]);
});

for (const theme of THEMES) {
  await page.evaluate((t) => {
    const s = JSON.parse(localStorage.getItem('banzir.settings') || '{}');
    localStorage.setItem('banzir.settings', JSON.stringify({ ...s, theme: t }));
  }, theme);
  await page.reload();
  await page.waitForTimeout(600);
  const t = (s) => `${theme}: ${s}`;
  await audit(t('today'));
  await tab('Program');
  await audit(t('program'));
  await tab('Progress');
  await audit(t('progress'));
  await page.locator('.card', { hasText: 'Running' }).locator('button', { hasText: 'Log' }).first().click();
  await audit(t('log run sheet'));
  await page.locator('.sheet').getByLabel('Close', { exact: true }).click();
  await click('Zones and paces');
  await audit(t('zones sheet'));
  await page.locator('.sheet').getByLabel('Close', { exact: true }).click();
  await tab('Food');
  await audit(t('food'));
  await click('Add food');
  await audit(t('add food sheet'));
  await page.locator('.sheet').getByLabel('Close', { exact: true }).click();
  await tab('Coach');
  await audit(t('coach setup'));
  await tab('Profile');
  await audit(t('profile'));
  await tab('Today');
  await page.getByLabel('Open fasting').click();
  await audit(t('fasting'));
  await page.getByLabel('Close fasting').click();
  await page.waitForTimeout(300);
  await click('Start workout');
  await audit(t('player'));
  // Tick the first set so the finish sheet has something to save.
  const set = page.locator('.overlay').getByLabel('Set 1 not done');
  if (await set.count()) await set.first().click();
  await page.getByLabel('Close workout').click();
  await audit(t('quit sheet'));
  await page.locator('.sheet button', { hasText: 'Discard' }).first().click();
  await page.waitForTimeout(300);
}

await browser.close();
for (const [id, v] of found) {
  console.log(`\n[${v.impact}] ${id}: ${v.help}`);
  console.log(`  where: ${[...v.where].slice(0, 6).join(' | ')}${v.where.size > 6 ? ` (+${v.where.size - 6})` : ''}`);
  for (const n of v.nodes) console.log(`  - ${n}`);
}
if (errors.length) console.log('\nPage errors:\n' + errors.join('\n'));
console.log(found.size ? `\n${found.size} rules violated.` : '\nNo axe violations.');
process.exit(found.size || errors.length ? 1 : 0);
