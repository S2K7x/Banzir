import type { Program } from '../../lib/schema';
import { cal3Foundation, runStart } from './bodyweight-running';
import { fat3LiftWalk, gf3Start, mus3FullBody, mus4UpperLower, sptAthlete, str3Linear } from './strength';

/** Built-in templates. Specification: docs/programs/catalog.md. */
export const TEMPLATES: Program[] = [
  gf3Start,
  mus3FullBody,
  mus4UpperLower,
  str3Linear,
  cal3Foundation,
  runStart,
  fat3LiftWalk,
  sptAthlete,
];

export function getTemplate(id: string): Program | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
