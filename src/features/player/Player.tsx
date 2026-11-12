import { useEffect, useMemo, useRef, useState } from 'react';
import { findExercise, getExercise, rx } from '../../data/exercises';
import { clearActive, saveProgram, setActive, type ActiveSession } from '../../lib/db';
import { replaceExercise, setExercise } from '../../lib/edit';
import { canDo, equipmentSet } from '../../lib/matcher';
import { findDay, lighten } from '../../lib/programState';
import { historyFor, suggest, type Suggestion } from '../../lib/progression';
import type { Entry, Item, Profile, Program, Segment, Session, SetLog } from '../../lib/schema';
import { formatDuration, showWeight, toKg, useSettings, weightUnit } from '../../lib/settings';
import { describe, effortText } from '../../lib/text';
import { beep, doneSets, finishWorkout, flatItems, keepScreenOn, unlockAudio } from '../../lib/workout';
import { Icon, NumInput, Sheet, useNow } from '../../ui/kit';
import { SwapList } from '../program/SwapList';

type Props = {
  initial: ActiveSession | undefined;
  program: Program | undefined;
  profile: Profile;
  sessions: Session[];
  onClose: () => void;
};

type Rest = { end: number; total: number };

export function Player({ initial, program, profile, sessions, onClose }: Props) {
  const settings = useSettings();
  const [a, setA] = useState(initial);
  const [rest, setRest] = useState<Rest | null>(null);
  const [sheet, setSheet] = useState<'quit' | 'finish' | 'swap' | null>(null);
  const [saved, setSaved] = useState<Session | null>(null);
  const [effort, setEffort] = useState<number | undefined>();
  const [note, setNote] = useState('');
  const now = useNow(true, 500);

  // Only on mount: after saving, the stored session disappears while the summary is still showing.
  useEffect(() => {
    if (!initial || initial.entries.length === 0) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => (settings.keepAwake ? keepScreenOn() : undefined), [settings.keepAwake]);
  useEffect(() => {
    if (rest && now >= rest.end) {
      if (settings.sound) beep('end');
      setRest(null);
    }
  }, [now, rest, settings.sound]);

  const items = useMemo(() => {
    const day = program && a?.dayId ? findDay(program, a.dayId) : undefined;
    const list = day ? flatItems(a?.light ? lighten(day) : day) : [];
    return new Map(list.map((i) => [i.id, i]));
  }, [program, a?.dayId, a?.light]);

  if (saved) return <Summary session={saved} onClose={onClose} />;
  if (!a || a.entries.length === 0) return null;

  const entry = a.entries[a.cursor];
  const item: Item | undefined = entry.itemId ? items.get(entry.itemId) : undefined;
  const ex = getExercise(entry.exerciseId);
  const p = item ? rx(item) : undefined;
  const history = historyFor(ex.id, sessions);
  const eq = equipmentSet(profile.equipment);
  const tip: Suggestion = item ? suggest(item, ex, item.progression ?? program?.progression ?? { type: 'none' }, history, (e) => canDo(e, eq)) : { note: '' };
  const isLast = a.cursor === a.entries.length - 1;
  const timed = p?.mode === 'time' || p?.mode === 'intervals';

  function commit(next: ActiveSession) {
    setA(next);
    void setActive(next);
  }
  const patchEntry = (fn: (e: Entry) => Entry) => commit({ ...a!, entries: a!.entries.map((e, i) => (i === a!.cursor ? fn(e) : e)) });
  const patchSet = (i: number, patch: Partial<SetLog>) =>
    patchEntry((e) => ({
      ...e,
      sets: e.sets.map((s, j) => {
        if (j === i) return { ...s, ...patch };
        // A weight typed on one set carries down to the sets below that are not done yet.
        if ('kg' in patch && j > i && !s.done && (s.kg == null || s.kg === e.sets[i].kg)) return { ...s, kg: patch.kg };
        return s;
      }),
    }));
  const go = (delta: number) => {
    setRest(null);
    commit({ ...a!, cursor: Math.max(0, Math.min(a!.entries.length - 1, a!.cursor + delta)) });
    window.scrollTo(0, 0);
  };

  function startRest() {
    const seconds = item?.restSeconds ?? 0;
    if (settings.autoRest && seconds > 0) setRest({ end: Date.now() + seconds * 1000, total: seconds });
  }

  function toggleSet(i: number) {
    unlockAudio();
    const s = entry.sets[i];
    if (s.done) return patchSet(i, { done: false });
    const patch: Partial<SetLog> = { done: true };
    if (p?.mode === 'reps' && s.reps == null) patch.reps = tip.reps ?? p.reps[0];
    if (p?.mode === 'hold' && s.seconds == null) patch.seconds = tip.seconds ?? p.seconds[0];
    patchSet(i, patch);
    const lastSetOfWorkout = isLast && entry.sets.every((x, j) => x.done || j === i);
    if (!lastSetOfWorkout) startRest();
  }

  async function save() {
    const session = await finishWorkout(a!, { effort, note: note.trim() });
    setSheet(null);
    setSaved(session);
  }

  async function discard() {
    await clearActive();
    onClose();
  }

  const lastSets = history[0]?.sets.filter((s) => s.done) ?? [];
  const lastText = lastSets.length
    ? ex.logType === 'weight_reps'
      ? `${showWeight(Math.max(...lastSets.map((s) => s.kg ?? 0)), settings.units)} ${weightUnit(settings.units)} × ${lastSets.map((s) => s.reps ?? 0).join(', ')}`
      : lastSets.map((s) => (p?.mode === 'hold' ? `${s.seconds ?? 0} s` : (s.reps ?? 0))).join(', ')
    : null;

  return (
    <div className="overlay">
      <div className="overlay-inner">
        <div className="topbar">
          <button className="icon-btn" onClick={() => setSheet('quit')} aria-label="Close workout">
            <Icon name="x" size={18} />
          </button>
          <div className="progress" aria-hidden="true">
            <i style={{ width: `${((a.cursor + 1) / a.entries.length) * 100}%` }} />
          </div>
          <span className="muted small num">{formatDuration((now - a.startedAt) / 1000)}</span>
        </div>

        <div>
          <p className="muted small">
            {a.dayName} · {a.cursor + 1} of {a.entries.length}
          </p>
          <h1 className="h1">{ex.name}</h1>
          {p && (
            <p className="muted" style={{ marginTop: 4 }}>
              {describe(p)}
              {effortText(p) ? ` · ${effortText(p)}` : ''}
            </p>
          )}
        </div>

        {(item?.cue ?? ex.cue) && <p className="note">{item?.cue ?? ex.cue}</p>}

        {!timed && (tip.note || lastText) && (
          <div className="card stack" style={{ gap: 6 }}>
            {lastText && (
              <p className="small">
                <span className="muted">Last time: </span>
                <span className="num">{lastText}</span>
              </p>
            )}
            {tip.note && <p className="small">{tip.note}</p>}
            {tip.advanceTo && program && item && (
              <button
                className="btn sm primary"
                style={{ justifySelf: 'start' }}
                onClick={async () => {
                  await saveProgram(replaceExercise(program, item.exerciseId, tip.advanceTo!));
                  patchEntry((e) => ({ ...e, exerciseId: tip.advanceTo!, sets: e.sets.map(() => ({ done: false })) }));
                }}
              >
                Move up to {getExercise(tip.advanceTo).name}
              </button>
            )}
          </div>
        )}

        {timed && p ? (
          <TimedPanel
            key={entry.itemId}
            reps={p.mode === 'intervals' ? p.reps : 1}
            segments={p.mode === 'intervals' ? p.segments : [{ label: ex.name, seconds: p.seconds, kind: 'work' }]}
            done={entry.sets[0]?.done ?? false}
            sound={settings.sound}
            onDone={(seconds) => patchSet(0, { done: true, seconds })}
            onUndo={() => patchSet(0, { done: false })}
          />
        ) : (
          <SetsPanel entry={entry} hold={p?.mode === 'hold'} weighted={ex.logType === 'weight_reps'} tip={tip} range={p?.mode === 'reps' ? p.reps : p?.mode === 'hold' ? p.seconds : undefined} onPatch={patchSet} onToggle={toggleSet} sound={settings.sound} />
        )}

        {!timed && (
          <div className="row">
            <button className="btn sm" onClick={() => patchEntry((e) => ({ ...e, sets: [...e.sets, { kg: e.sets[e.sets.length - 1]?.kg, done: false }] }))}>
              <Icon name="plus" size={14} /> Add set
            </button>
            {entry.sets.length > 1 && (
              <button className="btn sm ghost" onClick={() => patchEntry((e) => ({ ...e, sets: e.sets.slice(0, -1) }))}>
                <Icon name="minus" size={14} /> Remove set
              </button>
            )}
            {program && item && (
              <button className="btn sm ghost" style={{ marginLeft: 'auto' }} onClick={() => setSheet('swap')}>
                <Icon name="swap" size={14} /> Swap
              </button>
            )}
          </div>
        )}

        <div className="footer">
          {rest && (
            <div className="restbar" role="timer" aria-label="Rest timer">
              <i style={{ width: `${Math.min(100, 100 - ((rest.end - now) / (rest.total * 1000)) * 100)}%` }} />
              <Icon name="timer" size={20} />
              <b className="grow">{formatDuration(Math.max(0, Math.ceil((rest.end - now) / 1000)))}</b>
              <button onClick={() => setRest({ end: rest.end + 15000, total: rest.total + 15 })}>+15 s</button>
              <button onClick={() => setRest(null)}>Skip</button>
            </div>
          )}
          <div className="row">
            <button className="icon-btn" style={{ width: 56, height: 56 }} onClick={() => go(-1)} disabled={a.cursor === 0} aria-label="Previous exercise">
              <Icon name="left" />
            </button>
            {isLast ? (
              <button className="btn primary big grow" onClick={() => setSheet('finish')}>
                Finish workout
              </button>
            ) : (
              <button className="btn primary big grow" onClick={() => go(1)}>
                Next: {findExercise(a.entries[a.cursor + 1].exerciseId)?.name}
              </button>
            )}
          </div>
        </div>
      </div>

      {sheet === 'swap' && program && item && (
        <Sheet title="Swap exercise" onClose={() => setSheet(null)}>
          <p className="muted small">The change is saved to your program.</p>
          <SwapList
            item={item}
            profile={profile}
            onPick={async (id, everywhere) => {
              await saveProgram(everywhere ? replaceExercise(program, item.exerciseId, id) : setExercise(program, item.id, id));
              patchEntry((e) => ({ ...e, exerciseId: id, sets: e.sets.map(() => ({ done: false })) }));
              setSheet(null);
            }}
          />
        </Sheet>
      )}

      {sheet === 'quit' && (
        <Sheet title="Leave workout?" onClose={() => setSheet(null)}>
          <p className="muted small">Your progress is saved on this device. You can come back and resume.</p>
          <button className="btn block" onClick={onClose}>
            Pause and close
          </button>
          <button className="btn primary block" onClick={() => setSheet('finish')}>
            Finish and save
          </button>
          <button className="btn ghost danger block" onClick={discard}>
            Discard workout
          </button>
        </Sheet>
      )}

      {sheet === 'finish' && (
        <Sheet title="Finish workout" onClose={() => setSheet(null)}>
          <div className="tiles">
            <div className="tile">
              <b className="num">{formatDuration((now - a.startedAt) / 1000)}</b>
              <span>Duration</span>
            </div>
            <div className="tile">
              <b className="num">{doneSets(a)}</b>
              <span>Sets done</span>
            </div>
            <div className="tile">
              <b className="num">
                {a.entries.filter((e) => e.sets.some((s) => s.done)).length}/{a.entries.length}
              </b>
              <span>Exercises</span>
            </div>
          </div>
          {doneSets(a) === 0 ? (
            <>
              <p className="muted small">Nothing is ticked yet, so there is nothing to save.</p>
              <button className="btn ghost danger block" onClick={discard}>
                Discard workout
              </button>
            </>
          ) : (
            <>
              <div className="field">
                <span>How hard was it? (optional)</span>
                <div className="chips">
                  {[
                    [3, 'Easy'],
                    [5, 'Moderate'],
                    [7, 'Hard'],
                    [9, 'Very hard'],
                  ].map(([v, label]) => (
                    <button key={v} className={`chip ${effort === v ? 'on' : ''}`} onClick={() => setEffort(effort === v ? undefined : (v as number))}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="field">
                <span>Note (optional)</span>
                <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="How it felt, pain, wins" />
              </label>
              <button className="btn primary big block" onClick={save}>
                Save workout
              </button>
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}

/* ---------- Sets of reps or holds ---------- */

type SetsProps = {
  entry: Entry;
  hold: boolean;
  weighted: boolean;
  tip: Suggestion;
  range: [number, number] | undefined;
  sound: boolean;
  onPatch: (i: number, patch: Partial<SetLog>) => void;
  onToggle: (i: number) => void;
};

function SetsPanel({ entry, hold, weighted, tip, range, sound, onPatch, onToggle }: SetsProps) {
  const { units } = useSettings();
  const [holdStart, setHoldStart] = useState<number | null>(null);
  const now = useNow(holdStart != null, 200);
  const elapsed = holdStart ? Math.floor((now - holdStart) / 1000) : 0;
  const target = range?.[1];
  const beeped = useRef(false);

  useEffect(() => {
    if (holdStart && target && elapsed >= target && !beeped.current) {
      beeped.current = true;
      if (sound) beep('go');
    }
  }, [elapsed, holdStart, target, sound]);

  const nextUndone = entry.sets.findIndex((s) => !s.done);
  const placeholder = hold ? String(tip.seconds ?? range?.[0] ?? '') : String(tip.reps ?? range?.[0] ?? '');

  function stopHold() {
    if (nextUndone >= 0 && elapsed > 0) {
      onPatch(nextUndone, { seconds: elapsed });
      onToggle(nextUndone);
    }
    setHoldStart(null);
  }

  return (
    <>
      {hold && nextUndone >= 0 && (
        <div className="card stack center">
          {holdStart ? (
            <>
              <div className="timer-big">{elapsed}</div>
              <p className="muted small">seconds{target ? ` · target ${range![0]}-${target}` : ''}</p>
              <button className="btn primary block" onClick={stopHold}>
                Stop and log
              </button>
            </>
          ) : (
            <button
              className="btn block"
              onClick={() => {
                unlockAudio();
                beeped.current = false;
                setHoldStart(Date.now());
              }}
            >
              <Icon name="timer" size={18} /> Start hold timer
            </button>
          )}
        </div>
      )}
      <div className="sets">
        {entry.sets.map((s, i) => (
          <div key={i} className={`set ${weighted ? '' : 'single'} ${s.done ? 'done' : ''}`}>
            <span className="idx">{i + 1}</span>
            {weighted && (
              <div className="cell">
                <NumInput label={`Set ${i + 1} weight`} value={s.kg == null ? undefined : showWeight(s.kg, units)} onChange={(v) => onPatch(i, { kg: v == null ? undefined : toKg(v, units) })} placeholder="0" />
                <small>{weightUnit(units)}</small>
              </div>
            )}
            <div className="cell">
              {hold ? (
                <NumInput label={`Set ${i + 1} seconds`} value={s.seconds} onChange={(v) => onPatch(i, { seconds: v })} placeholder={placeholder} />
              ) : (
                <NumInput label={`Set ${i + 1} reps`} value={s.reps} onChange={(v) => onPatch(i, { reps: v })} placeholder={placeholder} />
              )}
              <small>{hold ? 's' : 'reps'}</small>
            </div>
            <button className={`check ${s.done ? 'on' : ''}`} onClick={() => onToggle(i)} aria-label={`Set ${i + 1} ${s.done ? 'done' : 'not done'}`} aria-pressed={s.done}>
              <Icon name="check" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- Timed work: one block of time, or repeated segments ---------- */

type TimedProps = {
  reps: number;
  segments: Segment[];
  done: boolean;
  sound: boolean;
  onDone: (workSeconds: number) => void;
  onUndo: () => void;
};

function TimedPanel({ reps, segments, done, sound, onDone, onUndo }: TimedProps) {
  // Elapsed time is derived from timestamps so it stays right when the screen locks.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [banked, setBanked] = useState(0);
  const now = useNow(startedAt != null, 200);
  const elapsed = banked + (startedAt ? (now - startedAt) / 1000 : 0);

  const steps = useMemo(() => Array.from({ length: reps }, (_, r) => segments.map((s) => ({ ...s, round: r + 1 }))).flat(), [reps, segments]);
  const total = steps.reduce((x, s) => x + s.seconds, 0);
  const workTotal = steps.filter((s) => s.kind === 'work').reduce((x, s) => x + s.seconds, 0);

  let index = 0;
  let before = 0;
  while (index < steps.length - 1 && elapsed >= before + steps[index].seconds) {
    before += steps[index].seconds;
    index++;
  }
  const step = steps[index];
  const remaining = Math.max(0, Math.ceil(before + step.seconds - elapsed));
  const finished = elapsed >= total;

  const lastIndex = useRef(0);
  const lastTick = useRef(-1);
  useEffect(() => {
    if (startedAt == null) return;
    if (finished) {
      if (sound) beep('end');
      setBanked(total);
      setStartedAt(null);
      onDone(workTotal);
      return;
    }
    if (index !== lastIndex.current) {
      lastIndex.current = index;
      if (sound) beep('go');
    } else if (remaining <= 3 && remaining > 0 && remaining !== lastTick.current && steps.length > 1) {
      lastTick.current = remaining;
      if (sound) beep('tick');
    }
  }, [index, remaining, finished, startedAt, sound, total, workTotal, onDone, steps.length]);

  const toggle = () => {
    unlockAudio();
    if (startedAt) {
      setBanked(elapsed);
      setStartedAt(null);
    } else {
      setStartedAt(Date.now());
    }
  };
  const skip = () => {
    const target = before + step.seconds;
    setBanked(target);
    if (startedAt) setStartedAt(Date.now());
  };

  if (done) {
    return (
      <div className="card accent stack center">
        <div className="row" style={{ justifyContent: 'center' }}>
          <Icon name="check" />
          <b>Done</b>
        </div>
        <button className="link" onClick={onUndo}>
          Undo
        </button>
      </div>
    );
  }

  return (
    <div className="card stack center" style={{ gap: 14, padding: 22 }}>
      {steps.length > 1 && (
        <p className="muted small">
          {reps > 1 ? `Round ${step.round} of ${reps} · ` : ''}step {index + 1} of {steps.length}
        </p>
      )}
      <h2 className="h1" style={{ color: step.kind === 'work' ? 'var(--accent)' : 'var(--text-muted)' }}>
        {step.label}
      </h2>
      <div className="timer-big" role="timer">
        {formatDuration(remaining)}
      </div>
      {index < steps.length - 1 && (
        <p className="muted small">
          Next: {steps[index + 1].label} {formatDuration(steps[index + 1].seconds)}
        </p>
      )}
      <div className="progress">
        <i style={{ width: `${Math.min(100, (elapsed / total) * 100)}%` }} />
      </div>
      <button className="btn primary big block" onClick={toggle}>
        <Icon name={startedAt ? 'pause' : 'play'} size={18} /> {startedAt ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start'}
      </button>
      <div className="row" style={{ justifyContent: 'center' }}>
        {steps.length > 1 && index < steps.length - 1 && (
          <button className="btn sm ghost" onClick={skip}>
            Skip step
          </button>
        )}
        <button className="btn sm ghost" onClick={() => onDone(Math.round(Math.min(elapsed, total) * (workTotal / total)) || workTotal)}>
          Mark as done
        </button>
      </div>
    </div>
  );
}

/* ---------- After saving ---------- */

function Summary({ session, onClose }: { session: Session; onClose: () => void }) {
  const sets = session.entries.reduce((n, e) => n + e.sets.length, 0);
  return (
    <div className="overlay">
      <div className="overlay-inner" style={{ justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
          <Icon name="trophy" size={64} />
        </div>
        <h1 className="h1">Workout complete</h1>
        <p className="muted">{session.dayName} is in the book. Showing up is what counts.</p>
        <div className="tiles">
          <div className="tile">
            <b className="num">{formatDuration(session.durationSeconds)}</b>
            <span>Duration</span>
          </div>
          <div className="tile">
            <b className="num">{sets}</b>
            <span>Sets</span>
          </div>
          <div className="tile">
            <b className="num">{session.entries.length}</b>
            <span>Exercises</span>
          </div>
        </div>
        <button className="btn primary big block" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
