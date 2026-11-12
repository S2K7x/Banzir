import { useMemo, useRef, useState } from 'react';
import { getExercise, rx } from '../../data/exercises';
import { importBackup } from '../../lib/backup';
import { activateProgram, db, requestPersistence } from '../../lib/db';
import { rankTemplates, type Match } from '../../lib/ranking';
import { EQUIPMENT, GOALS, LEVELS } from '../../lib/constants';
import type { Equipment, Goal, Level, Profile } from '../../lib/schema';
import { updateSettings, useSettings } from '../../lib/settings';
import { DISCLAIMER, EQUIPMENT_LABEL, GOAL_INFO, LEVEL_INFO, describe } from '../../lib/text';
import { Icon, NumInput, Segmented } from '../../ui/kit';
import { ThemePicker } from '../profile/ThemePicker';
import { InstallCard } from './Install';

type Place = 'gym' | 'home' | 'none';

type Draft = {
  name: string;
  goal: Goal;
  level: Level;
  place: Place;
  equipment: Equipment[];
  daysPerWeek: number;
  sessionMinutes: number;
  age?: number;
  sex?: 'male' | 'female';
  heightCm?: number;
  weightKg?: number;
  flags: string[];
  pushups?: number;
  pullups?: number;
  focus?: string;
  runMinutes?: number;
};

const HOME_ITEMS: Equipment[] = ['dumbbells', 'bench', 'bands', 'pullup_bar', 'kettlebell', 'barbell', 'rack', 'rings', 'parallettes', 'dip_bars', 'jump_rope'];
const SMALL_ITEMS: Equipment[] = ['pullup_bar', 'bands', 'rings', 'parallettes', 'dip_bars', 'jump_rope'];

const FLAGS: { id: string; label: string }[] = [
  { id: 'heart', label: 'Heart condition or chest pain' },
  { id: 'dizzy', label: 'Dizziness or fainting' },
  { id: 'joint', label: 'Bone or joint problem' },
  { id: 'pregnant', label: 'Pregnant or recently gave birth' },
  { id: 'surgery', label: 'Recent surgery' },
  { id: 'injury', label: 'Current injury' },
];

const PUSHUPS = [
  { label: 'None yet', value: 0 },
  { label: '1-5', value: 3 },
  { label: '6-15', value: 10 },
  { label: '16-29', value: 20 },
  { label: '30+', value: 35 },
];
const PULLUPS = [
  { label: 'None yet', value: 0 },
  { label: '1-4', value: 2 },
  { label: '5-11', value: 8 },
  { label: '12+', value: 12 },
];

/** "What do you want most?" per goal. Ids match template tags. */
const FOCUS: Partial<Record<Goal, { id: string; label: string }[]>> = {
  calisthenics: [
    { id: 'foundation', label: 'Strong all round' },
    { id: 'pullup', label: 'My first pull-up' },
    { id: 'handstand', label: 'Handstand' },
    { id: 'planche', label: 'Planche' },
    { id: 'frontlever', label: 'Front lever' },
    { id: 'muscleup', label: 'Muscle-up' },
  ],
  running: [
    { id: 'start', label: 'Start running' },
    { id: '5k', label: '5 km' },
    { id: '10k', label: '10 km' },
    { id: 'half', label: 'Half marathon' },
    { id: 'marathon', label: 'Marathon' },
    { id: 'strength', label: 'Strength for my running' },
  ],
  sport: [
    { id: 'boxing', label: 'Boxing' },
    { id: 'tennis', label: 'Tennis' },
    { id: 'soccer', label: 'Soccer' },
    { id: 'basketball', label: 'Basketball' },
    { id: 'athlete', label: 'Another sport' },
  ],
  general_fitness: [
    { id: 'express', label: 'As little time as possible' },
    { id: 'senior', label: 'Staying strong as I get older' },
    { id: 'mobility', label: 'Only mobility for now' },
  ],
  fat_loss: [{ id: 'low-impact', label: 'Easy on my joints' }],
  muscle: [{ id: 'home', label: 'Training at home' }],
};

const RUN_MINUTES = [
  { label: 'Not yet', value: 0 },
  { label: 'About 20 min', value: 20 },
  { label: 'About 30 min', value: 30 },
  { label: 'An hour or more', value: 60 },
];

