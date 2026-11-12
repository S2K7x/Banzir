import type { DayTemplate, Segment } from '../../lib/schema';
import { DOUBLE, VARIATION, day, h, iv, phase, r, seg, t, template } from './build';

/**
 * Calisthenics skill plans. Evidence and coaching rules: docs/science/calisthenics.md.
 * Shared rules: skill work first while fresh, straight-arm holds stop before form
 * breaks, about 72 hours between heavy sessions for the same skill, and as much
 * pulling as pushing.
 */

const PREP = [t('warmup_wrists', 5, { p: 2 })];
const WRISTS = [t('wrist_care', 3, { p: 3 })];
const NONE = { type: 'none' } as const;
const SOURCES = ['docs/science/calisthenics.md'];

/** Lower-body day shared by the skill plans. */
const legsDay = (id: string): DayTemplate =>
  day(id, 'Legs and core', 'strength', ['Legs', 'Core'], {
    warmup: [t('warmup_general', 5, { p: 2 })],
    main: [
      r('squat_jump', 3, 4, 5, { rest: 75, prog: NONE, p: 2, cue: 'Jump as high as you can, land softly, reset each time.' }),
      r('bw_bulgarian', 4, 8, 12, { rir: [1, 3], rest: 90 }),
      r('single_leg_rdl', 3, 8, 10, { rir: [1, 3], rest: 75, alt: ['single_leg_bridge'] }),
      r('single_leg_bridge', 3, 10, 12, { rest: 60, p: 2 }),
      r('calf_raise', 3, 12, 20, { rest: 45, p: 3, prog: NONE }),
      h('tuck_lsit', 4, 10, 20, { rest: 60 }),
      h('hollow_hold', 3, 20, 40, { rest: 45, p: 2, alt: ['plank'] }),
    ],
  });

export const calFirstPullup = template({
  id: 'cal-first-pullup',
  name: 'First pull-up',
  description: 'Hangs, slow negatives and rows build the strength for your first strict pull-up, with enough pushing and leg work to stay balanced.',
  goal: 'calisthenics',
  level: 'beginner',
  daysPerWeek: 3,
  daysRange: [2, 4],
  sessionMinutes: 35,
  loops: true,
  progression: VARIATION,
  deloadEveryWeeks: 6,
  requires: ['pullup_bar'],
  tags: ['pullup'],
  sources: SOURCES,
  phases: [
    phase(
      'base',
      'Build the pull',
      6,
      [
        day('a', 'Pull focus A', 'skill', ['Pull', 'Push', 'Core'], {
          warmup: PREP,
          main: [
            h('dead_hang', 3, 20, 40, { rest: 60, prog: NONE }),
            r('scap_pull', 3, 8, 12, { rest: 60, prog: NONE }),
            r('pullup', 4, 3, 6, { rir: [1, 2], rest: 120, cue: 'Every rep from a full hang. Stop before the last rep turns into a struggle.' }),
            r('inverted_row', 3, 6, 12, { rir: [1, 3], alt: ['table_row'] }),
            r('pushup', 3, 5, 12, { p: 2 }),
            h('hollow_hold', 3, 15, 30, { p: 2, alt: ['plank'] }),
          ],
        }),
        day('b', 'Pull focus B', 'skill', ['Pull', 'Legs', 'Core'], {
          warmup: PREP,
          main: [
            h('dead_hang', 3, 20, 40, { rest: 60, prog: NONE }),
            r('pullup', 4, 3, 6, { rir: [1, 2], rest: 120 }),
            r('inverted_row', 3, 6, 12, { rir: [1, 3], alt: ['table_row'] }),
            r('bw_squat', 3, 8, 15, { p: 2 }),
            r('pike_pushup', 3, 5, 10, { p: 2 }),
            r('hanging_knee_raise', 3, 6, 12, { p: 2, rest: 60, alt: ['lying_leg_raise'] }),
          ],
        }),
      ],
      ['a', 'b'],
    ),
  ],
});

