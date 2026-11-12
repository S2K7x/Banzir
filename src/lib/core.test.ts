import { describe, expect, it } from 'vitest';
import { EXERCISES, findExercise, getExercise, rx } from '../data/exercises';
import { TEMPLATES, getTemplate } from '../data/templates';
import { addDay, addItem, blankProgram, dayItemCount, duplicateDay, duplicateProgram, moveDay, moveItem, removeDay, removeItem, replaceExercise, setExercise, updateItem, updateMeta } from './edit';
import { canDo, estimateMinutes, instantiate } from './matcher';
import { rankTemplates } from './ranking';
import { lighten, position } from './programState';
import { historyForItem, suggest } from './progression';
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
      const dayIds = t.phases.flatMap((ph) => ph.days.map((d) => d.id));
      expect(new Set(dayIds).size, `${t.id}: day ids must be unique across phases`).toBe(dayIds.length);
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

  it('uses the focus to pick a skill plan, but not above the person\'s level', () => {
    const top = (over: Partial<Profile>) => rankTemplates(profile({ goal: 'calisthenics', equipment: ['pullup_bar'], daysPerWeek: 4, sessionMinutes: 60, ...over }))[0].template.id;
    expect(top({ level: 'intermediate', focus: 'planche' })).toBe('cal-planche');
    expect(top({ level: 'intermediate', focus: 'frontlever' })).toBe('cal-frontlever');
    expect(top({ level: 'intermediate', focus: 'muscleup', daysPerWeek: 3 })).toBe('cal-muscleup');
    expect(top({ level: 'beginner', focus: 'handstand' })).toBe('cal-handstand');
    expect(top({ level: 'beginner', focus: 'pullup', daysPerWeek: 3 })).toBe('cal-first-pullup');
    expect(top({ level: 'beginner', focus: 'planche', daysPerWeek: 3 })).toBe('cal-3-foundation');
    expect(top({ level: 'advanced', focus: 'planche', daysPerWeek: 6, sessionMinutes: 75 })).toBe('cal-6-planche-os');
  });

  it('keeps the specific skill drills of a plan', () => {
    const ids = (id: string, over: Partial<Profile>) => items(instantiate(getTemplate(id)!, profile({ sessionMinutes: 90, ...over })).program).map((i) => i.exerciseId);
    const mu = ids('cal-muscleup', { level: 'intermediate', equipment: ['pullup_bar'] });
    expect(mu).toContain('muscleup_negative');
    const planche = ids('cal-planche', { level: 'intermediate', equipment: ['pullup_bar'] });
    expect(planche).toContain('pseudo_planche_pushup');
    expect(planche).toContain('tuck_planche');
    const os = ids('cal-6-planche-os', { level: 'advanced', equipment: ['rings', 'dumbbells'], ability: { pushups: 35, pullups: 12 } });
    expect(os).toContain('pseudo_planche_pushup');
    expect(os).toContain('wall_hspu_negative');
    expect(os).toContain('ring_dip');
  });

  it('does not recommend bar-dependent plans without a bar, and rings count as a bar', () => {
    const ids = (equipment: Equipment[]) => rankTemplates(profile({ goal: 'calisthenics', level: 'intermediate', focus: 'frontlever', equipment, daysPerWeek: 4 })).map((m) => m.template.id);
    expect(ids([])[0]).not.toBe('cal-frontlever');
    expect(ids(['rings'])[0]).toBe('cal-frontlever');
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

describe('program editing', () => {
  const start = () => instantiate(getTemplate('gf-3-start')!, profile({ equipment: GYM })).program;
  const day = (p: Program, i = 0) => p.phases[0].days[i];
  const ids = (p: Program, i = 0) => day(p, i).blocks.flatMap((b) => b.items.map((x) => x.exerciseId));

  it('adds, updates, moves and removes exercises and stays valid', () => {
    let p = start();
    expect(p.source).toBe('template');
    const before = ids(p).length;
    p = addItem(p, day(p).id, getExercise('db_curl'));
    expect(p.source).toBe('user');
    expect(ids(p).length).toBe(before + 1);
    const main = day(p).blocks.find((b) => b.type === 'main')!;
    const curl = main.items[main.items.length - 1];
    expect(curl.prescription).toMatchObject({ mode: 'reps', sets: 3, reps: [8, 12] });

    p = updateItem(p, curl.id, { prescription: { mode: 'reps', sets: 4, reps: [10, 15] }, restSeconds: 60 });
    p = moveItem(p, curl.id, -1);
    const moved = day(p).blocks.find((b) => b.type === 'main')!.items;
    expect(moved[moved.length - 2].id).toBe(curl.id);
    expect(moved[moved.length - 2].prescription).toMatchObject({ sets: 4 });

    // Moving past the edge of a block crosses into the next one.
    p = moveItem(p, curl.id, 1);
    p = moveItem(p, curl.id, 1);
    expect(day(p).blocks.find((b) => b.type === 'cooldown')!.items[0].id).toBe(curl.id);

    p = removeItem(p, curl.id);
    expect(ids(p)).not.toContain('db_curl');
    Program.parse(p);
  });

  it('resets the prescription when the new exercise needs a different kind', () => {
    let p = start();
    const squat = day(p).blocks.flatMap((b) => b.items).find((i) => i.exerciseId === 'goblet_squat')!;
    p = setExercise(p, squat.id, 'plank');
    const changed = day(p).blocks.flatMap((b) => b.items).find((i) => i.id === squat.id)!;
    expect(changed.prescription.mode).toBe('hold');
    p = setExercise(p, squat.id, 'back_squat');
    expect(day(p).blocks.flatMap((b) => b.items).find((i) => i.id === squat.id)!.prescription.mode).toBe('reps');
    Program.parse(p);
  });

  it('replaces an exercise everywhere in the plan', () => {
    let p = instantiate(getTemplate('cal-planche')!, profile({ level: 'intermediate', equipment: ['pullup_bar'], sessionMinutes: 90 })).program;
    p = replaceExercise(p, 'tuck_planche', 'adv_tuck_planche');
    const all = items(p).map((i) => i.exerciseId);
    expect(all).not.toContain('tuck_planche');
    expect(all.filter((x) => x === 'adv_tuck_planche').length).toBe(2);
  });

  it('adds, duplicates, reorders and removes days, keeping the rotation in step', () => {
    let p = start();
    const phaseId = p.phases[0].id;
    p = addDay(p, phaseId);
    expect(p.phases[0].days.length).toBe(3);
    expect(dayItemCount(day(p, 2))).toBe(0);
    p = duplicateDay(p, day(p, 0).id);
    expect(day(p, 1).name).toBe('Full body A copy');
    expect(new Set(items(p).map((i) => i.id)).size).toBe(items(p).length);
    p = moveDay(p, day(p, 3).id, -1);
    expect(p.phases[0].rotation).toEqual(p.phases[0].days.map((d) => d.id));
    p = removeDay(p, day(p, 0).id);
    expect(p.phases[0].days.length).toBe(3);
    Program.parse(p);
    // The last day cannot be removed.
    let single = blankProgram('Mine', 'muscle', 3);
    single = removeDay(single, single.phases[0].days[0].id);
    expect(single.phases[0].days.length).toBe(1);
  });

  it('creates and copies programs that validate and run', () => {
    let mine = blankProgram('  ', 'strength', 4);
    expect(mine.name).toBe('My program');
    Program.parse(mine);
    mine = addItem(mine, mine.phases[0].days[0].id, getExercise('back_squat'));
    mine = updateMeta(mine, { name: 'Legs', daysPerWeek: 9, deloadEveryWeeks: 4 });
    expect(mine).toMatchObject({ name: 'Legs', daysPerWeek: 7, deloadEveryWeeks: 4 });
    expect(updateMeta(mine, { deloadEveryWeeks: null }).deloadEveryWeeks).toBeUndefined();
    expect(position(mine, 0).day.name).toBe('Day 1');

    const original = getTemplate('cal-6-planche-os')!;
    const copy = duplicateProgram(original, 'My Planche OS');
    Program.parse(copy);
    expect(copy.id).not.toBe(original.id);
    expect(position(copy, 6).phase.name).toBe(original.phases[1].name);
    const originalIds = new Set(items(original).map((i) => i.id));
    expect(items(copy).some((i) => originalIds.has(i.id))).toBe(false);
  });
});

describe('coaching rules for the built-in plans', () => {
  it('plans that change every week have a fixed number of sessions matching each week', () => {
    for (const t of TEMPLATES) {
      const weekly = t.phases.filter((ph) => ph.weeks === 1);
      if (t.phases.length < 2 || weekly.length === 0) continue;
      expect(t.daysRange[0], `${t.id}: daysRange must be fixed`).toBe(t.daysRange[1]);
      // One day repeated all week (couch to 5K) is fine; otherwise one day per session.
      for (const ph of weekly) if (ph.rotation.length > 1) expect(ph.rotation.length, `${t.id}/${ph.id}`).toBe(t.daysPerWeek);
    }
  });

  it('no long run grows more than 10 % beyond the longest of the previous four weeks', () => {
    const minutes = (d: { blocks: { items: Item[] }[] }) =>
      d.blocks.flatMap((b) => b.items).reduce((n, i) => {
        const ex = getExercise(i.exerciseId);
        return n + (ex.slot === 'cardio' && i.prescription.mode === 'time' && ['long_run', 'race_pace_run', 'easy_run'].includes(ex.id) ? i.prescription.seconds / 60 : 0);
      }, 0);
    for (const t of TEMPLATES.filter((x) => x.goal === 'running' && x.phases.length > 1)) {
      const longs: number[] = [];
      for (const ph of t.phases) {
        const long = ph.days.find((d) => d.id.endsWith('long'));
        if (long) {
          const m = minutes(long);
          const prev = longs.slice(-4);
          if (prev.length) expect(m, `${t.id} ${ph.name}: ${m} min after ${prev.join(', ')}`).toBeLessThanOrEqual(Math.max(...prev) * 1.1 + 0.5);
          longs.push(m);
        }
      }
    }
  });

  it('easy running is most of the running time in every distance plan', () => {
    for (const t of TEMPLATES.filter((x) => x.goal === 'running' && x.phases.length > 1 && x.id !== 'run-start')) {
      let easy = 0;
      let total = 0;
      for (const ph of t.phases)
        for (const d of ph.days)
          for (const b of d.blocks)
            for (const i of b.items) {
              const p = i.prescription;
              const sec = p.mode === 'time' ? p.seconds : p.mode === 'intervals' ? p.reps * p.segments.reduce((a, x) => a + x.seconds, 0) : 0;
              if (!sec || i.exerciseId === 'time_trial' || i.exerciseId === 'cooldown_walk') continue;
              total += sec;
              const hard = p.mode === 'intervals' ? p.reps * p.segments.filter((x) => x.kind === 'work').reduce((a, x) => a + x.seconds, 0) : ['tempo_run', 'race_pace_run'].includes(i.exerciseId) ? sec : 0;
              easy += sec - hard;
            }
      expect(easy / total, t.id).toBeGreaterThan(0.75);
    }
  });

  const top = (over: Partial<Profile>) => rankTemplates(profile({ equipment: GYM, ...over }))[0].template.id;

  it('picks running plans from focus and current running ability', () => {
    expect(top({ goal: 'running' })).toBe('run-start');
    expect(top({ goal: 'running', focus: '5k', ability: { runMinutes: 30 } })).toBe('run-5k');
    expect(top({ goal: 'running', level: 'intermediate', focus: '10k', daysPerWeek: 4, ability: { runMinutes: 30 } })).toBe('run-10k');
    expect(top({ goal: 'running', level: 'intermediate', focus: 'half', daysPerWeek: 4, sessionMinutes: 60, ability: { runMinutes: 30 } })).toBe('run-half');
    expect(top({ goal: 'running', level: 'intermediate', focus: 'marathon', daysPerWeek: 5, sessionMinutes: 75, ability: { runMinutes: 60 } })).toBe('run-marathon');
    // Not ready for a marathon yet.
    expect(top({ goal: 'running', level: 'intermediate', focus: 'marathon', daysPerWeek: 5, ability: { runMinutes: 20 } })).not.toBe('run-marathon');
    expect(top({ goal: 'running', focus: 'strength', daysPerWeek: 2, sessionMinutes: 30 })).toBe('run-strength-addon');
  });

  it('picks sport, senior, low-impact, home and strength plans for the right people', () => {
    for (const sport of ['boxing', 'tennis', 'soccer', 'basketball']) expect(top({ goal: 'sport', focus: sport, level: 'intermediate' })).toBe(`spt-${sport}`);
    expect(top({ goal: 'sport', focus: 'athlete', level: 'intermediate' })).toBe('spt-athlete-general');
    expect(top({ goal: 'general_fitness', age: 68, daysPerWeek: 3 })).toBe('gf-senior');
    expect(top({ goal: 'fat_loss', equipment: ['bands'], heightCm: 170, weightKg: 105 })).toBe('fat-home-lowimpact');
    expect(top({ goal: 'muscle', equipment: ['dumbbells', 'bench'], sessionMinutes: 60 })).toBe('mus-3-home');
    expect(top({ goal: 'muscle', level: 'intermediate', daysPerWeek: 6, sessionMinutes: 75 })).toBe('mus-6-ppl');
    expect(top({ goal: 'muscle', level: 'intermediate', daysPerWeek: 5, sessionMinutes: 60 })).toBe('mus-5-ulppl');
    expect(top({ goal: 'strength', level: 'intermediate', daysPerWeek: 4, sessionMinutes: 60 })).toBe('str-4-undulating');
    expect(top({ goal: 'strength', level: 'advanced', daysPerWeek: 4, sessionMinutes: 75 })).toBe('str-4-block');
    expect(top({ goal: 'general_fitness', daysPerWeek: 2, sessionMinutes: 30 })).toBe('gf-2-express');
  });

  it('never puts an add-on first unless asked for it', () => {
    for (const goal of ['general_fitness', 'fat_loss', 'muscle'] as Goal[]) expect(top({ goal, sessionMinutes: 20, daysPerWeek: 5 })).not.toBe('mob-daily');
    expect(top({ goal: 'general_fitness', focus: 'mobility', sessionMinutes: 20, daysPerWeek: 5 })).toBe('mob-daily');
  });
});

describe('fitting quality', () => {
  it('does not repeat an exercise within a session when a substitute is needed', () => {
    const goals: Goal[] = ['muscle', 'strength', 'calisthenics', 'running', 'fat_loss', 'general_fitness', 'sport'];
    for (const goal of goals)
      for (const equipment of [[], ['dumbbells'], ['bands'], ['pullup_bar'], ['dumbbells', 'bench', 'pullup_bar']] as Equipment[][])
        for (const { template: t, program } of rankTemplates(profile({ goal, equipment, sessionMinutes: 120 })).slice(0, 3)) {
        for (const ph of program.phases)
          for (const d of ph.days) {
            const ids = d.blocks.flatMap((b) => b.items.map((i) => i.exerciseId));
            const own = new Set(t.phases.flatMap((x) => x.days).find((x) => x.id === d.id)!.blocks.flatMap((b) => b.items.map((i) => i.exerciseId)).filter((id, i, a) => a.indexOf(id) !== i));
            const dupes = ids.filter((id, i) => ids.indexOf(id) !== i && !own.has(id));
            // A repeat is acceptable only when nothing else fits at all.
            expect(dupes, `${t.id}/${d.id} with ${equipment.join('+') || 'nothing'}`).toEqual([]);
          }
        }
  });

  it('keeps the key prevention and power drills where possible', () => {
    const ids = (id: string, equipment: Equipment[]) => items(instantiate(getTemplate(id)!, profile({ goal: 'sport', equipment, sessionMinutes: 120 })).program).map((i) => i.exerciseId);
    expect(ids('spt-soccer', [])).toContain('nordic_curl');
    expect(ids('spt-boxing', ['dumbbells'])).toContain('db_woodchop');
    const senior = items(instantiate(getTemplate('gf-senior')!, profile({ age: 70, sessionMinutes: 60 })).program).map((i) => i.exerciseId);
    expect(senior).not.toContain('pike_pushup');
  });

  it('raises the reps when a heavy lift becomes a bodyweight exercise', () => {
    const soccer = instantiate(getTemplate('spt-soccer')!, profile({ goal: 'sport', sessionMinutes: 120 })).program;
    const first = soccer.phases[0].days[0].blocks.find((b) => b.type === 'main')!.items[0];
    expect(getExercise(first.exerciseId).logType).toBe('reps');
    expect(first.prescription).toMatchObject({ reps: [8, 12] });
  });
});

describe('history per prescription', () => {
  const ul = instantiate(getTemplate('str-4-undulating')!, profile({ equipment: GYM, level: 'intermediate', sessionMinutes: 90 })).program;
  const bench = (dayId: string) => ul.phases[0].days.find((d) => d.id === dayId)!.blocks.flatMap((b) => b.items).find((i) => i.exerciseId === 'bench_press')!;
  const session = (itemId: string, kg: number, reps: number, date: string) => ({
    id: date,
    date,
    dayName: '',
    durationSeconds: 0,
    entries: [{ itemId, exerciseId: 'bench_press', sets: [1, 2, 3, 4].map(() => ({ kg, reps, done: true })) }],
  });

  it('keeps heavy and volume days apart, and estimates a load for a new rep range', () => {
    const heavy = bench('uh');
    const volume = bench('uv');
    const sessions = [session(heavy.id, 100, 5, '2026-11-02T10:00:00Z'), session(volume.id, 80, 8, '2026-11-04T10:00:00Z')];

    const h = historyForItem(heavy, sessions, ul);
    expect(h.matched).toBe(true);
    expect(h.entries).toHaveLength(1);
    expect(suggest(heavy, getExercise('bench_press'), ul.progression, h.entries, () => true, h.matched).kg).toBe(102.5);

    // A program the person has never logged: every entry counts and the load comes from the 1RM estimate.
    const block = instantiate(getTemplate('str-4-block')!, profile({ equipment: GYM, level: 'advanced', sessionMinutes: 90 })).program;
    const peak = block.phases.find((p) => p.id === 'real')!.days[0].blocks.flatMap((b) => b.items).find((i) => i.exerciseId === 'bench_press')!;
    const fresh = historyForItem(peak, sessions, block);
    expect(fresh.matched).toBe(false);
    const s = suggest(peak, getExercise('bench_press'), block.progression, fresh.entries, () => true, fresh.matched);
    // Best e1RM is 100 x (1 + 5/30) = 116.7. Two reps with 1-2 in reserve is about 3.5 reps: 116.7 / 1.117 = 104.5, rounded down to 102.5.
    expect(s.kg).toBe(102.5);
    expect(s.reps).toBe(2);
  });
});
