import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { dayKey } from '../../lib/body';
import {
  allFasts,
  checkFast,
  clock,
  confirmPlanned,
  defaultFasting,
  deleteFast,
  duration,
  endFast,
  FASTING_CAUTION,
  fastingBlocked,
  fastingNow,
  fastingWeek,
  fastForDay,
  getFastingSettings,
  hm,
  hours,
  lastFast,
  ON_TARGET_SLACK,
  plannedFast,
  plusDays,
  PRESETS,
  saveFast,
  saveFastingSettings,
  startFast,
  windowHours,
  type FastingNow,
  type FastingSettings,
} from '../../lib/fasting';
import type { Fast, Profile } from '../../lib/schema';
import { shortDate } from '../../lib/text';
import { Icon, Ring, Sheet } from '../../ui/kit';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Re-renders every `ms`; the timer itself always reads the clock, so a locked phone stays right. */
function useNow(ms = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    const onVisible = () => document.visibilityState === 'visible' && setNow(new Date());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ms]);
  return now;
}

function useFasting() {
  return useLiveQuery(async () => ({ fasts: await allFasts(), s: await getFastingSettings() }), [], { fasts: [] as Fast[], s: defaultFasting() });
}

/** "yesterday", "Mon 9" or nothing for today. */
function dayHint(d: Date, now: Date): string {
  if (dayKey(d) === dayKey(now)) return '';
  if (dayKey(d) === dayKey(plusDays(now, -1))) return ' yesterday';
  return ` ${SHORT[(d.getDay() + 6) % 7]} ${d.getDate()}`;
}

function describeNow(f: FastingNow, now: Date): { eyebrow: string; big: string; label: string; frac: number; meta: [string, string][] } {
  if (f.kind === 'fasting') {
    const done = f.elapsed >= f.total;
    return {
      eyebrow: 'Fasting',
      big: clock(f.elapsed),
      label: done ? `goal reached, +${hours(f.elapsed - f.total)}` : `${hours(f.total - f.elapsed)} to go`,
      frac: f.elapsed / f.total,
      meta: [
        ['Started', hm(f.start) + dayHint(f.start, now)],
        ['Goal', hours(f.total)],
        ['Window opens', hm(f.target)],
      ],
    };
  }
  if (f.kind === 'eating') {
    return {
      eyebrow: 'Eating window open',
      big: clock(f.left),
      label: `until it closes at ${hm(f.close)}`,
      frac: Math.max(0, now.getTime() - f.open.getTime()) / (f.close.getTime() - f.open.getTime()),
      meta: [
        ['Opened', hm(f.open)],
        ['Closes', hm(f.close)],
        ['Last fast', f.last ? hours(duration(f.last)) : '-'],
      ],
    };
  }
  return {
    eyebrow: 'Window closed',
    big: clock(f.elapsed),
    label: `since ${hm(f.since)}, opens at ${hm(f.next)}`,
    frac: f.elapsed / (f.next.getTime() - f.since.getTime()),
    meta: [
      ['Closed', hm(f.since) + dayHint(f.since, now)],
      ['Opens', hm(f.next)],
      ['Planned', hours(f.next.getTime() - f.since.getTime())],
    ],
  };
}

/** The buttons that fit the moment: start now, start from the planned close, or end. */
function Actions({ f, onEdit, small }: { f: FastingNow; onEdit?: (fast: Fast) => void; small?: boolean }) {
  const size = small ? 'sm' : '';
  if (f.kind === 'fasting')
    return (
      <>
        {onEdit && (
          <button className={`btn ${size}`} onClick={() => onEdit(f.fast)}>
            Edit
          </button>
        )}
        <button className={`btn primary ${size} grow`} onClick={() => void endFast()}>
          End fast
        </button>
      </>
    );
  if (f.kind === 'eating')
    return (
      <button className={`btn primary ${size} grow`} onClick={() => void startFast()}>
        Start fast
      </button>
    );
  return (
    <>
      <button className={`btn ${size}`} onClick={() => void startFast()}>
        From now
      </button>
      <button className={`btn primary ${size} grow`} onClick={() => void startFast(f.since)}>
        Since {hm(f.since)}
      </button>
    </>
  );
}

