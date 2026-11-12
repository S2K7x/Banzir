// Food and body weight: targets, Open Food Facts search (mocked), hand entry, water, corrections.
// Run with the app served on BASE_URL (default http://localhost:4173/); see e2e/run.mjs.
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const out = process.argv[2] || require('node:os').tmpdir();
require('node:fs').mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: Number(process.argv[3] || 1) });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  let searches = 0;
  await page.route('https://world.openfoodfacts.org/**', (route) => {
    searches++;
    route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: JSON.stringify({ products: [
      { code: '123', product_name: 'Skyr natur', brands: 'Dairy Co', serving_quantity: 150, nutriments: { 'energy-kcal_100g': 63, proteins_100g: 11, carbohydrates_100g: 4, fat_100g: 0.2 } },
      { code: '456', product_name: 'Skyr vanilla', brands: 'Dairy Co', nutriments: { 'energy-kcal_100g': 80, proteins_100g: 9, carbohydrates_100g: 9, fat_100g: 0.5 } },
      { code: '789', product_name: 'No nutrition data' },
    ] }) });
  });
  const shot = async (n) => { await page.waitForTimeout(300); await page.screenshot({ path: `${out}/${n}.png` }); };
  const click = (name) => page.locator('button', { hasText: name }).first().click({ timeout: 8000 });
  const text = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  const expect = async (needle, label) => { for (let i = 0; ; i++) { const t = await text(); if (t.includes(needle)) return; if (i >= 25) throw new Error(`expected "${needle}"${label ? ` (${label})` : ''} in: ${t.slice(0, 600)}`); await page.waitForTimeout(200); } };
  const tab = async (t) => { await page.locator('nav.tabbar button', { hasText: t }).click(); await page.waitForTimeout(500); };

  await page.goto(BASE);
  await click('Continue'); await click('Lose fat'); await click('Continue'); await click('Continue'); await click('Continue'); await click('Continue');
  await page.getByLabel('Age').fill('30'); await click('Male'); await page.getByLabel('Height').fill('180'); await page.getByLabel('Weight').fill('80');
  await click('Continue'); await click('Use this plan');
  await expect('Food and calories');
  const pressed = await page.locator('button[aria-pressed=true]', { hasText: /Food and calories|Body weight/ }).count();
  if (pressed !== 2) throw new Error('modules should be preselected for fat loss, got ' + pressed);
  await shot('01-modules'); await click('Continue'); await click('Start training');
  await page.waitForSelector('text=Morning weigh-in');
  await page.getByLabel("Today's weight in kg").fill('80.2'); await click('Save');
 
  await page.waitForSelector('text=Today 80.2 kg');
  await expect('Food today'); await shot('02-today');
  if (!(await page.locator('nav.tabbar button', { hasText: 'Food' }).count())) throw new Error('Food tab missing');

  await page.locator('button', { hasText: 'Food today' }).click(); await page.waitForTimeout(500);
  await expect('kcal left'); await expect('losing');
  const before = await text();
  const target = Number(before.match(/0 of (\d+) kcal/)[1]);
  // 80 kg, 180 cm, 30, male, activity 1.6 (3 days a week), lose 0.5 %/week: 2410 kcal.
  if (target !== 2410) throw new Error('target ' + target);
  await shot('03-food-empty');

  await click('Add food'); await click('Search');
  await page.getByLabel('Search foods').fill('skyr'); await page.locator('form button', { hasText: 'Search' }).click();
  await page.waitForSelector('text=Skyr vanilla'); await expect('Open Food Facts');
  if ((await text()).includes('No nutrition data')) throw new Error('product without nutrition shown');
  await shot('04-search');
  await click('Skyr natur'); await page.waitForSelector('text=One serving: 150 g'); await expect('95 kcal');
  await page.locator('.sheet button', { hasText: /^Add$/ }).click(); await page.waitForSelector('text=Added Skyr natur');
  await click('By hand');
  await page.locator('input[placeholder="For example: chicken and rice"]').fill('Chicken and rice');
  await page.getByLabel('Protein in grams').fill('40'); await page.getByLabel('Carbohydrate in grams').fill('60'); await page.getByLabel('Fat in grams').fill('10');
  await expect('from macros: 490');
  await page.locator('.sheet button', { hasText: /^Add$/ }).click(); await page.waitForSelector('text=Added Chicken and rice');
  await click('Done');
  await expect('Skyr natur'); await expect('Chicken and rice'); await expect('585 of 2410 kcal');
  await click('+250 ml'); await page.waitForTimeout(600); const wt = (await text()).match(/Water ([^A-Z]*)/); console.log('WATER', wt && wt[0]); await page.waitForSelector('text=250 of about', { timeout: 5000 });
  await shot('05-food-logged');
  if (searches !== 1) throw new Error('searches should run only on request: ' + searches);

  // Recent foods come back in one tap.
  await click('Add food'); await click('Recent'); await expect('Chicken and rice');
  await page.locator('.sheet .list button', { hasText: 'Chicken and rice' }).first().click(); await page.waitForSelector('text=Added Chicken and rice'); await click('Done');
  await expect('1075 of 2410 kcal');

  // Targets: a faster pace lowers calories.
  await page.getByLabel('Nutrition targets').click(); await page.waitForSelector('text=Your targets');
  await click('-0.75 %'); await expect('2190 kcal'); await shot('06-targets');
  await page.locator('.sheet button', { hasText: /^Save$/ }).click(); await page.waitForTimeout(400);
  await expect('of 2190 kcal');

  // Two weeks of flat weigh-ins while trying to lose: the app suggests eating 150 kcal less.
  await page.evaluate(async () => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open('banzir'); r.onsuccess = () => res(r.result); r.onerror = rej; });
    const tx = db.transaction('body', 'readwrite');
    const pad = (n) => String(n).padStart(2, '0');
    for (let i = 1; i <= 14; i++) { const d = new Date(); d.setDate(d.getDate() - i); tx.objectStore('body').put({ date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, kg: 80.2 }); }
    await new Promise((res) => { tx.oncomplete = res; });
    db.close();
  });
  await page.reload(); await page.waitForSelector('text=This week');
  await tab('Food');
  await page.waitForSelector('text=Adjust your calories?'); await shot('07-correction');
  await click('-150 kcal a day'); await page.waitForTimeout(400);
  await expect('of 2040 kcal');
  if ((await text()).includes('Adjust your calories?')) throw new Error('correction should not repeat within 14 days');

  await tab('Progress'); await expect('Body weight'); await expect('7-day average'); await expect('Stable');
  await shot('08-progress');
  await tab('Profile'); await expect('Modules');
  await page.locator('button[role=switch]', { hasText: 'Nutrition' }).click(); await page.waitForTimeout(300);
  if (await page.locator('nav.tabbar button', { hasText: 'Food' }).count()) throw new Error('Food tab should hide when the module is off');
  console.log('nutrition and weight ok, errors:', JSON.stringify(errors));
  if (errors.length) process.exitCode = 1;
  await browser.close();
})().catch((e) => { console.error('FLOW FAILED', e.message); process.exit(1); });
