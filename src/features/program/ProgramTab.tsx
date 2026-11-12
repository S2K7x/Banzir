import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { getExercise, rx } from '../../data/exercises';
import { GOALS } from '../../lib/constants';
import { activateProgram, db, saveProgram, setState, type ActiveSession } from '../../lib/db';
import { blankProgram, dayItemCount, duplicateProgram, replaceExercise, setExercise } from '../../lib/edit';
import { estimateMinutes } from '../../lib/matcher';
import { rankTemplates } from '../../lib/ranking';
import { position, type ProgramState } from '../../lib/programState';
import type { DayTemplate, Goal, Item, Profile, Program, Session } from '../../lib/schema';
import { GOAL_INFO, LEVEL_INFO, describe, effortText } from '../../lib/text';
import { startWorkout, unlockAudio } from '../../lib/workout';
import { Icon, Sheet, Stepper } from '../../ui/kit';
import { SwapList } from './SwapList';

type Props = {
  profile: Profile;
  program: Program | undefined;
  state: ProgramState | undefined;
  sessions: Session[];
  active: ActiveSession | undefined;
  openPlayer: () => void;
  openBuilder: () => void;
};

export function ProgramTab({ profile, program, state, sessions, active, openPlayer, openBuilder }: Props) {
  const [swap, setSwap] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const pos = program && state ? position(program, state.completed) : undefined;

  if (!program || !state || !pos) {
    return (
      <div className="screen">
        <h1 className="h1">Program</h1>
        <button className="btn primary block" onClick={() => setChoosing(true)}>
          Choose a plan
        </button>
        {choosing && <PlanSheet profile={profile} current={undefined} onClose={() => setChoosing(false)} openBuilder={openBuilder} />}
      </div>
    );
  }

  const info = GOAL_INFO[program.goal];
  const perWeek = program.daysPerWeek;
  const shiftWeek = (delta: number) => setState({ ...state, completed: Math.max(0, (pos.week + delta) * perWeek), lightWeek: undefined });
  const swapItem: Item | undefined = swap ? pos.phase.days.flatMap((d) => d.blocks.flatMap((b) => b.items)).find((i) => i.id === swap) : undefined;

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
          <span className="chip">{program.source === 'template' ? LEVEL_INFO[program.level].label : 'Customised'}</span>
          <span className="chip">{perWeek} days a week</span>
        </div>
        <h2 className="h1" style={{ fontSize: 24 }}>
          {program.name}
        </h2>
        <p className="muted small" style={{ margin: '6px 0 14px' }}>
          {program.description}
        </p>
        <button className="btn block" onClick={openBuilder} disabled={!!active}>
          <Icon name="pen" size={18} /> Edit plan
        </button>
        {active && (
          <p className="muted small" style={{ marginTop: 8 }}>
            Finish or discard the workout in progress to edit the plan.
          </p>
        )}
      </div>

      <div className="card row">
        <button className="icon-btn" onClick={() => shiftWeek(-1)} disabled={pos.week === 0} aria-label="Go back a week">
          <Icon name="left" size={18} />
        </button>
        <div className="grow center">
          <b>{program.loops ? `Week ${pos.week + 1}` : `Week ${Math.min(pos.week + 1, pos.totalWeeks)} of ${pos.totalWeeks}`}</b>
          <p className="muted small">{pos.finished ? 'Complete' : `${pos.phase.name} · ${pos.doneThisWeek}/${perWeek} sessions done`}</p>
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
                {dayItemCount(day) === 0 ? 'No exercises yet' : `about ${estimateMinutes(day)} min`}
                {day.id === pos.day.id && !pos.finished ? ' · up next' : ''}
              </p>
            </div>
            <button className="btn sm" onClick={() => startDay(day)} disabled={!!active || dayItemCount(day) === 0}>
              <Icon name="play" size={14} /> Start
            </button>
          </div>
          <div className="list">
            {day.blocks.flatMap((b) =>
              b.items.map((item) => (
                <button key={item.id} onClick={() => setSwap(item.id)} style={{ minHeight: 0, padding: '9px 0' }}>
                  <span className="grow">
                    {getExercise(item.exerciseId).name}
                    {b.type !== 'main' && <span className="muted small"> · {b.type === 'warmup' ? 'warm-up' : 'cool-down'}</span>}
                  </span>
                  <span className="muted small num">{describe(rx(item))}</span>
                </button>
              )),
            )}
          </div>
          {day.notes && <p className="muted small">{day.notes}</p>}
        </div>
      ))}

      <button className="btn block" onClick={() => setChoosing(true)}>
        <Icon name="swap" size={18} /> Change plan
      </button>

      {swapItem && (
        <Sheet title={getExercise(swapItem.exerciseId).name} onClose={() => setSwap(null)}>
          <p className="muted small">
            {describe(rx(swapItem))}
            {effortText(rx(swapItem)) ? ` · ${effortText(rx(swapItem))}` : ''}
          </p>
          {(swapItem.cue ?? getExercise(swapItem.exerciseId).cue) && <p className="note">{swapItem.cue ?? getExercise(swapItem.exerciseId).cue}</p>}
          <SwapList
            item={swapItem}
            profile={profile}
            onPick={async (id, everywhere) => {
              await saveProgram(everywhere ? replaceExercise(program, swapItem.exerciseId, id) : setExercise(program, swapItem.id, id));
              setSwap(null);
            }}
          />
        </Sheet>
      )}
      {choosing && <PlanSheet profile={profile} current={program} onClose={() => setChoosing(false)} openBuilder={openBuilder} />}
    </div>
  );
}

