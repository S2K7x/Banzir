import type { Block, DayTemplate, Effort, Item, Phase, Program, ProgressionRule, Segment } from '../../lib/schema';

/**
 * Small constructors that keep template files readable. Their output is plain
 * data matching the program schema; nothing here runs at workout time.
 */

type ItemOpts = {
  rest?: number;
  p?: 1 | 2 | 3;
  alt?: string[];
  cue?: string;
  rir?: [number, number];
  prog?: ProgressionRule;
};

type Draft = Omit<Item, 'id'>;

const rir = (v?: [number, number]): Effort | undefined => (v ? { type: 'rir', value: v } : undefined);

/** Sets of repetitions. */
export function r(exerciseId: string, sets: number, lo: number, hi: number, o: ItemOpts = {}): Draft {
  return {
    exerciseId,
    alternatives: o.alt,
    priority: o.p ?? 1,
    prescription: { mode: 'reps', sets, reps: [lo, hi], target: rir(o.rir) },
    restSeconds: o.rest ?? 90,
    cue: o.cue,
    progression: o.prog,
  };
}

/** Sets of timed holds (seconds). */
export function h(exerciseId: string, sets: number, lo: number, hi: number, o: ItemOpts = {}): Draft {
  return {
    exerciseId,
    alternatives: o.alt,
    priority: o.p ?? 1,
    prescription: { mode: 'hold', sets, seconds: [lo, hi] },
    restSeconds: o.rest ?? 60,
    cue: o.cue,
    progression: o.prog,
  };
}

/** One continuous block of time (minutes). */
export function t(exerciseId: string, minutes: number, o: ItemOpts & { effort?: Effort } = {}): Draft {
  return {
    exerciseId,
    alternatives: o.alt,
    priority: o.p ?? 1,
    prescription: { mode: 'time', seconds: Math.round(minutes * 60), target: o.effort },
    restSeconds: 0,
    cue: o.cue,
    progression: { type: 'none' },
  };
}

export const seg = (label: string, seconds: number, kind: 'work' | 'rest' = 'work'): Segment => ({ label, seconds, kind });

/** Repeated timed segments, for example run 1 min / walk 90 s. */
export function iv(exerciseId: string, reps: number, segments: Segment[], o: ItemOpts & { effort?: Effort } = {}): Draft {
  return {
    exerciseId,
    priority: o.p ?? 1,
    prescription: { mode: 'intervals', reps, segments, target: o.effort },
    restSeconds: 0,
    cue: o.cue,
    progression: { type: 'none' },
  };
}

type DayParts = { warmup?: Draft[]; main: Draft[]; cooldown?: Draft[]; notes?: string };

export function day(id: string, name: string, kind: DayTemplate['kind'], focus: string[], parts: DayParts): DayTemplate {
  const block = (type: Block['type'], drafts: Draft[] | undefined): Block[] =>
    drafts && drafts.length
      ? [{ id: `${id}.${type}`, type, items: drafts.map((d, i) => ({ ...d, id: `${id}.${type}.${i}.${d.exerciseId}` })) }]
      : [];
  return {
    id,
    name,
    kind,
    focus,
    blocks: [...block('warmup', parts.warmup), ...block('main', parts.main), ...block('cooldown', parts.cooldown)],
    notes: parts.notes,
  };
}

export function phase(id: string, name: string, weeks: number, days: DayTemplate[], rotation?: string[]): Phase {
  return { id, name, weeks, days, rotation: rotation ?? days.map((d) => d.id) };
}

type Meta = Omit<Program, 'schemaVersion' | 'source' | 'templateId' | 'tags' | 'sources' | 'requires'> & {
  tags?: string[];
  sources?: string[];
  requires?: Program['requires'];
};

export function template(meta: Meta): Program {
  return {
    schemaVersion: 1,
    source: 'template',
    templateId: meta.id,
    tags: [],
    sources: [],
    requires: [],
    ...meta,
  };
}

export const WARMUP = [t('warmup_general', 5, { p: 2 })];
export const DOUBLE: ProgressionRule = { type: 'double', stepKg: 2.5 };
export const VARIATION: ProgressionRule = { type: 'variation' };