/** Shown when the focus asks for more than the person reported. */
function focusNote(d: Draft): string | null {
  if (d.goal === 'calisthenics' && ['planche', 'frontlever', 'muscleup'].includes(d.focus ?? '') && d.level === 'beginner')
    return 'These skills need a base first. We will start you on foundations, and the skill plan stays available under other plans.';
  const need: Record<string, number> = { '5k': 20, '10k': 30, half: 30, marathon: 60 };
  const req = need[d.focus ?? ''];
  if (d.goal === 'running' && req != null && (d.runMinutes ?? (d.level === 'beginner' ? 0 : req)) < req)
    return `This plan starts from about ${req} minutes of easy running. We will build you up to that first; the plan stays available under other plans.`;
  return null;
}

const STEPS = ['welcome', 'goal', 'level', 'equipment', 'schedule', 'about', 'plan', 'look', 'ready'] as const;

function placeOf(eq: Equipment[]): Place {
  if (eq.includes('machines') && eq.includes('cables')) return 'gym';
  return eq.some((e) => !SMALL_ITEMS.includes(e)) ? 'home' : 'none';
}

function toProfile(d: Draft, createdAt: string): Profile {
  return {
    id: 'me',
    name: d.name.trim(),
    goal: d.goal,
    level: d.level,
    equipment: d.place === 'gym' ? [...EQUIPMENT] : d.equipment,
    daysPerWeek: d.daysPerWeek,
    sessionMinutes: d.sessionMinutes,
    age: d.age,
    sex: d.sex,
    heightCm: d.heightCm,
    weightKg: d.weightKg,
    flags: d.flags,
    ability: { pushups: d.pushups, pullups: d.pullups, runMinutes: d.runMinutes },
    focus: FOCUS[d.goal]?.some((f) => f.id === d.focus) ? d.focus : undefined,
    createdAt,
  };
}

type Props = {
  /** Existing profile when editing from the Profile tab. */
  initial?: Profile;
  currentPlan?: string;
  onDone: () => void;
  onCancel?: () => void;
};

