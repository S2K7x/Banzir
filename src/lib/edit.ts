import { getExercise } from '../data/exercises';
import { compatible, uid } from './matcher';
import type { Block, DayTemplate, Exercise, Goal, Item, Phase, Prescription, Program } from './schema';

/**
 * Pure editing operations on a program, used by the program builder. Each
 * returns a new program that still satisfies the schema. Day and item ids are
 * unique across the whole program, so they are enough to address anything.
 */

/** An edited template becomes the person's own program. */
const own = (p: Program): Program => (p.source === 'template' ? { ...p, source: 'user' } : p);

const mapDays = (p: Program, fn: (d: DayTemplate, phase: Phase) => DayTemplate): Program => ({
  ...p,
  phases: p.phases.map((ph) => ({ ...ph, days: ph.days.map((d) => fn(d, ph)) })),
});

const mapItems = (p: Program, fn: (i: Item) => Item | null): Program =>
  mapDays(p, (d) => ({
    ...d,
    blocks: d.blocks.map((b) => ({ ...b, items: b.items.flatMap((i) => fn(i) ?? []) })).filter((b) => b.items.length > 0),
  }));

/** A sensible default prescription for an exercise picked in the builder. */
export function defaultPrescription(ex: Exercise): Prescription {
  if (ex.logType === 'hold') return { mode: 'hold', sets: 3, seconds: [20, 40] };
  if (ex.logType === 'time' || ex.logType === 'distance') return { mode: 'time', seconds: 600 };
  return { mode: 'reps', sets: 3, reps: ex.range ?? [8, 12] };
}

export function newItem(ex: Exercise): Item {
  const prescription = defaultPrescription(ex);
  return {
    id: uid('i'),
    exerciseId: ex.id,
    priority: 1,
    prescription,
    restSeconds: prescription.mode === 'time' ? 0 : prescription.mode === 'hold' ? 60 : 90,
  };
}

/* ---------- Items ---------- */

/** Appends an exercise to the main part of a day. */
export function addItem(p: Program, dayId: string, ex: Exercise): Program {
  return own(
    mapDays(p, (d) => {
      if (d.id !== dayId) return d;
      const item = newItem(ex);
      const mainIndex = d.blocks.findIndex((b) => b.type === 'main');
      if (mainIndex >= 0) return { ...d, blocks: d.blocks.map((b, i) => (i === mainIndex ? { ...b, items: [...b.items, item] } : b)) };
      const main: Block = { id: uid('b'), type: 'main', items: [item] };
      const cooldownIndex = d.blocks.findIndex((b) => b.type === 'cooldown');
      const blocks = cooldownIndex >= 0 ? [...d.blocks.slice(0, cooldownIndex), main, ...d.blocks.slice(cooldownIndex)] : [...d.blocks, main];
      return { ...d, blocks };
    }),
  );
}

export function removeItem(p: Program, itemId: string): Program {
  return own(mapItems(p, (i) => (i.id === itemId ? null : i)));
}

export function updateItem(p: Program, itemId: string, patch: Partial<Omit<Item, 'id'>>): Program {
  return own(mapItems(p, (i) => (i.id === itemId ? { ...i, ...patch } : i)));
}

/** Moves an item up (-1) or down (+1) through the day, crossing into the neighbouring block at an edge. */
export function moveItem(p: Program, itemId: string, delta: -1 | 1): Program {
  return own(
    mapDays(p, (d) => {
      const bi = d.blocks.findIndex((b) => b.items.some((i) => i.id === itemId));
      if (bi < 0) return d;
      const block = d.blocks[bi];
      const ii = block.items.findIndex((i) => i.id === itemId);
      const target = ii + delta;
      if (target >= 0 && target < block.items.length) {
        const items = [...block.items];
        [items[ii], items[target]] = [items[target], items[ii]];
        return { ...d, blocks: d.blocks.map((b, i) => (i === bi ? { ...b, items } : b)) };
      }
      const neighbour = d.blocks[bi + delta];
      if (!neighbour) return d;
      const item = block.items[ii];
      const blocks = d.blocks
        .map((b, i) => {
          if (i === bi) return { ...b, items: b.items.filter((x) => x.id !== itemId) };
          if (i === bi + delta) return { ...b, items: delta === 1 ? [item, ...b.items] : [...b.items, item] };
          return b;
        })
        .filter((b) => b.items.length > 0);
      return { ...d, blocks };
    }),
  );
}

/** Changes one item's exercise, resetting the prescription if the old one no longer fits. */
export function setExercise(p: Program, itemId: string, exerciseId: string): Program {
  const ex = getExercise(exerciseId);
  return own(
    mapItems(p, (i) => {
      if (i.id !== itemId) return i;
      const keep = compatible(i.prescription.mode, ex);
      return { ...i, exerciseId, cue: undefined, prescription: keep ? i.prescription : defaultPrescription(ex) };
    }),
  );
}

