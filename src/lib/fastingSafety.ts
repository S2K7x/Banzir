import type { Profile } from './schema';

/**
 * Who the fasting module is not offered to. Kept apart from fasting.ts so the
 * app shell can check it without loading the module.
 * Rules: docs/science/populations-safety.md.
 */

/** Why fasting is not offered to this person, or null. */
export function fastingBlocked(profile: Pick<Profile, 'age' | 'flags' | 'heightCm' | 'weightKg'> | null | undefined): string | null {
  if (!profile) return null;
  if (profile.age != null && profile.age < 18) return 'Fasting is not offered under 18. Regular meals support growth and training.';
  if (profile.flags.includes('pregnant')) return 'Fasting is not offered during pregnancy or after giving birth. Ask your midwife or doctor about meal timing.';
  if (profile.heightCm && profile.weightKg && profile.weightKg / (profile.heightCm / 100) ** 2 < 18.5) return 'Your weight is already low for your height, so fasting is not offered. Talk to a professional if you are unsure.';
  return null;
}

/** Shown whenever fasting is turned on. */
export const FASTING_CAUTION =
  'Skip fasting if you have had an eating disorder, and talk to your diabetes team first if you take insulin or tablets that can cause low blood sugar. Stop if you feel faint, shaky or unwell.';