export function Onboarding({ initial, currentPlan, onDone, onCancel }: Props) {
  const settings = useSettings();
  const editing = !!initial;
  const [step, setStep] = useState(editing ? 1 : 0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const modulesTouched = useRef(false);
  const [d, setD] = useState<Draft>(() =>
    initial
      ? {
          name: initial.name,
          goal: initial.goal,
          level: initial.level,
          place: placeOf(initial.equipment),
          equipment: initial.equipment,
          daysPerWeek: initial.daysPerWeek,
          sessionMinutes: initial.sessionMinutes,
          age: initial.age,
          sex: initial.sex,
          heightCm: initial.heightCm,
          weightKg: initial.weightKg,
          flags: initial.flags,
          pushups: initial.ability.pushups,
          pullups: initial.ability.pullups,
          focus: initial.focus,
          runMinutes: initial.ability.runMinutes,
        }
      : { name: '', goal: 'general_fitness', level: 'beginner', place: 'gym', equipment: [], daysPerWeek: 3, sessionMinutes: 45, flags: [] },
  );
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const id = STEPS[step];
  const profile = useMemo(() => toProfile(d, initial?.createdAt ?? new Date().toISOString()), [d, initial]);
  const matches = useMemo(() => (id === 'plan' ? rankTemplates(profile).slice(0, 4) : []), [id, profile]);
  const pick: Match | undefined = matches.find((m) => m.template.id === chosen) ?? matches[0];
  const imperial = settings.units === 'imperial';

  const next = () => {
    // Suggest the modules that fit the goal the first time the person reaches the look step.
    if (!editing && STEPS[step + 1] === 'look' && !modulesTouched.current) {
      modulesTouched.current = true;
      updateSettings({ modules: { nutrition: d.goal === 'fat_loss' || settings.modules.nutrition, body: d.goal === 'fat_loss' || d.goal === 'muscle' || settings.modules.body } });
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const back = () => (step === (editing ? 1 : 0) ? onCancel?.() : setStep((s) => s - 1));

  async function finish(keepPlan: boolean) {
    await db.profile.put(profile);
    if (!keepPlan) {
      const match = rankTemplates(profile).find((m) => m.template.id === (chosen ?? '')) ?? rankTemplates(profile)[0];
      await activateProgram(match.program);
    }
    void requestPersistence();
    onDone();
  }

  const toggleEq = (e: Equipment) => set({ equipment: d.equipment.includes(e) ? d.equipment.filter((x) => x !== e) : [...d.equipment, e] });
  const toggleFlag = (f: string) => set({ flags: d.flags.includes(f) ? d.flags.filter((x) => x !== f) : [...d.flags, f] });
  const askPullups = d.goal === 'calisthenics' || d.goal === 'strength' || d.goal === 'sport' || d.equipment.includes('pullup_bar');

  return (
    <div className="overlay">
      <div className="overlay-inner">
        <div className="topbar">
          {(step > 0 || onCancel) && (
            <button className="icon-btn" onClick={back} aria-label="Back">
              <Icon name={step === (editing ? 1 : 0) ? 'x' : 'left'} size={18} />
            </button>
          )}
          <div className="progress" aria-hidden="true">
            <i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
          {id !== 'welcome' && id !== 'plan' && id !== 'ready' && (
            <button className="link" onClick={next}>
              Skip
            </button>
          )}
        </div>

        {id === 'welcome' && (
          <>
            <div className="hero" style={{ ['--g1' as string]: '#16a37f', ['--g2' as string]: '#0b3b46', padding: 24 }}>
              <h1 className="h1" style={{ fontSize: 34 }}>
                Banzir
              </h1>
              <p className="muted" style={{ marginTop: 6 }}>
                Your own training app. A few questions, then a plan built for your goal, your level and your equipment.
              </p>
            </div>
            <label className="field">
              <span>What should we call you? (optional)</span>
              <input className="input" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="First name" autoComplete="given-name" />
            </label>
            <div className="field">
              <span>Units</span>
              <Segmented
                value={settings.units}
                onChange={(units) => updateSettings({ units })}
                options={[
                  { value: 'metric', label: 'kg · km' },
                  { value: 'imperial', label: 'lb · mi' },
                ]}
              />
            </div>
            <p className="muted small">Everything you enter stays on this device. No account needed.</p>
            <label className="link" style={{ justifySelf: 'start', cursor: 'pointer' }}>
              I have a Banzir backup file
              <input
                type="file"
                accept="application/json,.json"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    await importBackup(await file.text());
                    onDone();
                  } catch (err) {
                    setRestoreError(err instanceof Error ? err.message : 'Could not read this file.');
                  }
                }}
              />
            </label>
            {restoreError && <p className="note warn">{restoreError}</p>}
          </>
        )}

        {id === 'goal' && (
          <>
            <h1 className="h1">What is your main goal?</h1>
            <div className="stack">
              {GOALS.map((g) => {
                const info = GOAL_INFO[g];
                return (
                  <button key={g} className={`goal-card ${d.goal === g ? 'on' : ''}`} style={{ ['--g1' as string]: info.g1, ['--g2' as string]: info.g2 }} onClick={() => set({ goal: g })} aria-pressed={d.goal === g}>
                    <span className="glyph">
                      <Icon name={info.icon} />
                    </span>
                    <span className="grow">
                      <b>{info.label}</b>
                      <span>{info.blurb}</span>
                    </span>
                    {d.goal === g && <Icon name="check" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {id === 'level' && (
          <>
            <h1 className="h1">How experienced are you?</h1>
            <div className="stack">
              {LEVELS.map((l) => (
                <button key={l} className={`card tap ${d.level === l ? 'accent' : ''}`} onClick={() => set({ level: l })} aria-pressed={d.level === l}>
                  <b>{LEVEL_INFO[l].label}</b>
                  <p className="muted small">{LEVEL_INFO[l].blurb}</p>
                </button>
              ))}
            </div>
            {FOCUS[d.goal] && (
              <div className="field">
                <span>What do you want most?</span>
                <div className="chips">
                  {FOCUS[d.goal]!.map((f) => (
                    <button key={f.id} className={`chip ${d.focus === f.id ? 'on' : ''}`} onClick={() => set({ focus: d.focus === f.id ? undefined : f.id })} aria-pressed={d.focus === f.id}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {d.goal === 'running' && (
              <div className="field">
                <span>How long can you run without stopping?</span>
                <div className="chips">
                  {RUN_MINUTES.map((o) => (
                    <button key={o.label} className={`chip ${d.runMinutes === o.value ? 'on' : ''}`} onClick={() => set({ runMinutes: d.runMinutes === o.value ? undefined : o.value })} aria-pressed={d.runMinutes === o.value}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {focusNote(d) && <p className="muted small">{focusNote(d)}</p>}
            <div className="field">
              <span>Push-ups in a row (optional)</span>
              <div className="chips">
                {PUSHUPS.map((o) => (
                  <button key={o.label} className={`chip ${d.pushups === o.value ? 'on' : ''}`} onClick={() => set({ pushups: d.pushups === o.value ? undefined : o.value })}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            {askPullups && (
              <div className="field">
                <span>Pull-ups in a row (optional)</span>
                <div className="chips">
                  {PULLUPS.map((o) => (
                    <button key={o.label} className={`chip ${d.pullups === o.value ? 'on' : ''}`} onClick={() => set({ pullups: d.pullups === o.value ? undefined : o.value })}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {id === 'equipment' && (
          <>
            <h1 className="h1">Where will you train?</h1>
            <Segmented
              value={d.place}
              onChange={(place) => set({ place, equipment: place === 'home' ? ['dumbbells', 'bench'] : [] })}
              options={[
                { value: 'gym', label: 'Gym' },
                { value: 'home', label: 'Home, with weights' },
                { value: 'none', label: 'No equipment' },
              ]}
            />
            {d.place === 'gym' ? (
              <p className="muted">A full gym: barbells, dumbbells, machines and cables. Exercises you cannot do can be swapped at any time.</p>
            ) : (
              <div className="field">
                <span>{d.place === 'home' ? 'Tick what you have' : 'Anything from this list? (optional)'}</span>
                <div className="chips">
                  {(d.place === 'home' ? HOME_ITEMS : SMALL_ITEMS).map((e) => (
                    <button key={e} className={`chip ${d.equipment.includes(e) ? 'on' : ''}`} onClick={() => toggleEq(e)} aria-pressed={d.equipment.includes(e)}>
                      {EQUIPMENT_LABEL[e]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {id === 'schedule' && (
          <>
            <h1 className="h1">How much time do you have?</h1>
            <div className="field">
              <span>Sessions per week</span>
              <Segmented value={d.daysPerWeek} onChange={(daysPerWeek) => set({ daysPerWeek })} options={[2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))} />
            </div>
            <div className="field">
              <span>Minutes per session</span>
              <Segmented value={d.sessionMinutes} onChange={(sessionMinutes) => set({ sessionMinutes })} options={[20, 30, 45, 60, 75, 90].map((n) => ({ value: n, label: String(n) }))} />
            </div>
            <p className="muted small">Pick what you can keep up every week. A plan you follow beats a perfect plan you skip.</p>
          </>
        )}

        {id === 'about' && (
          <>
            <h1 className="h1">About you</h1>
            <p className="muted small">All optional. Used later for heart-rate zones and calorie estimates.</p>
            <div className="row">
              <label className="field grow">
                <span>Age</span>
                <NumInput value={d.age} onChange={(age) => set({ age })} label="Age" />
              </label>
              <div className="field grow">
                <span>Sex</span>
                <Segmented
                  value={d.sex ?? ''}
                  onChange={(v) => set({ sex: v === '' ? undefined : (v as 'male' | 'female') })}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                  ]}
                />
              </div>
            </div>
            <div className="row">
              <label className="field grow">
                <span>Height ({imperial ? 'in' : 'cm'})</span>
                <NumInput
                  value={d.heightCm == null ? undefined : imperial ? Math.round(d.heightCm / 2.54) : d.heightCm}
                  onChange={(v) => set({ heightCm: v == null ? undefined : imperial ? Math.round(v * 2.54) : v })}
                  label="Height"
                />
              </label>
              <label className="field grow">
                <span>Weight ({imperial ? 'lb' : 'kg'})</span>
                <NumInput
                  value={d.weightKg == null ? undefined : imperial ? Math.round(d.weightKg * 2.20462) : d.weightKg}
                  onChange={(v) => set({ weightKg: v == null ? undefined : imperial ? Math.round((v / 2.20462) * 10) / 10 : v })}
                  label="Weight"
                />
              </label>
            </div>
            <div className="field">
              <span>Does any of this apply to you?</span>
              <div className="chips">
                {FLAGS.map((f) => (
                  <button key={f.id} className={`chip ${d.flags.includes(f.id) ? 'on' : ''}`} onClick={() => toggleFlag(f.id)} aria-pressed={d.flags.includes(f.id)}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            {d.flags.length > 0 && <p className="note warn">Please check with a health professional before starting. We will suggest a gentler plan, and you can change every exercise.</p>}
          </>
        )}

        {id === 'plan' && pick && (
          <>
            <h1 className="h1">{d.name.trim() ? `${d.name.trim()}, here is your plan` : 'Here is your plan'}</h1>
            <PlanCard match={pick} />
            {matches.length > 1 && (
              <>
                <div className="section-title">
                  <h2 className="h2">Other plans that fit</h2>
                </div>
                <div className="card list">
                  {matches
                    .filter((m) => m !== pick)
                    .map((m) => (
                      <button key={m.template.id} onClick={() => setChosen(m.template.id)}>
                        <span className="grow">
                          <b>{m.template.name}</b>
                          <span className="muted small" style={{ display: 'block' }}>
                            {GOAL_INFO[m.template.goal].label} · {m.program.daysPerWeek} days · about {m.template.sessionMinutes} min
                          </span>
                        </span>
                        <Icon name="right" size={18} />
                      </button>
                    ))}
                </div>
              </>
            )}
          </>
        )}

        {id === 'look' && (
          <>
            <h1 className="h1">Make it yours</h1>
            <div className="field">
              <span>Also track (optional)</span>
              <div className="chips">
                <button className={`chip ${settings.modules.nutrition ? 'on' : ''}`} onClick={() => updateSettings({ modules: { ...settings.modules, nutrition: !settings.modules.nutrition } })} aria-pressed={settings.modules.nutrition}>
                  Food and calories
                </button>
                <button className={`chip ${settings.modules.body ? 'on' : ''}`} onClick={() => updateSettings({ modules: { ...settings.modules, body: !settings.modules.body } })} aria-pressed={settings.modules.body}>
                  Body weight
                </button>
              </div>
            </div>
            <p className="muted small">Pick a look. You can change all of this any time in Profile.</p>
            <ThemePicker />
          </>
        )}

        {id === 'ready' && (
          <>
            <h1 className="h1">One last thing</h1>
            <InstallCard />
            <p className="muted small">{DISCLAIMER}</p>
          </>
        )}

        <div className="footer">
          {id === 'plan' && editing && currentPlan && (
            <button className="btn block" onClick={() => finish(true)}>
              Keep my current plan ({currentPlan})
            </button>
          )}
          {id === 'ready' || (editing && id === 'plan') ? (
            <button className="btn primary big block" onClick={() => finish(false)}>
              {editing ? 'Switch to this plan' : 'Start training'}
            </button>
          ) : (
            <button className="btn primary big block" onClick={next}>
              {id === 'plan' ? 'Use this plan' : 'Continue'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanCard({ match }: { match: Match }) {
  const { program, template } = match;
  const info = GOAL_INFO[template.goal];
  const phase = program.phases[0];
  const days = phase.rotation.filter((r, i, a) => a.indexOf(r) === i).map((r) => phase.days.find((x) => x.id === r)!);
  const weeks = program.phases.reduce((a, p) => a + p.weeks, 0);
  return (
    <>
      <div className="hero" style={{ ['--g1' as string]: info.g1, ['--g2' as string]: info.g2 }}>
        <div className="chips" style={{ marginBottom: 10 }}>
          <span className="chip">{info.label}</span>
          <span className="chip">{program.daysPerWeek} days a week</span>
          <span className="chip">{program.loops ? 'Ongoing' : `${weeks} weeks`}</span>
        </div>
        <h2 className="h1" style={{ fontSize: 24 }}>
          {program.name}
        </h2>
        <p className="muted" style={{ marginTop: 6 }}>
          {program.description}
        </p>
      </div>
      {days.map((day) => (
        <div className="card" key={day.id}>
          <b>{day.name}</b>
          <div className="list" style={{ marginTop: 10 }}>
            {day.blocks
              .filter((b) => b.type === 'main')
              .flatMap((b) => b.items)
              .map((item) => (
                <div key={item.id} style={{ minHeight: 0, padding: '8px 0' }}>
                  <span className="grow">{getExercise(item.exerciseId).name}</span>
                  <span className="muted small num">{describe(rx(item))}</span>
                </div>
              ))}
          </div>
        </div>
      ))}
      {match.swaps > 0 && <p className="muted small">Adapted to your equipment: {match.swaps} exercise{match.swaps > 1 ? 's' : ''} swapped.</p>}
    </>
  );
}