/* ---------- Choosing, creating and managing plans ---------- */

function PlanSheet({ profile, current, onClose, openBuilder }: { profile: Profile; current: Program | undefined; onClose: () => void; openBuilder: () => void }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [days, setDays] = useState(profile.daysPerWeek);
  const matches = useMemo(() => rankTemplates(profile), [profile]);
  const saved = useLiveQuery(() => db.programs.filter((p) => p.source !== 'template').toArray(), [], []);
  const mine = saved.filter((p) => p.id !== current?.id);

  async function use(program: Program, thenEdit = false) {
    await activateProgram(program);
    onClose();
    if (thenEdit) openBuilder();
  }

  if (creating) {
    return (
      <Sheet title="New program" onClose={onClose}>
        <label className="field">
          <span>Name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="My program" />
        </label>
        <div className="field">
          <span>Main goal</span>
          <div className="chips">
            {GOALS.map((g) => (
              <button key={g} className={`chip ${goal === g ? 'on' : ''}`} onClick={() => setGoal(g)}>
                {GOAL_INFO[g].label}
              </button>
            ))}
          </div>
        </div>
        <div className="card">
          <Stepper label="Sessions per week" value={days} min={1} max={7} onChange={setDays} />
        </div>
        <button className="btn primary big block" onClick={() => use(blankProgram(name, goal, days), true)}>
          Create and add exercises
        </button>
        <button className="btn block" onClick={() => setCreating(false)}>
          Back
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet title="Choose a plan" onClose={onClose}>
      <div className="card stack">
        <b>Build your own</b>
        <p className="muted small">Start from an empty program, or copy your current plan and change it freely.</p>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn sm primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={14} /> New program
          </button>
          {current && (
            <button className="btn sm" onClick={() => use(duplicateProgram(current, `${current.name} (my version)`), true)}>
              <Icon name="copy" size={14} /> Copy current plan
            </button>
          )}
        </div>
      </div>

      {mine.length > 0 && (
        <>
          <b>Your programs</b>
          <div className="stack">
            {mine.map((p) => (
              <div className="card stack" key={p.id}>
                <b>{p.name}</b>
                <p className="muted small">
                  {GOAL_INFO[p.goal].label} · {p.daysPerWeek} days a week
                </p>
                <div className="row">
                  <button className="btn sm primary" onClick={() => use(p)}>
                    Use
                  </button>
                  {confirm === `del-${p.id}` ? (
                    <button
                      className="btn sm danger"
                      onClick={async () => {
                        await db.programs.delete(p.id);
                        setConfirm(null);
                      }}
                    >
                      Confirm delete
                    </button>
                  ) : (
                    <button className="btn sm ghost danger" onClick={() => setConfirm(`del-${p.id}`)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <b>Ready-made plans</b>
      <p className="muted small">Sorted by how well each fits your goal, level, schedule and equipment. Your history is kept when you switch; progress through the plan restarts at week 1.</p>
      <div className="stack">
        {matches.map((m, i) => (
          <div className="card stack" key={m.template.id}>
            <div className="row between">
              <b>{m.template.name}</b>
              {i === 0 ? <span className="chip on">Best fit</span> : m.template.id === current?.templateId && current.source === 'template' ? <span className="chip">Current</span> : null}
            </div>
            <p className="muted small">{m.template.description}</p>
            <div className="chips">
              <span className="chip">{GOAL_INFO[m.template.goal].label}</span>
              <span className="chip">{LEVEL_INFO[m.template.level].label}</span>
              <span className="chip">{m.program.daysPerWeek} days</span>
            </div>
            {confirm === m.template.id ? (
              <button className="btn primary block" onClick={() => use(m.program)}>
                Confirm: start this plan
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