/** One tap rating for the fast that just ended. */
function FeelPrompt({ fasts, now }: { fasts: Fast[]; now: Date }) {
  const last = lastFast(fasts);
  if (!last || last.feel || fasts.some((f) => !f.end) || now.getTime() - new Date(last.end!).getTime() > 12 * 3600_000) return null;
  return (
    <div className="card stack">
      <span className="small">How was this {hours(duration(last))} fast?</span>
      <div className="chips" role="group" aria-label="Rate the fast">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} className="chip" style={{ minWidth: 44, justifyContent: 'center' }} onClick={() => void saveFast({ ...last, feel: n })} aria-label={`${n} out of 5`}>
            {n}
          </button>
        ))}
      </div>
      <div className="row between muted small">
        <span>Very hard</span>
        <span>Easy</span>
      </div>
    </div>
  );
}

/** Today card: the timer and the one button that matters right now. */
export function FastingCard({ onOpen }: { onOpen: () => void }) {
  const { fasts, s } = useFasting();
  const now = useNow();
  const f = fastingNow(fasts, s, now);
  const d = describeNow(f, now);
  return (
    <div className="card stack">
      <div className="row">
        <Ring value={d.frac} size={68}>
          <span className="num" style={{ fontSize: 14 }}>
            {d.big}
          </span>
        </Ring>
        <div className="grow">
          <b>{d.eyebrow}</b>
          <p className="muted small">{d.label}</p>
        </div>
        <button className="icon-btn" onClick={onOpen} aria-label="Open fasting">
          <Icon name="right" size={18} />
        </button>
      </div>
      <div className="row">
        <Actions f={f} small />
      </div>
      <FeelPrompt fasts={fasts} now={now} />
    </div>
  );
}

/** Planned (track) and actual (accent) fasting hours for each day of the week. */
function WeekChart({ fasts, s, now }: { fasts: Fast[]; s: FastingSettings; now: Date }) {
  const w = fastingWeek(fasts, s, now);
  const max = Math.max(16 * 3600_000, ...w.days.map((d) => Math.max(d.planned, d.actual)));
  const H = 96;
  return (
    <div className="card stack">
      <b>This week</b>
      <div className="bars" style={{ height: H + 40 }} role="img" aria-label={`Fasts this week: ${w.logged} logged, ${w.onTarget} on target`}>
        {w.days.map((d, i) => (
          <div key={d.key} style={{ position: 'relative' }}>
            <span className="num">{d.actual ? Math.round(d.actual / 3600_000) : ''}</span>
            <span style={{ position: 'relative', width: '100%', maxWidth: 28, height: (d.planned / max) * H, display: 'block' }}>
              <i className="empty" style={{ position: 'absolute', inset: 0, height: '100%', maxWidth: 'none' }} />
              {d.actual > 0 && <i style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: (d.actual / max) * H, maxWidth: 'none', opacity: d.onTarget ? 1 : 0.55 }} />}
            </span>
            <span style={{ color: dayKey(now) === d.key ? 'var(--accent)' : undefined, fontWeight: dayKey(now) === d.key ? 700 : undefined }}>{SHORT[i]}</span>
          </div>
        ))}
      </div>
      <div className="tiles">
        <div className="tile">
          <b className="num">
            {w.logged}/{w.past}
          </b>
          <span>Fasts logged</span>
        </div>
        <div className="tile">
          <b className="num">{w.average ? hours(w.average) : '-'}</b>
          <span>Average</span>
        </div>
        <div className="tile">
          <b className="num">{w.onTarget}</b>
          <span>On target</span>
        </div>
      </div>
    </div>
  );
}

const toLocalInput = (d: Date) => `${dayKey(d)}T${hm(d)}`;

