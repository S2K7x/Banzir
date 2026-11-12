import { useMemo, useState } from 'react';
import { getExercise, rx } from '../../data/exercises';
import { activateProgram, db, setState, type ActiveSession } from '../../lib/db';
import { estimateMinutes, rankTemplates, swapOptions } from '../../lib/matcher';
import { position, type ProgramState } from '../../lib/programState';
import type { DayTemplate, Item, Profile, Program, Session } from '../../lib/schema';
import { GOAL_INFO, LEVEL_INFO, describe, effortText } from '../../lib/text';
import { startWorkout, unlockAudio } from '../../lib/workout';
import { Icon, Sheet } from '../../ui/kit';

type Props = {
  profile: Profile;
  program: Program | undefined;
  state: ProgramState | undefined;
  sessions: Session[];
  active: ActiveSession | undefined;
  openPlayer: () => void;
};

/** Replaces one item's exercise everywhere it appears in the program. */
export async function swapExercise(program: Program, itemId: string, exerciseId: string): Promise<void> {
  const phases = program.phases.map((ph) => ({
    ...ph,
    days: ph.days.map((d) => ({
      ...d,
      blocks: d.blocks.map((b) => ({ ...b, items: b.items.map((i) => (i.id === itemId ? { ...i, exerciseId, cue: undefined } : i)) })),
    })),
  }));
  await db.programs.put({ ...program, phases, source: program.source === 'template' ? 'user' : program.source });
}

export function ProgramTab({ profile, program, state, sessions, active, openPlayer }: Props) {
  const [swap, setSwap] = useState<Item | null>(null);
  const [choosing, setChoosing] = useState(false);
  const pos = program && state ? position(program, state.completed) : undefined;
  const matches = useMemo(() => (choosing ? rankTemplates(profile) : []), [choosing, profile]);

  if (!program || !state || !pos) {
    return (
      <div className="screen">
        <h1 className="h1">Program</h1>
        <button className="btn primary block" onClick={() => setChoosing(true)}>
          Choose a plan
        </button>
        {choosing && <PlanSheet matches={matches} onClose={() => setChoosing(false)} currentId={undefined} />}
      </div>
    );
  }

  const info = GOAL_INFO[program.goal];
  const perWeek = program.daysPerWeek;
  const shiftWeek = (delta: number) => setState({ ...state, completed: Math.max(0, (pos.week + delta) * perWeek), lightWeek: undefined });

  async function startDay(day: DayTemplate) {
    if (!program) return;
    unlockAudio();
    if (!active) await startWorkout(program, day, sessions);
    openPlayer();
  }

  return (
    <div className="screen">
      <h1 className="h1">Program</h1>

      <div className="hero" style={{ ['--g1' as string]: info.g1, ['--g2' as string]: info.g2 }}>
        <div className="chips" style={{ marginBottom: 10 }}>
          <span className="chip">{info.label}</span>
          <span className="chip">{LEVEL_INFO[program.level].label}</span>
          <span className="chip">{perWeek} days a week</span>
        </div>
        <h2 className="h1" style={{ fontSize: 24 }}>
          {program.name}
        </h2>
        <p className="muted small" style={{ marginTop: 6 }}>
          {program.description}
        </p>
      </div>

      <div className="card row">
        <button className="icon-btn" onClick={() => shiftWeek(-1)} disabled={pos.week === 0} aria-label="Go back a week">
          <Icon name="left" size={18} />
        </button>
        <div className="grow center">
          <b>{program.loops ? `Week ${pos.week + 1}` : `Week ${Math.min(pos.week + 1, pos.totalWeeks)} of ${pos.totalWeeks}`}</b>
          <p className="muted small">
            {pos.finished ? 'Complete' : `${pos.phase.name} · ${pos.doneThisWeek}/${perWeek} sessions done`}
          </p>
        </div>
        <button className="icon-btn" onClick={() => shiftWeek(1)} disabled={pos.finished} aria-label="Skip to next week">
          <Icon name="right" size={18} />
        </button>
      </div>
      <p className="muted small" style={{ marginTop: -8 }}>
        Use the arrows to repeat a week or jump ahead.
      </p>

      {pos.phase.days.map((day) => (
        <div className="card stack" key={day.id}>
          <div className="row between">
            <div>
              <b>{day.name}</b>
              <p className="muted small">
                about {estimateMinutes(day)} min{day.id === pos.day.id && !pos.finished ? ' · up next' : ''}
              </p>
            </div>
            <button className="btn sm" onClick={() => startDay(day)} disabled={!!active}>
              <Icon name="play" size={14} /> Start
            </button>
          </div>
          <div className="list">
            {day.blocks.flatMap((b) =>
              b.items.map((item) => {
                const ex = getExercise(item.exerciseId);
                return (
                  <button key={item.id} onClick={() => setSwap(item)} style={{ minHeight: 0, padding: '9px 0' }}>
                    <span className="grow">
                      {ex.name}
                      {b.type !== 'main' && <span className="muted small"> · {b.type === 'warmup' ? 'warm-up' : 'cool-down'}</span>}
                    </span>
                    <span className="muted small num">{describe(rx(item))}</span>
                  </button>
                );
              }),
            )}
          </div>
          {day.notes && <p className="muted small">{day.notes}</p>}
        </div>
      ))}

      <button className="btn block" onClick={() => setChoosing(true)}>
        <Icon name="swap" size={18} /> Change plan
      </button>

      {swap && (
        <Sheet title={getExercise(swap.exerciseId).name} onClose={() => setSwap(null)}>
          <p className="muted small">
            {describe(rx(swap))}
            {effortText(rx(swap)) ? ` · ${effortText(rx(swap))}` : ''}
          </p>
          {(swap.cue ?? getExercise(swap.exerciseId).cue) && <p className="note">{swap.cue ?? getExercise(swap.exerciseId).cue}</p>}
          <b>Swap for</b>
          <SwapList
            item={swap}
            profile={profile}
            onPick={async (id) => {
              await swapExercise(program, swap.id, id);
              setSwap(null);
            }}
          />
        </Sheet>
      )}
      {choosing && <PlanSheet matches={matches} onClose={() => setChoosing(false)} currentId={program.templateId} />}
    </div>
  );
}

