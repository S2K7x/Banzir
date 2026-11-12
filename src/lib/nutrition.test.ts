import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { buildBackup, importBackup } from './backup';
import { addDays, logWeight, series, trend, weekAverage } from './body';
import { db } from './db';
import { mifflin, parseOffProduct, portion, suggestCorrection, targets, tooFast, totals, type NutritionSettings } from './nutrition';
import type { BodyEntry, FoodEntry, Profile } from './schema';

const person = (over: Partial<Profile> = {}): Profile => ({
  id: 'me',
  name: '',
  goal: 'fat_loss',
  level: 'intermediate',
  equipment: [],
  daysPerWeek: 3,
  sessionMinutes: 45,
  flags: [],
  ability: {},
  createdAt: '',
  age: 30,
  sex: 'male',
  heightCm: 180,
  weightKg: 80,
  ...over,
});
const settings = (over: Partial<NutritionSettings> = {}): NutritionSettings => ({ goal: 'maintain', ratePct: 0, pal: 1.6, adjustKcal: 0, ...over });

/** Weigh-ins every day for `days` days ending on `end`, changing by `perDay` kg. */
const weighIns = (end: string, days: number, startKg: number, perDay: number): BodyEntry[] =>
  Array.from({ length: days }, (_, i) => ({ date: addDays(end, -(days - 1 - i)), kg: startKg + perDay * i }));

describe('energy targets', () => {
  it('uses Mifflin-St Jeor times the activity level', () => {
    expect(mifflin(person())).toBe(1780);
    expect(mifflin(person({ sex: 'female' }))).toBe(1614);
    const t = targets(person(), settings());
    expect(t.maintenance).toBe(2850);
    expect(t.kcal).toBe(2850);
    expect(t.protein).toBe(128);
  });

  it('sets a moderate deficit with more protein, and fills carbohydrate last', () => {
    const t = targets(person(), settings({ goal: 'lose', ratePct: -0.5 }));
    expect(t.kcal).toBe(2410);
    expect(t.protein).toBe(160);
    expect(t.fat).toBe(67);
    expect(t.carbs).toBe(292);
    expect(t.protein! * 4 + t.carbs! * 4 + t.fat! * 9).toBeCloseTo(t.kcal!, -1);
  });

  it('caps the deficit and never goes under the floor', () => {
    const big = targets(person({ weightKg: 150 }), settings({ goal: 'lose', ratePct: -1 }));
    expect(big.kcal).toBeGreaterThanOrEqual(Math.round(big.maintenance! * 0.75) - 10);
    expect(big.notes.join(' ')).toContain('25 %');
    const small = targets(person({ sex: 'female', weightKg: 50, heightCm: 155, age: 60 }), settings({ goal: 'lose', ratePct: -1, pal: 1.45 }));
    expect(small.kcal).toBe(1200);
  });

  it('refuses a deficit for minors, in pregnancy and when underweight', () => {
    for (const p of [person({ age: 16 }), person({ flags: ['pregnant'] }), person({ weightKg: 55 })]) {
      const t = targets(p, settings({ goal: 'lose', ratePct: -0.5 }));
      expect(t.goal).toBe('maintain');
      expect(t.kcal).toBe(t.maintenance);
      expect(t.notes.length).toBeGreaterThan(0);
    }
  });

  it('bases protein on a reference weight with obesity, and reports missing data', () => {
    expect(targets(person({ weightKg: 120 }), settings()).protein).toBe(128);
    const t = targets(person({ age: undefined, sex: undefined }), settings());
    expect(t.kcal).toBeUndefined();
    expect(t.missing).toEqual(['age', 'sex']);
    expect(targets(person({ age: undefined }), settings({ manualKcal: 2200, manualProtein: 150 }))).toMatchObject({ kcal: 2200, protein: 150 });
  });
});

