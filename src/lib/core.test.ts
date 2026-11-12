import { describe, expect, it } from 'vitest';
import { EXERCISES, findExercise, getExercise, rx } from '../data/exercises';
import { TEMPLATES, getTemplate } from '../data/templates';
import { canDo, estimateMinutes, instantiate, rankTemplates } from './matcher';
import { lighten, position } from './programState';
import { suggest } from './progression';
import { EQUIPMENT, Exercise, Program, type Entry, type Equipment, type Goal, type Item, type Profile } from './schema';
import { weekStart, weekStreak } from './stats';

const profile = (over: Partial<Profile> = {}): Profile => ({
  id: 'me',
  name: '',
  goal: 'general_fitness',
  level: 'beginner',
  equipment: [],
  daysPerWeek: 3,
  sessionMinutes: 45,
  flags: [],
  ability: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const GYM = [...EQUIPMENT];
const HOME: Equipment[] = ['dumbbells', 'bench', 'bands'];

const items = (p: Program): Item[] => p.phases.flatMap((ph) => ph.days.flatMap((d) => d.blocks.flatMap((b) => b.items)));

describe('data', () => {
  it('exercise library is valid and has unique ids', () => {
    for (const e of EXERCISES) Exercise.parse(e);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
  });

  it('every template validates and references known exercises', () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    for (const t of TEMPLATES) {
      Program.parse(t);
      const all = items(t);
      expect(new Set(all.map((i) => i.id)).size).toBe(all.length);
      for (const i of all) {
        expect(findExercise(i.exerciseId), `${t.id}: ${i.exerciseId}`).toBeDefined();
        for (const a of i.alternatives ?? []) expect(findExercise(a), `${t.id}: alt ${a}`).toBeDefined();
      }
    }
  });
});

describe('matcher', () => {
  it.each([
    ['gym', GYM],
    ['home', HOME],
    ['bodyweight', [] as Equipment[]],
  ])('instantiates every template for %s without unusable exercises', (_label, equipment) => {
    const eq = new Set(equipment);
    for (const t of TEMPLATES) {
      const { program } = instantiate(t, profile({ equipment }));
      Program.parse(program);
      for (const i of items(program)) expect(canDo(getExercise(i.exerciseId), eq), `${t.id}: ${i.exerciseId}`).toBe(true);
      for (const ph of program.phases) for (const d of ph.days) expect(d.blocks.length, `${t.id}/${d.id} is empty`).toBeGreaterThan(0);
    }
  });

  it('keeps core work for the general templates with no equipment', () => {
    for (const id of ['gf-3-start', 'fat-3-lift-walk', 'cal-3-foundation', 'run-start']) {
      expect(instantiate(getTemplate(id)!, profile()).droppedCore, id).toBe(0);
    }
  });

  it('recommends a template of the chosen goal first', () => {
    const goals: Goal[] = ['muscle', 'strength', 'calisthenics', 'running', 'fat_loss', 'general_fitness', 'sport'];
    for (const goal of goals) {
      const level = goal === 'sport' ? 'intermediate' : 'beginner';
      const top = rankTemplates(profile({ goal, level, equipment: GYM }))[0];
      expect(top.template.goal, goal).toBe(goal);
    }
  });

  it('prefers upper/lower for an intermediate training four days', () => {
    const top = rankTemplates(profile({ goal: 'muscle', level: 'intermediate', equipment: GYM, daysPerWeek: 4, sessionMinutes: 60 }))[0];
    expect(top.template.id).toBe('mus-4-upperlower');
  });

  it('never recommends a harder level to someone with a health flag', () => {
    const top = rankTemplates(profile({ goal: 'muscle', level: 'intermediate', equipment: GYM, daysPerWeek: 4, flags: ['heart'] }))[0];
    expect(top.template.level).toBe('beginner');
  });

  it('trims sessions to the time available but keeps priority 1 items', () => {
    const t = getTemplate('mus-4-upperlower')!;
    const short = instantiate(t, profile({ equipment: GYM, sessionMinutes: 30 })).program;
    const long = instantiate(t, profile({ equipment: GYM, sessionMinutes: 90 })).program;
    const day = (p: Program) => p.phases[0].days[0];
    expect(estimateMinutes(day(short))).toBeLessThan(estimateMinutes(day(long)));
    expect(day(short).blocks.flatMap((b) => b.items).filter((i) => i.priority === 1).length).toBe(
      day(long).blocks.flatMap((b) => b.items).filter((i) => i.priority === 1).length,
    );
  });

  it('keeps the barbell basics for a beginner in a gym, but not pull-ups they cannot do yet', () => {
    const ids = (id: string, over: Partial<Profile>) => items(instantiate(getTemplate(id)!, profile(over)).program).map((i) => i.exerciseId);
    expect(ids('str-3-linear', { equipment: GYM })).toContain('back_squat');
    const gym = ids('mus-3-fullbody', { equipment: GYM, sessionMinutes: 90 });
    expect(gym).not.toContain('pullup');
    expect(gym).toContain('lat_pulldown');
    const home = ids('mus-3-fullbody', { equipment: ['dumbbells', 'bench', 'pullup_bar'], sessionMinutes: 90 });
    expect(home).not.toContain('pullup');
    expect(home).toContain('pullup_negative');
    const strong = ids('mus-3-fullbody', { equipment: ['dumbbells', 'bench', 'pullup_bar'], sessionMinutes: 90, ability: { pullups: 8 } });
    expect(strong).toContain('pullup');
  });

  it('starts bodyweight ladders from reported ability', () => {
    const t = getTemplate('cal-3-foundation')!;
    const weak = instantiate(t, profile({ equipment: ['pullup_bar'], ability: { pushups: 0, pullups: 0 } })).program;
    const strong = instantiate(t, profile({ equipment: ['pullup_bar'], ability: { pushups: 40, pullups: 8 } })).program;
    const ids = (p: Program) => items(p).map((i) => i.exerciseId);
    expect(ids(weak)).toContain('incline_pushup');
    expect(ids(weak)).toContain('pullup_negative');
    expect(ids(strong)).toContain('decline_pushup');
    expect(ids(strong)).toContain('pullup');
  });
});

describe('program position', () => {
  const ab = getTemplate('gf-3-start')!;
  const run = getTemplate('run-start')!;

  it('alternates days and counts weeks from completed sessions', () => {
    expect(position(ab, 0).day.id).toBe('a');
    expect(position(ab, 1).day.id).toBe('b');
    expect(position(ab, 2).day.id).toBe('a');
    expect(position(ab, 3).week).toBe(1);
    expect(position(ab, 4).doneThisWeek).toBe(1);
  });

  it('suggests a deload on the configured week and loops forever', () => {
    expect(position(ab, 7 * 3).deloadSuggested).toBe(true);
    expect(position(ab, 3).deloadSuggested).toBe(false);
    expect(position(ab, 300).finished).toBe(false);
  });

  it('walks the running plan week by week and finishes', () => {
    expect(position(run, 0).phase.name).toBe('Week 1');
    expect(position(run, 3).phase.name).toBe('Week 2');
    expect(position(run, 26).phase.name).toBe('Week 9');
    expect(position(run, 26).finished).toBe(false);
    expect(position(run, 27).finished).toBe(true);
  });

  it('halves sets in a lighter week', () => {
    const day = lighten(ab.phases[0].days[0]);
    const squat = day.blocks.flatMap((b) => b.items).find((i) => i.exerciseId === 'goblet_squat')!;
    expect(squat.prescription.mode === 'reps' && squat.prescription.sets).toBe(2);
  });
});

describe('progression', () => {
  const entry = (sets: { reps?: number; kg?: number; seconds?: number }[]): Entry => ({
    exerciseId: 'x',
    sets: sets.map((s) => ({ ...s, done: true })),
  });
  const repsItem = (lo: number, hi: number): Item => ({
    id: 'i',
    exerciseId: 'x',
    priority: 1,
    prescription: { mode: 'reps', sets: 3, reps: [lo, hi] },
  });

  it('double progression adds reps, then load', () => {
    const ex = getExercise('goblet_squat');
    const rule = { type: 'double', stepKg: 2.5 } as const;
    expect(suggest(repsItem(8, 12), ex, rule, []).kg).toBeUndefined();
    const mid = suggest(repsItem(8, 12), ex, rule, [entry([{ kg: 20, reps: 10 }, { kg: 20, reps: 9 }, { kg: 20, reps: 9 }])]);
    expect(mid).toMatchObject({ kg: 20, reps: 10 });
    const top = suggest(repsItem(8, 12), ex, rule, [entry([{ kg: 20, reps: 12 }, { kg: 20, reps: 12 }, { kg: 20, reps: 12 }])]);
    expect(top).toMatchObject({ kg: 22.5, reps: 8 });
  });

  it('linear progression adds load, and resets after two misses', () => {
    const ex = getExercise('back_squat');
    const rule = { type: 'linear', stepKg: 2.5 } as const;
    const hit = entry([{ kg: 60, reps: 5 }, { kg: 60, reps: 5 }, { kg: 60, reps: 5 }]);
    expect(suggest(repsItem(5, 5), ex, rule, [hit]).kg).toBe(62.5);
    const miss = entry([{ kg: 60, reps: 5 }, { kg: 60, reps: 4 }, { kg: 60, reps: 3 }]);
    expect(suggest(repsItem(5, 5), ex, rule, [miss]).kg).toBe(60);
    expect(suggest(repsItem(5, 5), ex, rule, [miss, miss]).kg).toBe(54);
  });

  it('bodyweight ladders advance after the standard is met twice', () => {
    const ex = getExercise('pushup');
    const rule = { type: 'variation' } as const;
    const top = entry([{ reps: 12 }, { reps: 12 }, { reps: 12 }]);
    expect(suggest(repsItem(5, 12), ex, rule, [top]).advanceTo).toBeUndefined();
    expect(suggest(repsItem(5, 12), ex, rule, [top, top]).advanceTo).toBe('diamond_pushup');
    expect(suggest(repsItem(5, 12), ex, rule, [entry([{ reps: 8 }, { reps: 7 }, { reps: 6 }])]).reps).toBe(7);
  });

  it('drills with their own rep range use it instead of the program range', () => {
    const neg = getExercise('pullup_negative');
    const item = { ...repsItem(5, 10), exerciseId: neg.id };
    expect(rx(item)).toMatchObject({ reps: [3, 5] });
    const s = suggest(item, neg, { type: 'variation' }, [entry([{ reps: 5 }, { reps: 5 }, { reps: 5 }]), entry([{ reps: 5 }, { reps: 5 }, { reps: 5 }])]);
    expect(s.advanceTo).toBe('band_pullup');
  });

  it('holds progress in seconds', () => {
    const item: Item = { id: 'i', exerciseId: 'plank', priority: 1, prescription: { mode: 'hold', sets: 3, seconds: [20, 45] } };
    const s = suggest(item, getExercise('plank'), { type: 'double', stepKg: 2.5 }, [entry([{ seconds: 25 }, { seconds: 25 }, { seconds: 22 }])]);
    expect(s.seconds).toBe(27);
  });
});

describe('stats', () => {
  it('weeks start on Monday', () => {
    expect(weekStart(new Date('2026-11-12T10:00:00')).getDay()).toBe(1);
    expect(weekStart(new Date('2026-11-15T10:00:00')).getDate()).toBe(9);
  });

  it('counts streaks of weeks that hit the target', () => {
    const s = (date: string) => ({ id: date, date, dayName: '', durationSeconds: 0, entries: [] });
    const sessions = [s('2026-11-10T08:00:00'), s('2026-11-11T08:00:00'), s('2026-11-03T08:00:00'), s('2026-11-04T08:00:00')];
    expect(weekStreak(sessions, 2, new Date('2026-11-12T10:00:00'))).toBe(2);
    expect(weekStreak(sessions, 3, new Date('2026-11-12T10:00:00'))).toBe(0);
  });
});