export const calHandstand = template({
  id: 'cal-handstand',
  name: 'Handstand focus',
  description: 'Short, frequent handstand practice at the start of every session, backed by overhead pushing, pulling, legs and core.',
  goal: 'calisthenics',
  level: 'beginner',
  daysPerWeek: 4,
  daysRange: [3, 5],
  sessionMinutes: 40,
  loops: true,
  progression: VARIATION,
  deloadEveryWeeks: 6,
  tags: ['handstand'],
  sources: SOURCES,
  phases: [
    phase(
      'base',
      'Balance and strength',
      6,
      [
        day('a', 'Handstand + push', 'skill', ['Handstand', 'Shoulders', 'Core'], {
          warmup: PREP,
          main: [
            h('wall_handstand', 5, 20, 45, { rest: 60, cue: 'Come down before your form breaks. Fresh, clean holds teach balance; tired ones do not.' }),
            r('wall_kickup', 5, 3, 5, { rest: 45, prog: NONE }),
            r('pike_pushup', 4, 5, 10, { rir: [1, 3], rest: 90 }),
            r('bench_dip', 3, 5, 12, { p: 2 }),
            h('hollow_hold', 3, 20, 40, { rest: 45, p: 2, alt: ['plank'] }),
          ],
          cooldown: WRISTS,
        }),
        day('b', 'Handstand + pull and legs', 'skill', ['Handstand', 'Pull', 'Legs'], {
          warmup: PREP,
          main: [
            h('wall_handstand', 4, 20, 45, { rest: 60 }),
            r('wall_shoulder_taps', 3, 6, 10, { rest: 60, prog: NONE, alt: ['scap_pushup'] }),
            r('inverted_row', 3, 5, 12, { rir: [1, 3], alt: ['ring_row', 'table_row'] }),
            r('bw_squat', 3, 8, 15),
            r('single_leg_bridge', 3, 8, 12, { p: 2, rest: 60, alt: ['glute_bridge'] }),
            h('tuck_lsit', 3, 10, 20, { p: 2, rest: 60 }),
          ],
          cooldown: WRISTS,
        }),
      ],
      ['a', 'b'],
    ),
  ],
});

export const cal4Intermediate = template({
  id: 'cal-4-intermediate',
  name: 'Skills and strength',
  description: 'Four days that build bodyweight strength and start the classic skills: handstand, planche lean, tuck front lever and L-sit.',
  goal: 'calisthenics',
  level: 'intermediate',
  daysPerWeek: 4,
  daysRange: [3, 5],
  sessionMinutes: 60,
  loops: true,
  progression: VARIATION,
  deloadEveryWeeks: 6,
  tags: ['foundation'],
  sources: SOURCES,
  phases: [
    phase('base', 'Base', 6, [
      day('push', 'Push + handstand', 'skill', ['Handstand', 'Shoulders', 'Chest'], {
        warmup: PREP,
        main: [
          h('wall_handstand', 4, 20, 45, { rest: 60 }),
          h('planche_lean', 4, 10, 20, { rest: 90 }),
          r('elevated_pike_pushup', 4, 5, 8, { rir: [1, 3], rest: 120 }),
          r('dip', 4, 6, 10, { rir: [1, 3], rest: 120, alt: ['bench_dip'] }),
          r('diamond_pushup', 3, 6, 12, { p: 2 }),
          r('db_lateral_raise', 3, 12, 15, { p: 3, rest: 60, alt: ['band_lateral_raise'], prog: DOUBLE }),
        ],
        cooldown: WRISTS,
      }),
      day('pull', 'Pull + front lever', 'skill', ['Back', 'Biceps', 'Core'], {
        warmup: PREP,
        main: [
          h('tuck_front_lever', 4, 8, 15, { rest: 90 }),
          r('pullup', 4, 5, 8, { rir: [1, 3], rest: 120 }),
          r('inverted_row', 4, 8, 12, { rir: [1, 3], alt: ['ring_row', 'table_row'] }),
          r('hanging_knee_raise', 3, 8, 12, { p: 2, rest: 60, alt: ['lying_leg_raise'] }),
          r('band_external_rotation', 3, 12, 15, { p: 2, rest: 45, alt: ['prone_ytw'], prog: NONE }),
        ],
      }),
      legsDay('legs'),
      day('mix', 'Mixed skills', 'skill', ['Handstand', 'Planche', 'Front lever'], {
        warmup: PREP,
        main: [
          r('wall_kickup', 5, 3, 5, { rest: 45, prog: NONE }),
          h('planche_lean', 3, 10, 20, { rest: 90 }),
          h('tuck_front_lever', 3, 8, 15, { rest: 90 }),
          r('pushup', 3, 8, 12, { rir: [1, 3] }),
          r('inverted_row', 3, 8, 12, { rir: [1, 3], alt: ['ring_row', 'table_row'] }),
          r('dragon_flag', 3, 4, 6, { p: 2, rest: 75, alt: ['lying_leg_raise'], prog: NONE }),
        ],
        cooldown: WRISTS,
      }),
    ]),
  ],
});

