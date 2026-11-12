import type { Program } from '../../lib/schema';
import { cal3Foundation, runStart } from './bodyweight-running';
import { cal4Intermediate, calFirstPullup, calFrontLever, calHandstand, calMuscleUp, calPlanche, calPlancheOs } from './skills';
import { fat3LiftWalk, gf3Start, mus3FullBody, mus4UpperLower, sptAthlete, str3Linear } from './strength';

/** Built-in templates. Specification: docs/programs/catalog.md. */
export const TEMPLATES: Program[] = [
  gf3Start,
  mus3FullBody,
  mus4UpperLower,
  str3Linear,
  cal3Foundation,
  calFirstPullup,
  calHandstand,
  cal4Intermediate,
  calPlanche,
  calFrontLever,
  calMuscleUp,
  calPlancheOs,
  runStart,
  fat3LiftWalk,
  sptAthlete,
];

export function getTemplate(id: string): Program | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
