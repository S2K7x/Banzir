// Running and fasting with a fixed clock: fasting timer and log, run log, GPX import, zones, run session.
// Run with the app served on BASE_URL (default http://localhost:4173/); see e2e/run.mjs.
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const fs = require('fs');
const out = process.argv[2] || require('node:os').tmpdir();
require('node:fs').mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: Number(process.argv[3] || 1), timezoneId: 'Europe/Paris' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  await page.clock.setFixedTime(new Date('2026-11-12T22:30:00+01:00'));
  const shot = async (n) => { await page.waitForTimeout(300); await page.screenshot({ path: `${out}/${n}.png` }); };
  const click = (name) => page.locator('button', { hasText: name }).first().click({ timeout: 8000 });
  const text = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  const expect = async (needle, label) => { for (let i = 0; ; i++) { const t = await text(); if (t.includes(needle)) return; if (i >= 25) throw new Error(`expected "${needle}"${label ? ` (${label})` : ''} in: ${t.slice(0, 600)}`); await page.waitForTimeout(200); } };
  const expectNot = async (needle) => { if ((await text()).includes(needle)) throw new Error(`did not expect "${needle}"`); };
  const tab = async (t) => { await page.locator('nav.tabbar button', { hasText: t }).click(); await page.waitForTimeout(500); };

  // Onboarding with the running goal: the running module is preselected.
  await page.goto(BASE);
  await click('Continue'); await click('Run');
  for (let i = 0; i < 16; i++) {
    const t = await text();
    if (t.includes('Make it yours')) break;
    const age = page.getByLabel('Age');
    if ((await age.count()) && !(await age.inputValue())) await age.fill('40');
    if (await page.locator('button', { hasText: 'Use this plan' }).count()) await click('Use this plan');
    else await click('Continue');
    await page.waitForTimeout(150);
  }
  await expect('Runs and heart rate');
  if (!(await page.locator('button[aria-pressed=true]', { hasText: 'Runs and heart rate' }).count())) throw new Error('running should be preselected');
  if (await page.locator('button[aria-pressed=true]', { hasText: 'Fasting' }).count()) throw new Error('fasting must never be preselected');
  await click('Fasting'); await expect('eating disorder');
  await shot('01-modules');
  await click('Continue'); await click('Start training');

  // Today at 22:30, window closed at 20:00: the button starts the fast from the planned close.
  await page.waitForSelector('text=Window closed');
  await expect('since 20:00'); await expect('Running');
  await shot('02-today');
  await click('Since 20:00');
  await page.waitForSelector('text=9 h 30 to go'); await expect('2:30');

  await page.getByLabel('Open fasting').click();
  await page.waitForSelector('h1:has-text("Fasting")');
  await expect('Started'); await expect('Window opens');
  await expect('Goal'); await expect('12 h');
  await shot('03-fasting-running');
  await page.getByLabel('Close fasting').click(); await page.waitForTimeout(300);

  // Next morning at 08:15: goal reached; end the fast and rate it.
  await page.clock.setFixedTime(new Date('2026-11-13T08:15:00+01:00'));
  await page.getByLabel('Open fasting').click(); await page.waitForSelector('text=goal reached');
  await expect('+15 min');
  await page.locator('.overlay button', { hasText: 'End fast' }).click();
  await page.waitForSelector('text=How was this 12 h 15 fast?');
  await page.locator('.overlay').getByLabel('4 out of 5').click(); await page.waitForTimeout(300);
  await expectNot('How was this');
  await expect('Eating window open'); await expect('12 h 15'); await expect('felt 4/5');
  // Earlier days were not tracked: confirm one with the planned times.
  const before = (await text()).match(/(\d+)\/(\d+) Fasts logged/);
  await page.locator('.overlay .list button', { hasText: /^Done$/ }).first().click(); await page.waitForTimeout(400);
  const after = (await text()).match(/(\d+)\/(\d+) Fasts logged/);
  console.log('logged', before && before[0], '->', after && after[0]);
  if (!after || Number(after[1]) !== Number(before[1]) + 1) throw new Error('confirming a planned fast should add one');
  await shot('04-fasting-done');

  // Schedule: 16:8 for every day, then a very short Monday window warns.
  await page.locator('.overlay button', { hasText: '16:8' }).click(); await page.waitForTimeout(300);
  await expect('Skip breakfast');
  await page.getByLabel('Monday window opens').fill('15:00'); await page.waitForTimeout(300);
  await expect('under 8 hours'); await expect('Custom times');
  // Editing a fast rejects an end before the start.
  await page.locator('.overlay .list button', { hasText: '12 h 15' }).first().click();
  await page.waitForSelector('text=Edit fast');
  await page.locator('.sheet input[type="datetime-local"]').nth(1).fill('2026-11-12T19:00');
  await page.locator('.sheet button', { hasText: /^Save$/ }).click();
  await expect('The end must be after the start');
  await shot('05-fasting-edit');
  await page.locator('.sheet').getByLabel('Close', { exact: true }).click(); await page.waitForTimeout(200);
  await page.getByLabel('Close fasting').click(); await page.waitForTimeout(300);

  // Running on Progress.
  await tab('Progress');
  await expect('No runs yet');
  await page.locator('.card', { hasText: 'Running' }).locator('button', { hasText: 'Log' }).first().click();
  await page.getByLabel('Distance').fill('8'); await page.getByLabel('Time').fill('48:00');
  await expect('Pace 6:00 /km');
  await page.locator('.sheet input[type="datetime-local"]').fill('2026-11-10T18:00');
  await page.locator('.sheet button', { hasText: /^Save$/ }).click(); await page.waitForTimeout(400);
  await expect('8 km'); await expect('6:00 /km');
  await page.locator('.card', { hasText: 'Running' }).locator('button', { hasText: 'Log' }).first().click();
  await page.getByLabel('Distance').fill('9.5'); await page.getByLabel('Time').fill('57:00');
  // The warning needs the saved runs, read from the database after the sheet opens.
  await page.waitForSelector('text=more than 10 % longer', { timeout: 8000 }); await expect('(8 km)');
  await shot('06-run-warning');
  await page.locator('.sheet').getByLabel('Close', { exact: true }).click(); await page.waitForTimeout(200);

  // GPX import, then the same file again is detected as a duplicate.
  const pts = [];
  for (let i = 0; i <= 50; i++) pts.push(`<trkpt lat="${(48.85 + i * 0.0009).toFixed(5)}" lon="2.35"><time>2026-11-11T07:${String(Math.floor(i * 30 / 60)).padStart(2, '0')}:${String((i * 30) % 60).padStart(2, '0')}Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${130 + (i % 10)}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>`);
  const gpx = `<?xml version="1.0"?><gpx version="1.1" creator="test" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"><trk><name>Riverside</name><trkseg>${pts.join('')}</trkseg></trk></gpx>`;
  const file = `${out}/run.gpx`; fs.writeFileSync(file, gpx);
  await page.locator('input[type=file][accept*=gpx]').setInputFiles(file);
  await page.waitForSelector('text=1 run imported');
  await expect('5 km'); await expect('134 bpm');
  await page.locator('input[type=file][accept*=gpx]').setInputFiles(file);
  await page.waitForSelector('text=already logged');
  await shot('07-runs');

  // Zones and race equivalents.
  await click('Zones and paces'); await page.waitForSelector('text=Zone 2');
  await page.waitForSelector('text=108-126', { timeout: 8000 }); await expect('208 - 0.7');
  await page.getByLabel('Resting heart rate').fill('60'); await page.waitForTimeout(400);
  await page.waitForSelector('text=132-144', { timeout: 8000 }); await expect('heart-rate reserve');
  await page.getByLabel('Recent 5 km time').fill('25:00'); await page.waitForTimeout(400);
  await page.waitForSelector('text=52:07', { timeout: 8000 }); await expect('Likely optimistic'); await expect('Tempo: about');
  await shot('08-zones');
  await page.locator('.sheet').getByLabel('Close', { exact: true }).click(); await page.waitForTimeout(200);

  // Today: running card and the 10 % limit on a run day.
  await tab('Today');
  await expect('This week:'); await expect('Log run');

  // A run session saves a run with its distance.
  await click('Start workout'); await page.waitForSelector('.overlay'); await page.waitForTimeout(500);
  const runText = await page.locator('.overlay').innerText();
  console.log('PLAYER', runText.replace(/\s+/g, ' ').slice(0, 300));
  await shot('09a-player');
  for (let i = 0; i < 8; i++) {
    const ov = page.locator('.overlay');
    if (await ov.locator('button', { hasText: 'Finish and save' }).count()) break;
    const mark = ov.locator('button', { hasText: 'Mark as done' });
    if (await mark.count()) { await mark.first().click(); await page.waitForTimeout(300); }
    const nextBtn = ov.locator('button', { hasText: /^\s*Next/ });
    if (await nextBtn.count()) { await nextBtn.first().click(); await page.waitForTimeout(300); }
  }
  await page.locator('.overlay button', { hasText: /Finish (workout|and save)/ }).first().click();
  await page.waitForSelector('.sheet');
  await shot('09b-finish');
  if (!(await page.locator('.sheet').innerText()).includes('Distance (km, optional)')) throw new Error('distance field missing: ' + (await page.locator('.sheet').innerText()));
  await page.locator('.sheet').getByLabel('Distance').fill('3.2');
  await click('Save workout'); await page.waitForTimeout(600);
  await shot('09-player-saved');
  const close = page.locator('button', { hasText: /^(Done|Close)$/ });
  if (await close.count()) await close.first().click();
  await page.waitForTimeout(400);
  await tab('Progress');
  await expect('3.2 km');

  // Turning modules off hides their cards.
  await tab('Profile');
  await page.locator('button[role=switch]', { hasText: 'Fasting' }).click();
  await page.locator('button[role=switch]', { hasText: 'Running' }).click();
  await tab('Today'); await expectNot('Eating window'); await expectNot('Log run');

  console.log(errors.length ? 'ERRORS ' + errors.join('\n') : 'no console errors');
  if (errors.length) process.exitCode = 1;
  await browser.close();
  if (errors.length) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
