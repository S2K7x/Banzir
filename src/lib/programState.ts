import type { DayTemplate, Phase, Program } from './schema';

/** Where someone is in a program, derived from how many sessions they have completed. */

export type ProgramState = {
  programId: string;
  completed: number;
  startedAt: string;
  /** Week index the person chose to run as a lighter week. */
  lightWeek?: number;
};

export type Position = {
  /** 0-based week since the program started. */
  week: number;
  totalWeeks: number;
  phase: Phase;
  weekInPhase: number;
  day: DayTemplate;
  /** Sessions done in the current program week. */
  doneThisWeek: number;
  finished: boolean;
  deloadSuggested: boolean;
};

export function position(program: Program, completed: number): Position {
  const perWeek = program.daysPerWeek;
  const totalWeeks = program.phases.reduce((a, p) => a + p.weeks, 0);
  const rawWeek = Math.floor(completed / perWeek);
  const finished = !program.loops && rawWeek >= totalWeeks;
  const cycleWeek = program.loops ? rawWeek % totalWeeks : Math.min(rawWeek, totalWeeks - 1);

  let phase = program.phases[0];
  let phaseStart = 0;
  for (const p of program.phases) {
    if (cycleWeek < phaseStart + p.weeks) {
      phase = p;
      break;
    }
    phaseStart += p.weeks;
  }

  const cycleStart = program.loops ? Math.floor(rawWeek / totalWeeks) * totalWeeks : 0;
  const sessionsInPhase = Math.max(0, completed - (cycleStart + phaseStart) * perWeek);
  const dayId = phase.rotation[finished ? phase.rotation.length - 1 : sessionsInPhase % phase.rotation.length];
  const day = phase.days.find((d) => d.id === dayId) ?? phase.days[0];

  return {
    week: rawWeek,
    totalWeeks,
    phase,
    weekInPhase: cycleWeek - phaseStart,
    day,
    doneThisWeek: completed % perWeek,
    finished,
    deloadSuggested: !!program.deloadEveryWeeks && (rawWeek + 1) % program.deloadEveryWeeks === 0,
  };
}

/** A lighter week: about half the sets, same loads. */
export function lighten(day: DayTemplate): DayTemplate {
  return {
    ...day,
    blocks: day.blocks.map((b) => ({
      ...b,
      items: b.items.map((item) => {
        const p = item.prescription;
        if (p.mode === 'reps' || p.mode === 'hold') return { ...item, prescription: { ...p, sets: Math.max(1, Math.ceil(p.sets / 2)) } };
        return item;
      }),
    })),
  };
}

export function findDay(program: Program, dayId: string): DayTemplate | undefined {
  for (const phase of program.phases) {
    const d = phase.days.find((x) => x.id === dayId);
    if (d) return d;
  }
  return undefined;
}