describe('weight trend', () => {
  const today = '2026-11-12';

  it('needs three weigh-ins in a week before trusting an average', () => {
    expect(weekAverage([{ date: today, kg: 80 }, { date: addDays(today, -1), kg: 81 }], today)).toBeNull();
    expect(weekAverage(weighIns(today, 3, 80, 0), today)).toBe(80);
  });

  it('measures the weekly rate from two 7-day averages', () => {
    const t = trend(weighIns(today, 14, 80, -0.05), today);
    expect(t.weeklyRatePct).toBeCloseTo(-0.44, 1);
    expect(series(weighIns(today, 14, 80, 0), 14, today)).toHaveLength(14);
  });

  it('suggests small corrections at most every two weeks', () => {
    const losing = settings({ goal: 'lose', ratePct: -0.5 });
    // Flat weight while trying to lose: eat a little less.
    expect(suggestCorrection(weighIns(today, 14, 80, 0), losing, today)?.kcal).toBe(-150);
    // Losing about 1 % a week: eat a little more.
    expect(suggestCorrection(weighIns(today, 14, 80, -0.115), losing, today)?.kcal).toBe(150);
    // On track: nothing.
    expect(suggestCorrection(weighIns(today, 14, 80, -0.057), losing, today)).toBeNull();
    // Not twice within 14 days, and not beyond 600 kcal.
    expect(suggestCorrection(weighIns(today, 14, 80, 0), { ...losing, adjustedAt: addDays(today, -5) }, today)).toBeNull();
    expect(suggestCorrection(weighIns(today, 14, 80, 0), { ...losing, adjustKcal: -600 }, today)).toBeNull();
  });

  it('warns when weight falls faster than 1 % a week for two weeks', () => {
    expect(tooFast(weighIns(today, 21, 80, -0.13), today)).toBe(true);
    expect(tooFast(weighIns(today, 21, 80, -0.05), today)).toBe(false);
  });
});

describe('food log', () => {
  const food = (time: string, protein: number, kcal = 400): FoodEntry => ({ id: time + protein, date: '2026-11-12', time, name: 'x', kcal, protein, carbs: 10, fat: 5 });

  it('adds up the day and counts protein-rich meals', () => {
    const t = totals([food('08:00', 35), food('08:00', 5), food('13:00', 20), food('19:00', 45)], 80);
    expect(t).toMatchObject({ kcal: 1600, protein: 105, meals: 3, proteinMeals: 2 });
  });

  it('reads Open Food Facts products and scales portions', () => {
    const hit = parseOffProduct({ code: '1', product_name: 'Skyr', brands: 'Brand, Other', serving_quantity: '150', nutriments: { energy_100g: 263.6, proteins_100g: 11, carbohydrates_100g: 4, fat_100g: 0.2 } })!;
    expect(hit).toMatchObject({ name: 'Skyr', brand: 'Brand', serving: 150, per100: { kcal: 63, protein: 11 } });
    expect(portion(hit, 150)).toEqual({ kcal: 95, protein: 16.5, carbs: 6, fat: 0.3, grams: 150 });
    expect(parseOffProduct({ product_name: 'No data', nutriments: {} })).toBeNull();
  });
});

describe('storage', () => {
  it('logs weight, keeps the profile current, and round-trips through a backup without the key', async () => {
    await db.delete();
    await db.open();
    await db.profile.put(person());
    await logWeight(79.44, '2026-11-11');
    await logWeight(79.2, '2026-11-12');
    expect((await db.profile.get('me'))!.weightKg).toBe(79.2);
    await db.foods.put({ id: 'f1', date: '2026-11-12', time: '08:00', name: 'Oats', kcal: 300 });
    await db.kv.put({ key: 'coach.config', value: { provider: 'anthropic', apiKey: 'sk-secret', model: 'm' } });

    const backup = await buildBackup();
    expect(backup.format).toBe(3);
    expect(backup.body).toHaveLength(2);
    expect(JSON.stringify(backup)).not.toContain('sk-secret');

    await importBackup(JSON.stringify({ ...backup, settings: undefined }));
    expect(await db.body.count()).toBe(2);
    expect(await db.foods.count()).toBe(1);
    // The key on this device survives the restore.
    expect(((await db.kv.get('coach.config'))!.value as { apiKey: string }).apiKey).toBe('sk-secret');

    // A format-1 file (no body or food tables) still restores.
    await importBackup(JSON.stringify({ ...backup, format: 1, body: undefined, foods: undefined, settings: undefined }));
    expect(await db.body.count()).toBe(0);
  });
});
