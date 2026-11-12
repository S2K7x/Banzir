import { useMemo, useRef, useState } from 'react';
import { EXERCISES, getExercise, rx } from '../../data/exercises';
import { saveProgram } from '../../lib/db';
import { addDay, addItem, dayItemCount, duplicateDay, moveDay, moveItem, removeDay, removeItem, renameDay, replaceExercise, setExercise, updateItem, updateMeta } from '../../lib/edit';
import { canDo, equipmentSet, estimateMinutes } from '../../lib/matcher';
import type { Exercise, Item, Prescription, Profile, Program, Slot } from '../../lib/schema';
import { formatSpan } from '../../lib/settings';
import { describe } from '../../lib/text';
import { Icon, Segmented, Sheet, Stepper, useFocusTrap } from '../../ui/kit';
import { SwapList } from './SwapList';

type Props = { program: Program; profile: Profile; onClose: () => void };

const CATEGORIES: { id: string; label: string; slots: Slot[] }[] = [
  { id: 'push', label: 'Push', slots: ['push_h', 'push_v', 'arm_ext', 'shoulder_lat'] },
  { id: 'pull', label: 'Pull', slots: ['pull_h', 'pull_v', 'arm_flex', 'shoulder_rear'] },
  { id: 'legs', label: 'Legs', slots: ['squat', 'hinge', 'single_leg', 'calf', 'plyo'] },
  { id: 'core', label: 'Core', slots: ['core', 'carry'] },
  { id: 'skill', label: 'Skills', slots: ['skill'] },
  { id: 'cardio', label: 'Cardio', slots: ['cardio'] },
  { id: 'prep', label: 'Warm-up', slots: ['mobility'] },
];

