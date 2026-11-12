import { addDays, dayKey, trend } from './body';
import { db, getKV, setKV } from './db';
import { getSettings } from './settings';
import { uid } from './matcher';
import type { BodyEntry, FoodEntry, Profile } from './schema';

/**
 * Calorie and macro targets, the food log, and the weight-trend correction.
 * Every number here traces to docs/science/nutrition-fat-loss.md; the safety
 * rules follow docs/science/populations-safety.md.
 *
 * Energy targets are only a starting estimate: prediction equations can be off
 * by 10 % or more for an individual, and the energy content of weight change is
 * not a constant (early loss is largely water). The weight trend corrects the
 * target in small steps instead.
 */

export type NutritionGoal = 'lose' | 'maintain' | 'gain';

/** Physical activity levels (total energy / basal energy), FAO/WHO/UNU 2001 ranges. */
export const ACTIVITY: { pal: number; label: string; detail: string }[] = [
  { pal: 1.45, label: 'Mostly sitting', detail: 'Desk job, little walking, light training' },
  { pal: 1.6, label: 'Lightly active', detail: 'Some walking every day, training 2-3 times a week' },
  { pal: 1.75, label: 'Active', detail: 'On your feet often or training 4-5 times a week' },
  { pal: 1.95, label: 'Very active', detail: 'Physical job or hard training most days' },
  { pal: 2.2, label: 'Extremely active', detail: 'Hard physical work plus training, or endurance athlete' },
];

export const LOSE_RATES = [0.25, 0.5, 0.75, 1];
export const GAIN_RATES = [0.1, 0.25, 0.5];

export type NutritionSettings = {
  goal: NutritionGoal;
  /** % of body weight per week; negative to lose. */
  ratePct: number;
  pal: number;
  /** Correction from the weight trend, applied on top of the estimate. */
  adjustKcal: number;
  adjustedAt?: string;
  /** Fixed targets typed by the person; they replace the calculation. */
  manualKcal?: number;
  manualProtein?: number;
};

const KEY = 'nutrition.settings';

export function defaultSettings(profile: Profile | undefined): NutritionSettings {
  const pal = !profile ? 1.6 : profile.daysPerWeek >= 5 ? 1.75 : profile.daysPerWeek >= 3 ? 1.6 : 1.45;
  const bmi = bmiOf(profile);
  if (profile?.goal === 'fat_loss') return { goal: 'lose', ratePct: -0.5, pal, adjustKcal: 0 };
  // Beginners and people with more body fat build muscle well at maintenance (recomposition).
  if (profile?.goal === 'muscle' && profile.level !== 'beginner' && (bmi == null || bmi < 25)) return { goal: 'gain', ratePct: 0.25, pal, adjustKcal: 0 };
  return { goal: 'maintain', ratePct: 0, pal, adjustKcal: 0 };
}

export async function getNutritionSettings(profile: Profile | undefined): Promise<NutritionSettings> {
  return (await getKV<NutritionSettings>(KEY)) ?? defaultSettings(profile);
}
export const saveNutritionSettings = (s: NutritionSettings) => setKV(KEY, s);

/* ---------- Targets ---------- */

export function bmiOf(p: Profile | undefined): number | undefined {
  return p?.weightKg && p.heightCm ? p.weightKg / (p.heightCm / 100) ** 2 : undefined;
}

/** Resting energy, Mifflin-St Jeor. */
export function mifflin(p: Pick<Profile, 'weightKg' | 'heightCm' | 'age' | 'sex'>): number | undefined {
  if (!p.weightKg || !p.heightCm || !p.age || !p.sex) return undefined;
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
}

/** Planning value for the energy in a kilogram of body weight change. Only used for the starting estimate. */
const KCAL_PER_KG = 7700;

export type Targets = {
  /** Estimated maintenance (total daily energy). */
  maintenance?: number;
  kcal?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  /** Goal actually used after safety rules. */
  goal: NutritionGoal;
  ratePct: number;
  notes: string[];
  missing: string[];
};

const round = (n: number, step = 1) => Math.round(n / step) * step;