export const calPlanche = template({
  id: 'cal-planche',
  name: 'Planche focus',
  description: 'Two planche sessions a week, one heavy and one for volume, with a pulling day and a leg day to keep you balanced. Expect months, not weeks: tendons adapt slowly.',
  goal: 'calisthenics',
  level: 'intermediate',
  daysPerWeek: 4,
  daysRange: [3, 5],
  sessionMinutes: 60,
  loops: true,
  progression: VARIATION,
  deloadEveryWeeks: 5,
  tags: ['planche'],
  sources: SOURCES,
  phases: [
    phase('base', 'Planche cycle', 5, [
      day('heavy', 'Planche strength', 'skill', ['Planche', 'Shoulders', 'Triceps'], {
        warmup: PREP,
        main: [
          h('wall_handstand', 3, 20, 40, { rest: 60, p: 2 }),
          h('tuck_planche', 5, 5, 10, { rest: 150, cue: 'Push the floor away as hard as you can. Stop a second or two before your hips drop.' }),
          r('pseudo_planche_pushup', 4, 5, 8, { rir: [1, 3], rest: 120, cue: 'Lean as far forward as you can control, 3 seconds down.' }),
          h('planche_lean', 3, 15, 25, { rest: 90, prog: NONE }),
          r('dip', 3, 6, 10, { rir: [1, 3], rest: 120, alt: ['bench_dip'] }),
          r('scap_pushup', 3, 10, 15, { rest: 45, p: 2, prog: NONE }),
        ],
        cooldown: WRISTS,
        notes: 'The heaviest day. Do it after a rest day when you can.',
      }),
      day('pull', 'Pull', 'skill', ['Back', 'Biceps', 'Rear shoulders'], {
        warmup: PREP,
        main: [
          r('pullup', 4, 5, 8, { rir: [1, 3], rest: 120 }),
          r('inverted_row', 4, 8, 12, { rir: [1, 3], alt: ['ring_row', 'table_row'], cue: 'Never skip rows: they balance all the forward-leaning planche work.' }),
          h('tuck_front_lever', 4, 8, 12, { rest: 90, p: 2 }),
          r('band_external_rotation', 3, 12, 15, { rest: 45, alt: ['prone_ytw'], prog: NONE }),
          r('hanging_knee_raise', 3, 8, 12, { p: 2, rest: 60, alt: ['lying_leg_raise'] }),
        ],
      }),
      day('volume', 'Planche volume', 'skill', ['Planche', 'Shoulders', 'Core'], {
        warmup: PREP,
        main: [
          h('tuck_planche', 6, 6, 10, { rest: 90, cue: 'About 60 seconds of total hold time, all of it clean. This day adds practice, not maximal effort.' }),
          r('elevated_pike_pushup', 4, 6, 10, { rir: [2, 3], rest: 120 }),
          r('diamond_pushup', 3, 8, 12, { rir: [1, 3] }),
          r('db_lateral_raise', 3, 12, 15, { p: 2, rest: 60, alt: ['band_lateral_raise'], prog: DOUBLE }),
          h('hollow_hold', 3, 20, 40, { rest: 45, p: 2, alt: ['plank'] }),
        ],
        cooldown: WRISTS,
        notes: 'Leave about 72 hours after the strength day.',
      }),
      legsDay('legs'),
    ]),
  ],
});