function FastSheet({ fast, fasts, onClose }: { fast: Fast; fasts: Fast[]; onClose: () => void }) {
  const isNew = !fasts.some((f) => f.id === fast.id);
  const [start, setStart] = useState(toLocalInput(new Date(fast.start)));
  const [end, setEnd] = useState(fast.end ? toLocalInput(new Date(fast.end)) : '');
  const [feel, setFeel] = useState(fast.feel);
  const [note, setNote] = useState(fast.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    const next: Fast = { id: fast.id, start: new Date(start).toISOString(), end: end ? new Date(end).toISOString() : undefined, feel, note: note.trim() || undefined };
    const problem = Number.isNaN(new Date(start).getTime()) ? 'The start time is not valid.' : checkFast(next, fasts, fast.id);
    if (problem) return setError(problem);
    await saveFast(next);
    onClose();
  }

  return (
    <Sheet title={isNew ? 'Log a fast' : 'Edit fast'} onClose={onClose}>
      <label className="field">
        <span>Start (last meal)</span>
        <input className="input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
      </label>
      <label className="field">
        <span>End (first meal). Empty while it is still running</span>
        <input className="input" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
      </label>
      <div className="field">
        <span>How did it feel? (1 very hard, 5 easy)</span>
        <div className="chips">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} className={`chip ${feel === n ? 'on' : ''}`} style={{ minWidth: 44, justifyContent: 'center' }} onClick={() => setFeel(feel === n ? undefined : n)} aria-pressed={feel === n}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>Note (optional)</span>
        <input className="input" value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder="Hunger, energy, sleep" />
      </label>
      {error && <p className="note warn">{error}</p>}
      <button className="btn primary big block" onClick={() => void save()}>
        Save
      </button>
      {!isNew &&
        (confirmDelete ? (
          <button
            className="btn danger block"
            onClick={async () => {
              await deleteFast(fast.id);
              onClose();
            }}
          >
            Confirm: delete this fast
          </button>
        ) : (
          <button className="btn ghost danger block" onClick={() => setConfirmDelete(true)}>
            <Icon name="trash" size={16} /> Delete
          </button>
        ))}
    </Sheet>
  );
}

/** The last ten days: logged fasts, and planned ones to confirm in one tap. */
function Log({ fasts, s, now, onEdit }: { fasts: Fast[]; s: FastingSettings; now: Date; onEdit: (f: Fast) => void }) {
  const rows = [];
  for (let i = 0; i < 10; i++) {
    const date = plusDays(now, -i);
    const key = dayKey(date);
    const f = fastForDay(fasts, key);
    const p = plannedFast(date, s);
    const planned = p.end.getTime() - p.start.getTime();
    if (!f && p.end > now) continue;
    if (f) {
      const short = duration(f) < planned - ON_TARGET_SLACK;
      rows.push(
        <button key={key} onClick={() => onEdit(f)}>
          <span className="grow">
            <b>
              {hours(duration(f))}
              {short && <span className="muted small"> · shorter than planned</span>}
            </b>
            <span className="muted small" style={{ display: 'block' }}>
              {shortDate(f.end!)} · {hm(new Date(f.start))} to {hm(new Date(f.end!))}
              {f.feel ? ` · felt ${f.feel}/5` : ''}
            </span>
            {f.note && (
              <span className="small" style={{ display: 'block' }}>
                {f.note}
              </span>
            )}
          </span>
          <Icon name="right" size={16} />
        </button>,
      );
    } else {
      rows.push(
        <div key={key}>
          <span className="grow">
            <span className="muted">Not logged</span>
            <span className="muted small" style={{ display: 'block' }}>
              {shortDate(p.end.toISOString())} · planned {hm(p.start)} to {hm(p.end)}, {hours(planned)}
            </span>
          </span>
          <button className="btn sm" onClick={() => onEdit({ id: `fast_${p.end.getTime()}`, start: p.start.toISOString(), end: p.end.toISOString() })}>
            Adjust
          </button>
          <button className="btn sm primary" onClick={() => void confirmPlanned(date, s)}>
            Done
          </button>
        </div>,
      );
    }
  }
  return (
    <>
      <div className="section-title">
        <h2 className="h2">Log</h2>
      </div>
      <div className="card list">{rows.length ? rows : <p className="muted small">Your first fast will appear here.</p>}</div>
    </>
  );
}

