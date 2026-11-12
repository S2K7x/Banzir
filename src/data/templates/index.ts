import type { Program } from '../../lib/schema';
import { cal3Foundation, runStart } from './bodyweight-running';
import { fat4Mixed, fatLowImpact, gf2Express, gf4Hybrid, gfSenior, mobDaily, mus3Home, mus5UlPpl, mus6Ppl, str4Block, str4Undulating } from './general';
import { run10k, run5k, runHalf, runMarathon, runStrength } from './running';
import { cal4Intermediate, calFirstPullup, calFrontLever, calHandstand, calMuscleUp, calPlanche, calPlancheOs } from './skills';
import { sptBasketball, sptBoxing, sptSoccer, sptTennis } from './sport';
import { fat3LiftWalk, gf3Start, mus3FullBody, mus4UpperLower, sptAthlete, str3Linear } from './strength';

/** Built-in templates. Specification: docs/programs/catalog.md. */
export const TEMPLATES: Program[] = [
  // General fitness
  gf3Start,
  gf2Express,
  gf4Hybrid,
  gfSenior,
  mobDaily,
  // Muscle
  mus3FullBody,
  mus3Home,
  mus4UpperLower,
  mus5UlPpl,
  mus6Ppl,
  // Strength
  str3Linear,
  str4Undulating,
  str4Block,
  // Calisthenics
  cal3Foundation,
  calFirstPullup,
  calHandstand,
  cal4Intermediate,
  calPlanche,
  calFrontLever,
  calMuscleUp,
  calPlancheOs,
  // Running
  runStart,
  run5k,
  run10k,
  runHalf,
  runMarathon,
  runStrength,
  // Fat loss
  fat3LiftWalk,
  fat4Mixed,
  fatLowImpact,
  // Sport
  sptAthlete,
  sptBoxing,
  sptTennis,
  sptSoccer,
  sptBasketball,
];

export function getTemplate(id: string): Program | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
