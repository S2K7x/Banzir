// A demo account for screenshots, the presentation video and social posts:
// onboarding as "Alex" (muscle, gym), all modules on, three weeks of
// workouts, weigh-ins, food, runs and fasts, and a short coach conversation.
// The data is invented and only lives in the browser that runs the script.

/** Clicks the first button containing `name`. */
export const clicker = (page) => (name) => page.locator('button', { hasText: name }).first().click({ timeout: 8000 });

export async function onboard(page, { name = 'Alex' } = {}) {
  const click = clicker(page);
  await page.fill('input[placeholder="First name"]', name);
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
  for (const m of ['Food and calories', 'Body weight', 'Runs and heart rate', 'Fasting']) {
    const chip = page.locator('button[aria-pressed=false]', { hasText: m });
    if (await chip.count()) await chip.click();
  }
  await click('Continue');
  await click('Start training');
  await page.waitForSelector('text=This week');
}

/** Writes the sample history straight into IndexedDB, then reloads. */
export async function seed(page, { promptVersion = 'p2-t3' } = {}) {
  await page.evaluate(async (promptVersion) => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('banzir');
      r.onsuccess = () => res(r.result);
      r.onerror = rej;
    });
    const tx = (store, mode = 'readwrite') => db.transaction(store, mode).objectStore(store);
    const put = (store, rows) =>
      new Promise((res, rej) => {
        const t = db.transaction(store, 'readwrite');
        rows.forEach((r) => t.objectStore(store).put(r));
        t.oncomplete = res;
        t.onerror = rej;
      });
    const get = (store, key) =>
      new Promise((res) => {
        const r = tx(store, 'readonly').get(key);
        r.onsuccess = () => res(r.result);
      });
    const day = (n, h = 7, m = 30) => {
      const d = new Date(Date.now() - n * 86400000);
      d.setHours(h, m, 0, 0);
      return d;
    };
    const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Workouts: the plan's two full-body days, alternating, with slowly rising loads.
    const state = (await get('kv', 'state'))?.value;
    const program = state ? await get('programs', state.programId) : undefined;
    const days = program?.phases[0].days ?? [];
    const sessions = [];
    const when = [20, 18, 15, 13, 11, 8, 6, 4, 1];
    when.forEach((n, i) => {
      const d = days[i % Math.max(1, days.length)];
      if (!d) return;
      const items = d.blocks.flatMap((b) => b.items).filter((it) => it.prescription.mode === 'reps');
      const step = Math.floor(i / 2);
      sessions.push({
        id: `demo_s${i}`,
        date: day(n, 18, 10).toISOString(),
        programId: program.id,
        dayId: d.id,
        dayName: d.name,
        durationSeconds: 2700 + (i % 3) * 300,
        effort: [6, 7, 7, 8][i % 4],
        entries: items.map((it, k) => ({
          itemId: it.id,
          exerciseId: it.exerciseId,
          sets: Array.from({ length: it.prescription.sets }, (_, s) => ({ reps: it.prescription.reps[1] - (s === 2 ? 1 : 0), kg: [40, 32.5, 30, 20, 25, 12.5, 15][k % 7] + step * 2.5, done: true })),
        })),
      });
    });
    await put('sessions', sessions);
    if (state) await put('kv', [{ key: 'state', value: { ...state, completed: sessions.length, startedAt: day(21).toISOString() } }]);

    await put('body', Array.from({ length: 21 }, (_, i) => ({ date: key(day(i)), kg: Math.round((64.6 - i * 0.03 + ((i * 7) % 5) * 0.08) * 10) / 10 })));
    await put('foods', [
      { id: 'demo_f1', date: key(day(0)), time: '08:10', name: 'Greek yoghurt, oats and berries', kcal: 420, protein: 28, carbs: 52, fat: 10 },
      { id: 'demo_f2', date: key(day(0)), time: '13:00', name: 'Chicken, rice and greens', kcal: 610, protein: 45, carbs: 70, fat: 14 },
      { id: 'demo_f3', date: key(day(0)), time: '16:30', name: 'Banana and peanut butter', kcal: 260, protein: 8, carbs: 30, fat: 12 },
    ]);
    await put('kv', [
      { key: 'nutrition.water', value: { [key(day(0))]: 1500 } },
      // Building muscle with a small surplus; the weight trend is on target, so no correction shows.
      { key: 'nutrition.settings', value: { goal: 'gain', ratePct: 0.25, pal: 1.6, adjustKcal: 0 } },
    ]);
    await put('runs', [
      { id: 'demo_r1', date: day(2, 18).toISOString(), seconds: 1860, meters: 5200, kind: 'easy', source: 'gpx', avgHr: 142 },
      { id: 'demo_r2', date: day(6, 9).toISOString(), seconds: 2700, meters: 7400, kind: 'long', source: 'gpx', avgHr: 145 },
      { id: 'demo_r3', date: day(10, 18).toISOString(), seconds: 1500, meters: 4300, kind: 'easy', source: 'manual' },
      { id: 'demo_r4', date: day(16, 9).toISOString(), seconds: 2400, meters: 6600, kind: 'long', source: 'gpx', avgHr: 147 },
    ]);
    await put('kv', [{ key: 'running.settings', value: { restHr: 56, fiveK: 1620 } }]);
    await put('fasts', [
      { id: 'demo_x1', start: day(1, 20).toISOString(), end: day(0, 8, 5).toISOString(), feel: 4 },
      { id: 'demo_x2', start: day(2, 20).toISOString(), end: day(1, 8).toISOString(), feel: 5 },
      { id: 'demo_x3', start: day(3, 20, 30).toISOString(), end: day(2, 7, 50).toISOString(), feel: 3 },
    ]);

    // A coach conversation, so the Coach tab shows a real exchange.
    const at = day(0, 12).toISOString();
    await put('kv', [
      { key: 'coach.config', value: { provider: 'anthropic', apiKey: 'demo', model: 'claude-opus-5-5' } },
      {
        key: 'coach.chat',
        value: {
          promptVersion,
          epoch: 0,
          cut: 0,
          messages: [
            { id: 'm1', role: 'user', text: 'My squat felt heavy this week. Should I push on or back off?', at },
            {
              id: 'm2',
              role: 'assistant',
              text: 'You added 2.5 kg to the squat three sessions in a row and your effort ratings went from 6 to 8. That is normal progress, not a problem yet.\n\n- Keep the load and aim for the top of the range (10 reps) before adding weight again.\n- Sleep matters most this week: 7 to 9 hours.\n\nIf it still feels heavy next week, a lighter week (half the sets, same loads) would help you recover. I can set that up for you.',
              toolCalls: [],
              epoch: 0,
              stop: 'end',
              at,
              proposals: [
                { id: 'p1', kind: 'lighter_week', title: 'Lighter week now', lines: ['Half the sets on every exercise this week', 'Same loads, so you keep your strength'], payload: null, status: 'pending' },
              ],
            },
          ],
        },
      },
      { key: 'coach.memory', value: [{ id: 'n1', text: 'Trains after work, 3 times a week. Wants a stronger squat and to run a 10 km in spring.', at }] },
    ]);
  }, promptVersion);
  await page.reload();
  await page.waitForSelector('text=This week');
  await page.waitForTimeout(500);
}