/** Eating window per weekday, with presets that set every day at once. */
function Schedule({ s }: { s: FastingSettings }) {
  const save = (schedule: FastingSettings['schedule']) => void saveFastingSettings({ ...s, schedule });
  const same = s.schedule.every((w) => w.open === s.schedule[0].open && w.close === s.schedule[0].close);
  const shortest = Math.min(...s.schedule.map(windowHours));
  return (
    <>
      <div className="section-title">
        <h2 className="h2">Eating window</h2>
      </div>
      <div className="card stack">
        <div className="chips">
          {PRESETS.map((p) => {
            const on = same && s.schedule[0].open === p.window.open && s.schedule[0].close === p.window.close;
            return (
              <button key={p.id} className={`chip ${on ? 'on' : ''}`} onClick={() => save(Array.from({ length: 7 }, () => ({ ...p.window })))} aria-pressed={on}>
                {p.label}
              </button>
            );
          })}
        </div>
        <p className="muted small">{PRESETS.find((p) => same && s.schedule[0].open === p.window.open && s.schedule[0].close === p.window.close)?.hint ?? 'Custom times. The fast runs from the close of one day to the opening of the next.'}</p>
        <div className="list">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <div key={d} style={{ gap: 8 }}>
              <span className="grow small">{DAY_NAMES[d]}</span>
              <input className="input" style={{ width: 104 }} type="time" value={s.schedule[d].open} aria-label={`${DAY_NAMES[d]} window opens`} onChange={(e) => e.target.value && save(s.schedule.map((w, i) => (i === d ? { ...w, open: e.target.value } : w)))} />
              <span className="muted small">to</span>
              <input className="input" style={{ width: 104 }} type="time" value={s.schedule[d].close} aria-label={`${DAY_NAMES[d]} window closes`} onChange={(e) => e.target.value && save(s.schedule.map((w, i) => (i === d ? { ...w, close: e.target.value } : w)))} />
            </div>
          ))}
        </div>
        {shortest < 8 && <p className="note warn">A window under 8 hours makes it hard to fit 3 to 4 protein-rich meals, and brings no extra benefit for fat loss or muscle with the same food.</p>}
      </div>
    </>
  );
}

export function FastingScreen({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const { fasts, s } = useFasting();
  const now = useNow(15_000);
  const [editing, setEditing] = useState<Fast | null>(null);
  const blocked = fastingBlocked(profile);
  const f = fastingNow(fasts, s, now);
  const d = describeNow(f, now);

  return (
    <div className="overlay">
      <div className="overlay-inner" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
        <div className="topbar">
          <button className="icon-btn" onClick={onClose} aria-label="Close fasting">
            <Icon name="left" size={18} />
          </button>
          <h1 className="h2 grow">Fasting</h1>
        </div>

        {blocked ? (
          <p className="note warn">{blocked}</p>
        ) : (
          <>
            <div className="hero center stack">
              <span className="chip" style={{ justifySelf: 'center' }}>
                {d.eyebrow}
              </span>
              <div style={{ display: 'grid', placeItems: 'center' }}>
                <Ring value={d.frac} size={200} stroke={12}>
                  <span style={{ display: 'grid', gap: 6, justifyItems: 'center', maxWidth: 150, textAlign: 'center' }}>
                    <span className="num" style={{ fontSize: 44, fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1 }}>
                      {d.big}
                    </span>
                    <span className="small" style={{ fontWeight: 500, opacity: 0.8 }}>
                      {d.label}
                    </span>
                  </span>
                </Ring>
              </div>
              <div className="tiles">
                {d.meta.map(([k, v]) => (
                  <div className="tile" key={k}>
                    <b className="num" style={{ fontSize: 17 }}>
                      {v}
                    </b>
                    <span>{k}</span>
                  </div>
                ))}
              </div>
              <div className="row">
                <Actions f={f} onEdit={setEditing} />
              </div>
            </div>

            <FeelPrompt fasts={fasts} now={now} />
            <WeekChart fasts={fasts} s={s} now={now} />
            <Log fasts={fasts} s={s} now={now} onEdit={setEditing} />
            <button className="btn block" onClick={() => setEditing({ id: `fast_${Date.now()}`, start: plannedFast(now, s).start.toISOString(), end: plannedFast(now, s).end.toISOString() })}>
              <Icon name="plus" size={16} /> Log a past fast
            </button>
            <Schedule s={s} />

            <div className="card stack">
              <b>Good to know</b>
              <p className="small">During the fast: water, sparkling water, black coffee and unsweetened tea. Milk, juice and sweets end it.</p>
              <p className="small">With the same food, a shorter eating window gives no extra fat loss: it is a way to organise your meals, not a tool on its own. With strength training and enough protein, muscle is kept.</p>
              <p className="muted small">{FASTING_CAUTION}</p>
            </div>
          </>
        )}
      </div>
      {editing && <FastSheet fast={editing} fasts={fasts} onClose={() => setEditing(null)} />}
    </div>
  );
}
