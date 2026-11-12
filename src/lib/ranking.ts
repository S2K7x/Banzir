import { TEMPLATES } from '../data/templates';
import { equipmentSet, instantiate, levelIndex, type Instance } from './matcher';
import type { Goal, Profile, Program } from './schema';

/**
 * Ranks the built-in plans for a person. Kept apart from the matcher so the
 * template data only loads with the screens that choose a plan.
 */

const RELATED_GOALS: Partial<Record<Goal, Partial<Record<Goal, number>>>> = {
  fat_loss: { general_fitness: 45, muscle: 30 },
  general_fitness: { fat_loss: 35, muscle: 30, calisthenics: 20 },
  muscle: { strength: 40, general_fitness: 30 },
  strength: { muscle: 40 },
  calisthenics: { general_fitness: 25 },
  sport: { strength: 30, general_fitness: 30 },
  running: { general_fitness: 10 },
};

export type Match = Instance & { template: Program; score: number };

export function rankTemplates(profile: Profile): Match[] {
  const cautious = profile.flags.length > 0;
  return TEMPLATES.map((template) => {
    const inst = instantiate(template, profile);
    let score = template.goal === profile.goal ? 100 : (RELATED_GOALS[profile.goal]?.[template.goal] ?? 0);
    const diff = levelIndex(template.level) - levelIndex(cautious ? 'beginner' : profile.level);
    score += diff > 0 ? -40 * diff : 20 + 8 * diff;
    const [min, max] = template.daysRange;
    const d = profile.daysPerWeek;
    if (d >= min && d <= max) score += 15 + (d === template.daysPerWeek ? 5 : 0);
    else score -= 10 * Math.min(Math.abs(d - min), Math.abs(d - max));
    score -= 30 * inst.droppedCore + 2 * inst.swaps;
    const eq = equipmentSet(profile.equipment);
    if (template.requires.some((e) => !eq.has(e))) score -= 120;
    if (profile.focus && template.tags.includes(profile.focus)) score += 35;
    // Add-ons (daily mobility) only come first when asked for by name.
    if (template.tags.includes('addon') && !(profile.focus && template.tags.includes(profile.focus))) score -= 80;
    // Things the plan assumes you can already do. Unknown means not penalised,
    // except that a running beginner who did not answer is assumed to be starting out.
    const able = { ...profile.ability };
    if (able.runMinutes == null && profile.goal === 'running' && profile.level === 'beginner') able.runMinutes = 0;
    for (const [k, need] of Object.entries(template.prerequisites ?? {}) as [keyof typeof able, number | undefined][]) {
      const have = able[k];
      if (need != null && have != null && have < need) score -= 100;
    }
    if ((profile.age ?? 0) >= 60 && template.tags.includes('senior')) score += 30;
    const bmi = profile.weightKg && profile.heightCm ? profile.weightKg / (profile.heightCm / 100) ** 2 : 0;
    if ((bmi >= 30 || profile.flags.includes('joint')) && template.tags.includes('low-impact')) score += 25;
    score -= Math.abs(template.sessionMinutes - profile.sessionMinutes) / 5;
    return { ...inst, template, score };
  }).sort((a, b) => b.score - a.score);
}