/** Full-screen editor for the active program. Every change is saved straight away. */
export function Builder({ program: stored, profile, onClose }: Props) {
  const trapRef = useRef<HTMLDivElement>(null);
  useFocusTrap(trapRef);
  // The editor works on its own copy so quick taps never build on a stale program.
  const [program, setProgram] = useState(stored);
  const [phaseId, setPhaseId] = useState(program.phases[0].id);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [confirmDay, setConfirmDay] = useState<string | null>(null);
  const phase = program.phases.find((p) => p.id === phaseId) ?? program.phases[0];
  const save = (p: Program) => {
    setProgram(p);
    void saveProgram(p);
  };
  const item = editing ? phase.days.flatMap((d) => d.blocks.flatMap((b) => b.items)).find((i) => i.id === editing) : undefined;

  return (
    <div ref={trapRef} tabIndex={-1} className="overlay" role="dialog" aria-modal="true" aria-label="Edit plan">
      <div className="overlay-inner">
        <div className="topbar">
          <button className="icon-btn" onClick={onClose} aria-label="Close editor">
            <Icon name="x" size={18} />
          </button>
          <h1 className="h2 grow">Edit plan</h1>
          <span className="muted small">Saved automatically</span>
        </div>

        <div className="card stack">
          <label className="field">
            <span>Name</span>
            <input className="input" value={program.name} onChange={(e) => save(updateMeta(program, { name: e.target.value }))} aria-label="Program name" />
          </label>
          <Stepper label="Sessions per week" value={program.daysPerWeek} min={1} max={7} onChange={(v) => save(updateMeta(program, { daysPerWeek: v }))} />
          <div className="field">
            <span>Suggest a lighter week</span>
            <Segmented
              value={program.deloadEveryWeeks ?? 0}
              onChange={(v) => save(updateMeta(program, { deloadEveryWeeks: v === 0 ? null : v }))}
              options={[
                { value: 0, label: 'Never' },
                { value: 4, label: 'Every 4' },
                { value: 6, label: 'Every 6' },
                { value: 8, label: 'Every 8' },
              ]}
            />
          </div>
        </div>

        {program.phases.length > 1 && (
          <div className="field">
            <span>This plan changes over time. Pick the part to edit.</span>
            <div className="chips">
              {program.phases.map((p) => (
                <button key={p.id} className={`chip ${p.id === phase.id ? 'on' : ''}`} onClick={() => setPhaseId(p.id)}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase.days.map((day, di) => (
          <div className="card stack" key={day.id}>
            <div className="row">
              <input className="name-input grow" value={day.name} onChange={(e) => save(renameDay(program, day.id, e.target.value))} aria-label={`Name of day ${di + 1}`} />
              <button className="mini-btn" onClick={() => save(moveDay(program, day.id, -1))} disabled={di === 0} aria-label={`Move ${day.name} earlier`}>
                <Icon name="arrowUp" size={16} />
              </button>
              <button className="mini-btn" onClick={() => save(moveDay(program, day.id, 1))} disabled={di === phase.days.length - 1} aria-label={`Move ${day.name} later`}>
                <Icon name="arrowDown" size={16} />
              </button>
            </div>
            <p className="muted small" style={{ marginTop: -6 }}>
              Session {di + 1} of {phase.days.length}
              {dayItemCount(day) > 0 ? ` · about ${estimateMinutes(day)} min` : ''}
            </p>

            {dayItemCount(day) === 0 ? (
              <p className="muted small">No exercises yet.</p>
            ) : (
              <div>
                {day.blocks.flatMap((b) =>
                  b.items.map((it) => {
                    const flat = day.blocks.flatMap((x) => x.items);
                    const idx = flat.findIndex((x) => x.id === it.id);
                    const name = getExercise(it.exerciseId).name;
                    return (
                      <div className="item-row" key={it.id}>
                        <button className="main" onClick={() => setEditing(it.id)} aria-label={`Edit ${name}`}>
                          <span>{name}</span>
                          <span className="muted small num">
                            {describe(rx(it))}
                            {b.type !== 'main' ? ` · ${b.type === 'warmup' ? 'warm-up' : b.type === 'cooldown' ? 'cool-down' : 'superset'}` : ''}
                          </span>
                        </button>
                        <button className="mini" onClick={() => save(moveItem(program, it.id, -1))} disabled={idx === 0} aria-label={`Move ${name} up`}>
                          <Icon name="arrowUp" size={16} />
                        </button>
                        <button className="mini" onClick={() => save(moveItem(program, it.id, 1))} disabled={idx === flat.length - 1} aria-label={`Move ${name} down`}>
                          <Icon name="arrowDown" size={16} />
                        </button>
                      </div>
                    );
                  }),
                )}
              </div>
            )}

            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button className="btn sm primary" onClick={() => setAdding(day.id)}>
                <Icon name="plus" size={14} /> Add exercise
              </button>
              <button className="btn sm ghost" onClick={() => save(duplicateDay(program, day.id))}>
                <Icon name="copy" size={14} /> Duplicate
              </button>
              {phase.days.length > 1 &&
                (confirmDay === day.id ? (
                  <button
                    className="btn sm danger"
                    onClick={() => {
                      save(removeDay(program, day.id));
                      setConfirmDay(null);
                    }}
                  >
                    Confirm delete
                  </button>
                ) : (
                  <button className="btn sm ghost danger" onClick={() => setConfirmDay(day.id)} aria-label={`Delete ${day.name}`}>
                    <Icon name="trash" size={14} /> Delete
                  </button>
                ))}
            </div>
          </div>
        ))}

        <button className="btn block" onClick={() => save(addDay(program, phase.id))}>
          <Icon name="plus" size={18} /> Add a day
        </button>
        <p className="muted small">Sessions are done in the order shown, then start again from the top.</p>

        <div className="footer">
          <button className="btn primary big block" onClick={onClose}>
            Done
          </button>
        </div>
      </div>

      {item && (
        <ItemSheet
          item={item}
          profile={profile}
          onClose={() => setEditing(null)}
          onChange={(patch) => save(updateItem(program, item.id, patch))}
          onRemove={() => {
            save(removeItem(program, item.id));
            setEditing(null);
          }}
          onSwap={(id, everywhere) => save(everywhere ? replaceExercise(program, item.exerciseId, id) : setExercise(program, item.id, id))}
        />
      )}

      {adding && (
        <ExercisePicker
          profile={profile}
          onClose={() => setAdding(null)}
          onPick={(ex) => {
            save(addItem(program, adding, ex));
            setAdding(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------- One exercise: sets, reps, rest, variation ---------- */

type ItemSheetProps = {
  item: Item;
  profile: Profile;
  onClose: () => void;
  onChange: (patch: Partial<Omit<Item, 'id'>>) => void;
  onRemove: () => void;
  onSwap: (exerciseId: string, everywhere: boolean) => void;
};

function ItemSheet({ item, profile, onClose, onChange, onRemove, onSwap }: ItemSheetProps) {
  const [swapping, setSwapping] = useState(false);
  const ex = getExercise(item.exerciseId);
  const p = item.prescription;
  const set = (prescription: Prescription) => onChange({ prescription });

  return (
    <Sheet title={ex.name} onClose={onClose}>
      {(item.cue ?? ex.cue) && <p className="note">{item.cue ?? ex.cue}</p>}

      {swapping ? (
        <>
          <SwapList
            item={item}
            profile={profile}
            onPick={(id, everywhere) => {
              onSwap(id, everywhere);
              setSwapping(false);
            }}
          />
          <button className="btn block" onClick={() => setSwapping(false)}>
            Back
          </button>
        </>
      ) : (
        <>
          <div className="card stack" style={{ gap: 2 }}>
            {p.mode === 'reps' && (
              <>
                <Stepper label="Sets" value={p.sets} min={1} max={12} onChange={(sets) => set({ ...p, sets })} />
                {ex.range ? (
                  <p className="muted small" style={{ padding: '8px 0' }}>
                    This drill always uses {ex.range[0]}-{ex.range[1]} reps.
                  </p>
                ) : (
                  <>
                    <Stepper label="Reps, from" value={p.reps[0]} min={1} max={50} onChange={(lo) => set({ ...p, reps: [lo, Math.max(lo, p.reps[1])] })} />
                    <Stepper label="Reps, up to" value={p.reps[1]} min={1} max={50} onChange={(hi) => set({ ...p, reps: [Math.min(p.reps[0], hi), hi] })} />
                  </>
                )}
              </>
            )}
            {p.mode === 'hold' && (
              <>
                <Stepper label="Sets" value={p.sets} min={1} max={12} onChange={(sets) => set({ ...p, sets })} />
                <Stepper label="Hold, from" value={p.seconds[0]} min={5} max={300} step={5} format={(v) => `${v} s`} onChange={(lo) => set({ ...p, seconds: [lo, Math.max(lo, p.seconds[1])] })} />
                <Stepper label="Hold, up to" value={p.seconds[1]} min={5} max={300} step={5} format={(v) => `${v} s`} onChange={(hi) => set({ ...p, seconds: [Math.min(p.seconds[0], hi), hi] })} />
              </>
            )}
            {p.mode === 'time' && <Stepper label="Duration" value={Math.round(p.seconds / 60)} min={1} max={240} format={(v) => `${v} min`} onChange={(m) => set({ ...p, seconds: m * 60 })} />}
            {p.mode === 'intervals' && (
              <>
                <Stepper label="Rounds" value={p.reps} min={1} max={40} onChange={(reps) => set({ ...p, reps })} />
                {p.segments.map((s, i) => (
                  <Stepper
                    key={i}
                    label={s.label}
                    value={s.seconds}
                    min={5}
                    max={3600}
                    step={s.seconds >= 300 ? 60 : s.seconds >= 60 ? 15 : 5}
                    format={formatSpan}
                    onChange={(seconds) => set({ ...p, segments: p.segments.map((x, j) => (j === i ? { ...x, seconds } : x)) })}
                  />
                ))}
              </>
            )}
            {(p.mode === 'reps' || p.mode === 'hold') && <Stepper label="Rest between sets" value={item.restSeconds ?? 0} min={0} max={300} step={15} format={(v) => (v === 0 ? 'None' : formatSpan(v))} onChange={(restSeconds) => onChange({ restSeconds })} />}
          </div>

          <button className="btn block" onClick={() => setSwapping(true)}>
            <Icon name="swap" size={18} /> {ex.ladder ? 'Change variation or exercise' : 'Change exercise'}
          </button>
          <button className="btn ghost danger block" onClick={onRemove}>
            <Icon name="trash" size={16} /> Remove from this day
          </button>
        </>
      )}
    </Sheet>
  );
}

/* ---------- Exercise picker ---------- */

function ExercisePicker({ profile, onPick, onClose }: { profile: Profile; onPick: (ex: Exercise) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [mine, setMine] = useState(true);
  const eq = useMemo(() => equipmentSet(profile.equipment), [profile.equipment]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const slots = CATEGORIES.find((c) => c.id === category)?.slots;
    return EXERCISES.filter((e) => (!slots || slots.includes(e.slot)) && (!mine || canDo(e, eq)) && (!q || e.name.toLowerCase().includes(q) || e.primary.some((m) => m.includes(q)))).sort((a, b) => {
      const starts = (e: Exercise) => (q && e.name.toLowerCase().startsWith(q) ? 0 : 1);
      return starts(a) - starts(b) || a.name.localeCompare(b.name);
    });
  }, [query, category, mine, eq]);

  return (
    <Sheet title="Add exercise" onClose={onClose}>
      <input className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or muscle" aria-label="Search exercises" />
      <div className="chips">
        <button className={`chip ${category === 'all' ? 'on' : ''}`} onClick={() => setCategory('all')}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.id} className={`chip ${category === c.id ? 'on' : ''}`} onClick={() => setCategory(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <button className={`chip ${mine ? 'on' : ''}`} style={{ justifySelf: 'start' }} onClick={() => setMine(!mine)} aria-pressed={mine}>
        Only what I can do with my equipment
      </button>
      {results.length === 0 ? (
        <p className="muted small">Nothing matches. Try another word, or turn off the equipment filter.</p>
      ) : (
        <div className="list">
          {results.map((e) => (
            <button key={e.id} onClick={() => onPick(e)}>
              <span className="grow">
                {e.name}
                <span className="muted small" style={{ display: 'block', textTransform: 'capitalize' }}>
                  {e.primary.join(', ') || 'Preparation'}
                </span>
              </span>
              <Icon name="plus" size={16} />
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