export function targets(profile: Profile | undefined, s: NutritionSettings): Targets {
  const notes: string[] = [];
  const missing = (['weightKg', 'heightCm', 'age', 'sex'] as const).filter((k) => !profile?.[k]).map((k) => ({ weightKg: 'weight', heightCm: 'height', age: 'age', sex: 'sex' })[k]);
  let goal = s.goal;
  let ratePct = goal === 'maintain' ? 0 : s.ratePct;

  // Safety: no calorie deficit for minors, during pregnancy, or when underweight.
  const bmi = bmiOf(profile);
  if (goal === 'lose') {
    const reason = profile?.age != null && profile.age < 18 ? 'Under 18, the app does not set a calorie deficit.' : profile?.flags.includes('pregnant') ? 'During pregnancy and after birth, the app does not set a calorie deficit. Ask your midwife or doctor.' : bmi != null && bmi < 18.5 ? 'Your weight is already low for your height, so the app does not set a deficit. Talk to a professional if you want to lose more.' : null;
    if (reason) {
      notes.push(reason);
      goal = 'maintain';
      ratePct = 0;
    }
  }
  ratePct = Math.max(-1, Math.min(0.5, ratePct));

  const weight = profile?.weightKg;
  // People with obesity get protein from a reference weight, so targets are not inflated.
  const proteinWeight = weight && bmi != null && bmi >= 30 && profile?.heightCm ? profile.heightCm - 100 : weight;
  const proteinPerKg = goal === 'lose' ? 2.0 : 1.6;
  const protein = s.manualProtein ?? (proteinWeight ? round(proteinWeight * proteinPerKg) : undefined);

  const rmr = profile ? mifflin(profile) : undefined;
  const maintenance = rmr ? round(rmr * s.pal, 10) : undefined;
  let kcal: number | undefined;
  if (s.manualKcal) kcal = s.manualKcal;
  else if (maintenance && weight) {
    let change = (ratePct / 100) * weight * (KCAL_PER_KG / 7);
    // A deficit never goes beyond 25 % of maintenance.
    if (change < -0.25 * maintenance) {
      change = -0.25 * maintenance;
      notes.push('The deficit is capped at 25 % below maintenance.');
    }
    kcal = round(maintenance + change + s.adjustKcal, 10);
  }
  if (kcal != null) {
    const floor = profile?.sex === 'female' ? 1200 : 1500;
    if (kcal < floor) {
      kcal = floor;
      notes.push(`Calories never go below ${floor} kcal a day in this app.`);
    }
  }
  // Fat about a quarter of energy, never under 0.6 g/kg; carbohydrate fills the rest.
  const fat = kcal && weight ? round(Math.max(0.6 * weight, (0.25 * kcal) / 9)) : undefined;
  const carbs = kcal != null && fat != null && protein != null ? Math.max(0, round((kcal - protein * 4 - fat * 9) / 4)) : undefined;
  return { maintenance, kcal, protein, fat, carbs, goal, ratePct, notes, missing };
}

/* ---------- Weight-trend correction ---------- */

export type Correction = { kcal: number; reason: string } | null;

/** Steps of at most 150 kcal, at most every 14 days, total at most 600 kcal either way. */
export function suggestCorrection(entries: BodyEntry[], s: NutritionSettings, today = dayKey()): Correction {
  if (s.manualKcal) return null;
  if (s.adjustedAt && s.adjustedAt > addDays(today, -14)) return null;
  const { weeklyRatePct: rate } = trend(entries, today);
  if (rate == null) return null;
  const target = s.goal === 'maintain' ? 0 : s.ratePct;
  const band = s.goal === 'gain' ? 0.15 : 0.25;
  const fmt = (x: number) => `${x > 0 ? '+' : ''}${x.toFixed(2)} %`;
  if (rate > target + band && s.adjustKcal > -600)
    return { kcal: -150, reason: `Your 7-day average moved ${fmt(rate)} a week, above your target of ${fmt(target)}. Eating 150 kcal less a day should bring it back on track.` };
  if (rate < target - band && s.adjustKcal < 600)
    return { kcal: 150, reason: `Your 7-day average moved ${fmt(rate)} a week, below your target of ${fmt(target)}. Eating 150 kcal more a day should bring it back on track.` };
  return null;
}

/** Losing more than about 1 % a week for two weeks running is a warning sign. */
export function tooFast(entries: BodyEntry[], today = dayKey()): boolean {
  const now = trend(entries, today).weeklyRatePct;
  const before = trend(entries, addDays(today, -7)).weeklyRatePct;
  return now != null && before != null && now <= -1 && before <= -1;
}

/* ---------- Food log ---------- */

export type DayTotals = { kcal: number; protein: number; carbs: number; fat: number; meals: number; proteinMeals: number };

/** A meal counts as protein-rich from 0.4 g per kg of body weight. */
export function totals(foods: FoodEntry[], weightKg?: number): DayTotals {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, meals: 0, proteinMeals: 0 };
  const byTime = new Map<string, number>();
  for (const f of foods) {
    t.kcal += f.kcal;
    t.protein += f.protein ?? 0;
    t.carbs += f.carbs ?? 0;
    t.fat += f.fat ?? 0;
    byTime.set(f.time, (byTime.get(f.time) ?? 0) + (f.protein ?? 0));
  }
  t.meals = byTime.size;
  if (weightKg) t.proteinMeals = [...byTime.values()].filter((p) => p >= 0.4 * weightKg).length;
  return { ...t, kcal: Math.round(t.kcal), protein: Math.round(t.protein), carbs: Math.round(t.carbs), fat: Math.round(t.fat) };
}