export const calFrontLever = template({
  id: 'cal-frontlever',
  name: 'Front lever focus',
  description: 'Two front lever sessions a week with raises, rows and pull-ups, plus a pushing day and a leg day.',
  goal: 'calisthenics',
  level: 'intermediate',
  daysPerWeek: 4,
  daysRange: [3, 5],
  sessionMinutes: 55,
  loops: true,
  progression: VARIATION,
  deloadEveryWeeks: 5,
  requires: ['pullup_bar'],
  tags: ['frontlever'],
  sources: SOURCES,
  phases: [
    phase('base', 'Lever cycle', 5, [
      day('heavy', 'Lever strength', 'skill', ['Front lever', 'Back', 'Core'], {
        warmup: PREP,
        main: [
          h('tuck_front_lever', 5, 6, 10, { rest: 150, cue: 'Arms straight, shoulders pulled down. Stop before your hips sag.' }),
          r('fl_raise', 4, 3, 5, { rest: 120, prog: NONE }),
          r('pullup', 4, 4, 6, { rir: [1, 2], rest: 150 }),
          r('tuck_fl_row', 3, 5, 8, { rest: 120, alt: ['inverted_row', 'ring_row'] }),
          h('hollow_hold', 3, 20, 40, { rest: 45, p: 2, alt: ['plank'] }),
        ],
      }),
      day('push', 'Push', 'skill', ['Chest', 'Shoulders', 'Triceps'], {
        warmup: PREP,
        main: [
          h('wall_handstand', 3, 20, 40, { rest: 60, p: 2 }),
          r('pushup', 4, 8, 12, { rir: [1, 3] }),
          r('elevated_pike_pushup', 4, 5, 8, { rir: [1, 3], rest: 120 }),
          r('dip', 3, 6, 10, { rir: [1, 3], rest: 120, alt: ['bench_dip'] }),
          r('scap_pushup', 3, 10, 15, { rest: 45, p: 2, prog: NONE }),
        ],
        cooldown: WRISTS,
      }),
      day('volume', 'Lever volume', 'skill', ['Front lever', 'Back', 'Core'], {
        warmup: PREP,
        main: [
          h('tuck_front_lever', 6, 6, 10, { rest: 90, cue: 'About 60 seconds of clean hold time in total.' }),
          r('inverted_row', 4, 8, 12, { rir: [1, 3], alt: ['ring_row'] }),
          r('pullup', 3, 5, 8, { rir: [2, 3], rest: 120 }),
          r('dragon_flag', 3, 4, 6, { rest: 75, alt: ['lying_leg_raise'], prog: NONE }),
          r('band_external_rotation', 3, 12, 15, { p: 2, rest: 45, alt: ['prone_ytw'], prog: NONE }),
        ],
        notes: 'Leave about 72 hours after the strength day.',
      }),
      legsDay('legs'),
    ]),
  ],
});

export const calMuscleUp = template({
  id: 'cal-muscleup',
  name: 'Muscle-up focus',
  description: 'High explosive pulls, false-grip work, transition drills and slow negatives, with dips for the press-out. Best started once you can do about 10 pull-ups and 10 dips.',
  goal: 'calisthenics',
  level: 'intermediate',
  daysPerWeek: 3,
  daysRange: [3, 4],
  sessionMinutes: 50,
  loops: true,
  progression: VARIATION,
  deloadEveryWeeks: 5,
  requires: ['pullup_bar'],
  tags: ['muscleup'],
  sources: SOURCES,
  phases: [
    phase(
      'base',
      'Muscle-up cycle',
      5,
      [
        day('skill', 'Muscle-up skill', 'skill', ['Muscle-up', 'Back', 'Triceps'], {
          warmup: PREP,
          main: [
            h('false_grip_hang', 4, 10, 15, { rest: 60, prog: NONE }),
            r('chest_to_bar', 4, 3, 5, { rest: 120, cue: 'Explosive: pull the bar to your chest, elbows to your hips.' }),
            r('muscleup_transition', 3, 3, 5, { rest: 90, prog: NONE }),
            r('muscleup_negative', 3, 2, 4, { rest: 150, cue: 'Never to failure. If the elbows or biceps complain, do this every other week.' }),
            r('dip', 4, 6, 10, { rir: [1, 3], rest: 120, alt: ['bench_dip'] }),
            h('hollow_hold', 3, 20, 40, { rest: 45, p: 2, alt: ['plank'] }),
          ],
        }),
        day('strength', 'Pull and push strength', 'skill', ['Back', 'Chest', 'Core'], {
          warmup: PREP,
          main: [
            r('pullup', 5, 4, 6, { rir: [1, 2], rest: 150 }),
            r('dip', 4, 6, 10, { rir: [1, 3], rest: 120, alt: ['bench_dip'] }),
            r('inverted_row', 3, 8, 12, { rir: [1, 3], alt: ['ring_row'] }),
            r('pushup', 3, 8, 12, { p: 2 }),
            h('tuck_front_lever', 3, 8, 12, { rest: 90, p: 2 }),
            r('hanging_knee_raise', 3, 8, 12, { p: 2, rest: 60, alt: ['lying_leg_raise'] }),
            r('bw_bulgarian', 3, 8, 12, { p: 2, rest: 75 }),
          ],
        }),
      ],
      ['skill', 'strength'],
    ),
  ],
});