/** Moves every use of an exercise to another, for stepping up or down a ladder across the whole plan. */
export function replaceExercise(p: Program, fromId: string, toId: string): Program {
  const to = getExercise(toId);
  return own(mapItems(p, (i) => (i.exerciseId === fromId && compatible(i.prescription.mode, to) ? { ...i, exerciseId: toId, cue: undefined } : i)));
}

/* ---------- Days ---------- */

const withDays = (p: Program, phaseId: string, fn: (days: DayTemplate[]) => DayTemplate[]): Program =>
  own({
    ...p,
    phases: p.phases.map((ph) => {
      if (ph.id !== phaseId) return ph;
      const days = fn(ph.days);
      // The builder keeps things simple: sessions follow the order of the days.
      return { ...ph, days, rotation: days.map((d) => d.id) };
    }),
  });

const phaseOf = (p: Program, dayId: string): Phase | undefined => p.phases.find((ph) => ph.days.some((d) => d.id === dayId));

export function addDay(p: Program, phaseId: string, name?: string): Program {
  return withDays(p, phaseId, (days) => [...days, { id: uid('d'), name: name ?? `Day ${days.length + 1}`, kind: 'mixed', focus: [], blocks: [] }]);
}

export function removeDay(p: Program, dayId: string): Program {
  const ph = phaseOf(p, dayId);
  if (!ph || ph.days.length <= 1) return p;
  return withDays(p, ph.id, (days) => days.filter((d) => d.id !== dayId));
}

export function moveDay(p: Program, dayId: string, delta: -1 | 1): Program {
  const ph = phaseOf(p, dayId);
  if (!ph) return p;
  return withDays(p, ph.id, (days) => {
    const i = days.findIndex((d) => d.id === dayId);
    const j = i + delta;
    if (j < 0 || j >= days.length) return days;
    const next = [...days];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
}

export function duplicateDay(p: Program, dayId: string): Program {
  const ph = phaseOf(p, dayId);
  if (!ph) return p;
  return withDays(p, ph.id, (days) => {
    const i = days.findIndex((d) => d.id === dayId);
    const src = days[i];
    const copy: DayTemplate = {
      ...src,
      id: uid('d'),
      name: `${src.name} copy`,
      blocks: src.blocks.map((b) => ({ ...b, id: uid('b'), items: b.items.map((it) => ({ ...it, id: uid('i') })) })),
    };
    return [...days.slice(0, i + 1), copy, ...days.slice(i + 1)];
  });
}

export function renameDay(p: Program, dayId: string, name: string): Program {
  return own(mapDays(p, (d) => (d.id === dayId ? { ...d, name } : d)));
}

/* ---------- Program ---------- */

export function updateMeta(p: Program, patch: { name?: string; description?: string; daysPerWeek?: number; deloadEveryWeeks?: number | null }): Program {
  const next: Program = own({ ...p });
  if (patch.name != null) next.name = patch.name;
  if (patch.description != null) next.description = patch.description;
  if (patch.daysPerWeek != null) {
    next.daysPerWeek = Math.min(7, Math.max(1, Math.round(patch.daysPerWeek)));
    next.daysRange = [1, 7];
  }
  if (patch.deloadEveryWeeks !== undefined) next.deloadEveryWeeks = patch.deloadEveryWeeks ?? undefined;
  return next;
}

export function blankProgram(name: string, goal: Goal, daysPerWeek: number): Program {
  const dayId = uid('d');
  return {
    id: uid('p'),
    schemaVersion: 1,
    name: name.trim() || 'My program',
    description: 'Your own program.',
    source: 'user',
    goal,
    level: 'intermediate',
    daysPerWeek,
    daysRange: [1, 7],
    sessionMinutes: 60,
    loops: true,
    phases: [{ id: uid('ph'), name: 'Base', weeks: 6, days: [{ id: dayId, name: 'Day 1', kind: 'mixed', focus: [], blocks: [] }], rotation: [dayId] }],
    progression: { type: 'double', stepKg: 2.5 },
    requires: [],
    tags: [],
    sources: [],
  };
}

/** A full copy with fresh ids, so the original and its history stay untouched. */
export function duplicateProgram(p: Program, name: string): Program {
  return {
    ...p,
    id: uid('p'),
    name,
    source: 'user',
    phases: p.phases.map((ph) => {
      const ids = new Map(ph.days.map((d) => [d.id, uid('d')]));
      return {
        ...ph,
        days: ph.days.map((d) => ({ ...d, id: ids.get(d.id)!, blocks: d.blocks.map((b) => ({ ...b, id: uid('b'), items: b.items.map((i) => ({ ...i, id: uid('i') })) })) })),
        rotation: ph.rotation.map((r) => ids.get(r) ?? r),
      };
    }),
  };
}

export const dayItemCount = (d: DayTemplate): number => d.blocks.reduce((n, b) => n + b.items.length, 0);