/** Energy from macros (4/4/9 kcal per gram), for checking a label or filling a missing value. */
export const kcalFromMacros = (protein = 0, carbs = 0, fat = 0) => Math.round(protein * 4 + carbs * 4 + fat * 9);

export async function addFood(f: Omit<FoodEntry, 'id'>): Promise<FoodEntry> {
  const entry = { ...f, id: uid('f') };
  await db.foods.put(entry);
  // With the fasting module on, a meal logged during a running fast ends it at the meal time.
  if (getSettings().modules.fasting) await (await import('./fasting')).endFastWithMeal(entry.date, entry.time);
  return entry;
}
export const deleteFood = (id: string) => db.foods.delete(id);
export const foodsOn = (date: string) => db.foods.where('date').equals(date).sortBy('time');

/** Recently logged foods, most recent first, one per name. */
export async function recentFoods(limit = 30): Promise<FoodEntry[]> {
  const all = await db.foods.orderBy('date').reverse().limit(400).toArray();
  const seen = new Set<string>();
  const out: FoodEntry[] = [];
  for (const f of all) {
    const k = f.name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(f);
    if (out.length >= limit) break;
  }
  return out;
}

export type Favourite = Pick<FoodEntry, 'name' | 'kcal' | 'protein' | 'carbs' | 'fat' | 'grams' | 'code'>;
export const getFavourites = async () => (await getKV<Favourite[]>('nutrition.favourites')) ?? [];
export async function toggleFavourite(f: Favourite): Promise<boolean> {
  const list = await getFavourites();
  const exists = list.some((x) => x.name.toLowerCase() === f.name.toLowerCase());
  await setKV('nutrition.favourites', exists ? list.filter((x) => x.name.toLowerCase() !== f.name.toLowerCase()) : [...list, f]);
  return !exists;
}

/* ---------- Water ---------- */

/** A starting point of about 35 ml per kg a day, plus what you sweat. */
export const waterTarget = (weightKg?: number) => (weightKg ? round(weightKg * 35, 250) : 2000);
export async function getWater(date: string): Promise<number> {
  return (await getKV<Record<string, number>>('nutrition.water'))?.[date] ?? 0;
}
export async function addWater(date: string, ml: number): Promise<void> {
  const all = (await getKV<Record<string, number>>('nutrition.water')) ?? {};
  const cutoff = addDays(dayKey(), -90);
  const kept = Object.fromEntries(Object.entries(all).filter(([d]) => d >= cutoff));
  await setKV('nutrition.water', { ...kept, [date]: Math.max(0, (kept[date] ?? 0) + ml) });
}

/* ---------- Open Food Facts ---------- */

export type FoodHit = { code: string; name: string; brand?: string; per100: { kcal: number; protein?: number; carbs?: number; fat?: number }; serving?: number };

type OffProduct = { code?: string; product_name?: string; brands?: string; serving_quantity?: number | string; nutriments?: Record<string, number | string | undefined> };

const num = (v: unknown) => (v == null || v === '' ? undefined : Number(v));

export function parseOffProduct(p: OffProduct): FoodHit | null {
  const n = p.nutriments ?? {};
  const kcal = num(n['energy-kcal_100g']) ?? (num(n['energy_100g']) != null ? Number(n['energy_100g']) / 4.184 : undefined);
  if (!p.product_name || kcal == null || !Number.isFinite(kcal)) return null;
  const serving = num(p.serving_quantity);
  return {
    code: String(p.code ?? ''),
    name: p.product_name.trim(),
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    per100: { kcal: Math.round(kcal), protein: num(n['proteins_100g']), carbs: num(n['carbohydrates_100g']), fat: num(n['fat_100g']) },
    serving: serving && serving > 0 ? serving : undefined,
  };
}

/**
 * Searches Open Food Facts (data under the Open Database Licence). Their API
 * allows about 10 searches a minute, so the app searches only on request.
 */
export async function searchFoods(query: string, signal?: AbortSignal): Promise<FoodHit[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=24&fields=code,product_name,brands,nutriments,serving_quantity`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(response.status === 429 ? 'Too many searches. Wait a minute and try again.' : 'The food database did not answer.');
  const body = (await response.json()) as { products?: OffProduct[] };
  return (body.products ?? []).map(parseOffProduct).filter((x): x is FoodHit => !!x);
}

/** Scales a database entry to a portion. */
export function portion(hit: FoodHit, grams: number): Pick<FoodEntry, 'kcal' | 'protein' | 'carbs' | 'fat' | 'grams'> {
  const f = grams / 100;
  const r = (v?: number) => (v == null ? undefined : Math.round(v * f * 10) / 10);
  return { kcal: Math.round(hit.per100.kcal * f), protein: r(hit.per100.protein), carbs: r(hit.per100.carbs), fat: r(hit.per100.fat), grams };
}