/* ---------- Planche + handstand push-up + running: the original PLANCHE OS programme ---------- */

const QUALITY: { name: string; reps: number; segments: Segment[] }[] = [
  { name: 'Long intervals', reps: 4, segments: [seg('Hard', 240), seg('Jog', 150, 'rest')] },
  { name: 'Speed', reps: 6, segments: [seg('Fast', 90), seg('Jog', 75, 'rest')] },
  { name: 'Hills', reps: 8, segments: [seg('Uphill', 45), seg('Jog down', 90, 'rest')] },
];

const planchePhases = QUALITY.map((q, i) => {
  // Day ids must be unique across the whole program, so each week gets a prefix.
  const w = `w${i + 1}`;
  return phase(w, `Week ${i + 1}: ${q.name.toLowerCase()}`, 1, [
    day(`${w}a`, 'Push strength', 'skill', ['Planche', 'Handstand push-up', 'Dips'], {
      warmup: PREP,
      main: [
        t('handstand_practice', 8, { p: 2 }),
        r('wall_hspu_negative', 4, 3, 5, { rest: 150, cue: 'Lower for 3 to 5 seconds. Never kip. Move to full reps once the negative is easy.' }),
        h('tuck_planche', 5, 8, 10, { rest: 150, cue: 'Push the floor away. Try the next progression for 3 to 5 seconds on the last two sets.' }),
        r('pseudo_planche_pushup', 4, 5, 8, { rest: 120, cue: 'Tempo 3-1-1 with maximum lean.' }),
        h('planche_lean', 3, 10, 15, { rest: 90, prog: NONE }),
        r('ring_dip', 3, 6, 8, { rest: 120, alt: ['dip'] }),
        r('db_lateral_raise', 3, 12, 15, { rest: 60, p: 2, alt: ['band_lateral_raise'], prog: DOUBLE }),
        r('scap_pushup', 3, 10, 12, { rest: 45, p: 2, prog: NONE }),
      ],
      cooldown: WRISTS,
      notes: 'The heaviest session of the week. Place it after your rest day. Upper body only, so the legs stay fresh for the quality run.',
    }),
    day(`${w}q`, `Quality run: ${q.name.toLowerCase()}`, 'run', ['Running', 'VO2max'], {
      warmup: [t('easy_run', 6, { cue: 'Very easy jog, then a few leg swings, skips and pogo jumps.' })],
      main: [iv('hard_intervals', q.reps, q.segments, { effort: { type: 'rpe', value: [8, 9] }, cue: 'Hard but repeatable: the last repetition should look like the first.' })],
      cooldown: [t('cooldown_walk', 4, { p: 2 })],
    }),
    day(`${w}b`, 'Pull + muscle-up', 'skill', ['Muscle-up', 'Back', 'Front lever'], {
      warmup: PREP,
      main: [
        t('handstand_practice', 8, { p: 2 }),
        h('false_grip_hang', 4, 10, 15, { rest: 60, prog: NONE }),
        r('chest_to_bar', 4, 3, 5, { rest: 120, cue: 'Explosive, elbows to the hips.' }),
        r('muscleup_negative', 3, 2, 4, { rest: 150, cue: 'Never to failure: straight-arm planche work comes tomorrow.' }),
        r('pullup', 3, 5, 6, { rest: 120, prog: NONE, cue: '3 seconds down, 1 second pause with the chin over the bar.' }),
        h('tuck_front_lever', 4, 6, 10, { rest: 90 }),
        r('ring_row', 4, 8, 12, { rest: 90, alt: ['inverted_row'], cue: 'Pause with the chest at the rings. Never skip rows.' }),
        r('incline_db_curl', 3, 10, 12, { rest: 60, p: 2, alt: ['db_curl', 'band_curl'], prog: DOUBLE }),
        r('pistol_squat', 3, 5, 8, { rest: 60, p: 2, alt: ['assisted_pistol', 'bw_bulgarian'] }),
      ],
      notes: 'Order: explosive, then strength, then straight-arm work, then volume.',
    }),
    day(`${w}c`, 'Planche volume', 'skill', ['Planche', 'Shoulders', 'Core'], {
      warmup: PREP,
      main: [
        t('handstand_practice', 8, { p: 2 }),
        h('tuck_planche', 6, 8, 12, { rest: 90, cue: 'About 60 seconds in total. Change the format each week: 6 x 10, 5 x 12, 4 x 15.' }),
        r('elevated_pike_pushup', 4, 6, 10, { rir: [2, 2], rest: 120, cue: 'Tempo 3-0-1. Never to failure today.' }),
        r('decline_pushup', 3, 8, 12, { rest: 90 }),
        r('band_pull_apart', 3, 12, 15, { rest: 45, alt: ['prone_ytw'], prog: NONE }),
        r('db_lateral_raise', 3, 12, 15, { rest: 60, p: 2, alt: ['band_lateral_raise'], prog: DOUBLE }),
        h('lsit', 4, 20, 30, { rest: 60, alt: ['tuck_lsit'] }),
      ],
      cooldown: WRISTS,
      notes: '72 hours after the push strength day. Strength is built there; this day adds quality volume.',
    }),
    day(`${w}e`, 'Easy run', 'run', ['Running', 'Zone 2'], {
      main: [
        t('easy_run', 35, { effort: { type: 'hrZone', value: 2 }, cue: 'Conversation pace. Easy has to mean easy: tomorrow is legs.' }),
        iv('hard_intervals', 4, [seg('Stride', 20), seg('Walk', 60, 'rest')], { p: 2, cue: 'Smooth accelerations to about 90 %, not sprints.' }),
      ],
    }),
    day(`${w}d`, 'Legs + handstand', 'strength', ['Legs', 'Handstand', 'Back'], {
      warmup: PREP,
      main: [
        t('handstand_practice', 10, { p: 2 }),
        r('squat_jump', 3, 5, 5, { rest: 75, prog: NONE, cue: 'Explosive work first, while fresh.' }),
        r('db_bulgarian', 4, 8, 10, { rest: 90, alt: ['bw_bulgarian'], prog: DOUBLE, cue: '3 seconds down.' }),
        r('pullup', 3, 5, 5, { rest: 90, prog: NONE, cue: 'Second pulling day: leave 2 reps in reserve.' }),
        r('nordic_curl', 3, 4, 6, { rest: 120, alt: ['single_leg_rdl'], cue: 'Lower for 3 to 4 seconds.' }),
        h('tuck_front_lever', 3, 6, 10, { rest: 90, p: 2 }),
        r('single_leg_bridge', 3, 10, 12, { rest: 60, p: 2 }),
        r('calf_raise', 3, 12, 15, { rest: 45, p: 2, prog: NONE }),
        r('prone_ytw', 2, 8, 8, { rest: 45, p: 3, prog: NONE }),
      ],
      cooldown: WRISTS,
    }),
  ]);
});

export const calPlancheOs = template({
  id: 'cal-6-planche-os',
  name: 'Planche OS',
  description: 'Six days: planche and handstand push-up twice a week, muscle-up and front lever pulling, legs, and two runs on a three-week interval cycle. For experienced athletes.',
  goal: 'calisthenics',
  level: 'advanced',
  daysPerWeek: 6,
  daysRange: [5, 6],
  sessionMinutes: 75,
  loops: true,
  progression: VARIATION,
  deloadEveryWeeks: 6,
  requires: ['pullup_bar'],
  tags: ['planche', 'hybrid'],
  sources: [...SOURCES, 'docs/science/running.md', 'S2K7x/App-Sport MonAppTacking.md'],
  phases: planchePhases,
});