export function SwapList({ item, profile, onPick }: { item: Item; profile: Profile; onPick: (exerciseId: string) => void }) {
  const options = swapOptions(item, profile);
  if (options.length === 0) return <p className="muted small">No alternative fits your equipment.</p>;
  return (
    <div className="list">
      {options.map((o) => (
        <button key={o.id} onClick={() => onPick(o.id)}>
          <span className="grow">
            {o.name}
            <span className="muted small" style={{ display: 'block' }}>
              {LEVEL_INFO[o.level].label}
              {o.primary.length ? ` · ${o.primary.join(', ')}` : ''}
            </span>
          </span>
          <Icon name="swap" size={16} />
        </button>
      ))}
    </div>
  );
}

function PlanSheet({ matches, onClose, currentId }: { matches: ReturnType<typeof rankTemplates>; onClose: () => void; currentId: string | undefined }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <Sheet title="Choose a plan" onClose={onClose}>
      <p className="muted small">Sorted by how well each plan fits your goal, level, schedule and equipment. Your history is kept when you switch.</p>
      <div className="stack">
        {matches.map((m, i) => (
          <div className="card stack" key={m.template.id}>
            <div className="row between">
              <b>{m.template.name}</b>
              {i === 0 ? <span className="chip on">Best fit</span> : m.template.id === currentId ? <span className="chip">Current</span> : null}
            </div>
            <p className="muted small">{m.template.description}</p>
            <div className="chips">
              <span className="chip">{GOAL_INFO[m.template.goal].label}</span>
              <span className="chip">{LEVEL_INFO[m.template.level].label}</span>
              <span className="chip">{m.program.daysPerWeek} days</span>
            </div>
            {confirm === m.template.id ? (
              <button
                className="btn primary block"
                onClick={async () => {
                  await activateProgram(m.program);
                  onClose();
                }}
              >
                Confirm: start this plan from week 1
              </button>
            ) : (
              <button className="btn block" onClick={() => setConfirm(m.template.id)}>
                Use this plan
              </button>
            )}
          </div>
        ))}
      </div>
    </Sheet>
  );
}
