import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import {
  allRuns,
  bigJump,
  deleteRun,
  equivalents,
  getRunningSettings,
  hms,
  hrZones,
  isDuplicate,
  KIND_LABEL,
  longestRecent,
  maxHrOf,
  parseGpx,
  saveRun,
  saveRunningSettings,
  trainingPaces,
  weeklyRuns,
  type RunningSettings,
} from '../../lib/running';
import { RUN_KINDS, type Profile, type Run } from '../../lib/schema';
import { distanceUnit, showDistance, showPace, toMeters, useSettings, type Settings } from '../../lib/settings';
import { shortDate } from '../../lib/text';
import { Icon, NumInput, Sheet } from '../../ui/kit';

export const useRuns = () => useLiveQuery(allRuns, [], [] as Run[]);
const useRunningSettings = () => useLiveQuery(getRunningSettings, [], {} as RunningSettings);

const KM = 1000;

/** Pace per km or mile for a seconds-per-km value. */
function paceText(secPerKm: number, units: Settings['units']): string {
  return showPace(secPerKm, KM, units);
}

/** "8.4 km" in the person's units. */
const dist = (m: number, units: Settings['units']) => `${showDistance(m, units)} ${distanceUnit(units)}`;

/** Reads "25:30", "1:05:00" or plain minutes ("42") into seconds. */
export function parseTime(text: string): number | undefined {
  const t = text.trim();
  if (!t) return undefined;
  const parts = t.split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return undefined;
  const s = parts.length === 1 ? parts[0] * 60 : parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];
  return s > 0 ? s : undefined;
}

const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** The single-run rule, worded for people. */
function JumpWarning({ run, runs }: { run: Pick<Run, 'date' | 'meters' | 'seconds'>; runs: Run[] }) {
  const { units } = useSettings();
  const others = runs.filter((r) => r.date !== run.date);
  if (!bigJump(run, others)) return null;
  const l = longestRecent(others, new Date(run.date))!;
  const longest = run.meters && l.meters ? dist(l.meters, units) : hms(l.seconds);
  return <p className="note warn">This run is more than 10 % longer than your longest of the last 30 days ({longest}). Runs that jump like that were linked to more overuse injuries; build up in smaller steps.</p>;
}

export function RunSheet({ run, onClose }: { run?: Run; onClose: () => void }) {
  const { units } = useSettings();
  const runs = useRuns();
  const [date, setDate] = useState(toLocalInput(run ? new Date(run.date) : new Date()));
  const [distance, setDistance] = useState<number | undefined>(run?.meters ? showDistance(run.meters, units) : undefined);
  const [time, setTime] = useState(run ? hms(run.seconds) : '');
  const [kind, setKind] = useState<Run['kind']>(run?.kind ?? 'easy');
  const [hr, setHr] = useState<number | undefined>(run?.avgHr);
  const [note, setNote] = useState(run?.note ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const seconds = parseTime(time);
  const meters = distance ? toMeters(distance, units) : undefined;
  const iso = Number.isNaN(new Date(date).getTime()) ? new Date().toISOString() : new Date(date).toISOString();
  const draft = seconds ? { date: iso, meters, seconds } : null;

  return (
    <Sheet title={run ? 'Edit run' : 'Log a run'} onClose={onClose}>
      <div className="row">
        <label className="field grow">
          <span>Distance ({distanceUnit(units)})</span>
          <NumInput value={distance} onChange={setDistance} label="Distance" step={0.1} />
        </label>
        <label className="field grow">
          <span>Time (h:mm:ss)</span>
          <input className="input num" inputMode="numeric" value={time} onChange={(e) => setTime(e.target.value)} placeholder="32:10" aria-label="Time" />
        </label>
      </div>
      {seconds && meters ? <p className="muted small">Pace {showPace(seconds, meters, units)}</p> : null}
      <label className="field">
        <span>Start</span>
        <input className="input" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <div className="field">
        <span>Kind</span>
        <div className="chips">
          {RUN_KINDS.map((k) => (
            <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)} aria-pressed={kind === k}>
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>
      <div className="row">
        <label className="field grow">
          <span>Average heart rate (optional)</span>
          <NumInput value={hr} onChange={setHr} label="Average heart rate" />
        </label>
      </div>
      <label className="field">
        <span>Note (optional)</span>
        <input className="input" value={note} maxLength={280} onChange={(e) => setNote(e.target.value)} placeholder="Route, shoes, how it felt" />
      </label>
      {draft && <JumpWarning run={draft} runs={runs.filter((r) => r.id !== run?.id)} />}
      <button
        className="btn primary big block"
        disabled={!seconds}
        onClick={async () => {
          if (!seconds) return;
          await saveRun({ ...run, id: run?.id, date: iso, seconds, meters, kind, avgHr: hr && hr >= 30 && hr <= 250 ? hr : undefined, note: note.trim() || undefined, source: run?.source ?? 'manual' });
          onClose();
        }}
      >
        Save
      </button>
      {run &&
        (confirmDelete ? (
          <button
            className="btn danger block"
            onClick={async () => {
              await deleteRun(run.id);
              onClose();
            }}
          >
            Confirm: delete this run
          </button>
        ) : (
          <button className="btn ghost danger block" onClick={() => setConfirmDelete(true)}>
            <Icon name="trash" size={16} /> Delete run
          </button>
        ))}
    </Sheet>
  );
}

export function ZonesSheet({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const { units } = useSettings();
  const s = useRunningSettings();
  const [fiveK, setFiveK] = useState(s.fiveK ? hms(s.fiveK) : '');
  const max = maxHrOf(profile, s);
  const zones = max ? hrZones(max.bpm, s.restHr) : [];
  const save = (patch: Partial<RunningSettings>) => void saveRunningSettings({ ...s, ...patch });
  const t5 = parseTime(fiveK);
  const eq = t5 && t5 >= 11 * 60 && t5 <= 60 * 60 ? equivalents(t5) : null;
  const paces = eq ? trainingPaces(t5!) : null;

  return (
    <Sheet title="Zones and paces" onClose={onClose}>
      <p className="muted small">Easy running should feel conversational. Heart rate and pace are guides; on hot days and hills, go by feel.</p>
      <div className="row">
        <label className="field grow">
          <span>Maximum heart rate</span>
          <NumInput value={s.maxHr} onChange={(v) => save({ maxHr: v && v >= 120 && v <= 230 ? v : undefined })} label="Maximum heart rate" placeholder={max?.estimated ? String(max.bpm) : 'bpm'} />
        </label>
        <label className="field grow">
          <span>Resting heart rate</span>
          <NumInput value={s.restHr} onChange={(v) => save({ restHr: v && v >= 30 && v <= 110 ? v : undefined })} label="Resting heart rate" placeholder="optional" />
        </label>
      </div>
      {max ? (
        <>
          <p className="muted small">
            {max.estimated ? `Estimated from your age (208 - 0.7 x age); real values can differ by about 10 bpm. Enter a measured maximum if you know it.` : 'Using your measured maximum.'}
            {s.restHr ? ' Zones use your heart-rate reserve.' : ' Add your resting heart rate (measured on waking) for zones that fit you better.'}
          </p>
          <div className="list">
            {zones.map((z) => (
              <div key={z.zone} style={{ minHeight: 0, padding: '9px 0' }}>
                <span className="grow">
                  <b>
                    Zone {z.zone} · {z.name}
                  </b>
                  <span className="muted small" style={{ display: 'block' }}>
                    {z.feel}
                  </span>
                </span>
                <b className="num small">
                  {z.from}-{z.to}
                </b>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="note">Add your age in your profile, or a measured maximum heart rate, to see your zones.</p>
      )}

      <label className="field">
        <span>Recent 5 km time (mm:ss)</span>
        <input
          className="input num"
          inputMode="numeric"
          value={fiveK}
          placeholder="27:30"
          aria-label="Recent 5 km time"
          onChange={(e) => {
            setFiveK(e.target.value);
            const v = parseTime(e.target.value);
            if (!e.target.value.trim()) save({ fiveK: undefined });
            else if (v && v >= 11 * 60 && v <= 60 * 60) save({ fiveK: v });
          }}
        />
      </label>
      {eq && paces && (
        <>
          <div className="list">
            {eq.map((e) => (
              <div key={e.id} style={{ minHeight: 0, padding: '9px 0' }}>
                <span className="grow">
                  {e.label}
                  {e.optimistic && (
                    <span className="muted small" style={{ display: 'block' }}>
                      Likely optimistic without regular long runs
                    </span>
                  )}
                </span>
                <span className="muted small num">{paceText(e.pacePerKm, units)}</span>
                <b className="num small">{hms(e.seconds)}</b>
              </div>
            ))}
          </div>
          <p className="small">
            Intervals of 3 to 5 minutes: about {paceText(paces.intervals[0], units)} to {paceText(paces.intervals[1], units)}. Tempo: about {paceText(paces.tempo[0], units)} to {paceText(paces.tempo[1], units)}. Easy and long runs: by feel or zone 2, not by pace.
          </p>
          <p className="muted small">Race equivalents use Riegel's formula: a fair guide up to the half marathon, too fast for most people's marathon.</p>
        </>
      )}
    </Sheet>
  );
}

/** Runs on the Progress tab: week totals, the single-run limit, history, GPX import. */
export function RunsCard({ profile }: { profile: Profile }) {
  const { units } = useSettings();
  const runs = useRuns();
  const [sheet, setSheet] = useState<'log' | 'zones' | Run | null>(null);
  const [message, setMessage] = useState<{ text: string; bad?: boolean } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const weeks = weeklyRuns(runs, 8);
  const hasDistance = runs.some((r) => r.meters);
  const value = (w: (typeof weeks)[number]) => (hasDistance ? w.meters : w.seconds);
  const max = Math.max(1, ...weeks.map(value));
  const recent = weeks.slice(-5, -1);
  const avg = recent.reduce((n, w) => n + value(w), 0) / recent.length;
  const longest = longestRecent(runs, new Date(Date.now() + 1));
  const fmt = (v: number) => (hasDistance ? `${showDistance(v, units)}` : `${Math.round(v / 60)}`);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    let added = 0;
    const problems: string[] = [];
    const known = [...runs];
    for (const f of Array.from(files)) {
      try {
        const g = parseGpx(await f.text());
        // A run already saved from a session at the same time gets the GPS distance and heart rate.
        const start = new Date(g.date).getTime();
        const session = known.find((r) => r.source === 'session' && Math.abs(new Date(r.date).getTime() - start) < Math.max(r.seconds, g.seconds) * 1000 && !r.meters);
        if (session) {
          await saveRun({ ...session, date: g.date, seconds: g.seconds, meters: g.meters, avgHr: g.avgHr ?? session.avgHr });
          added++;
          continue;
        }
        if (isDuplicate(g.date, known)) {
          problems.push(`${f.name}: already logged`);
          continue;
        }
        const r = await saveRun({ date: g.date, seconds: g.seconds, meters: g.meters, avgHr: g.avgHr, note: g.name, source: 'gpx', kind: 'easy' });
        known.push(r);
        added++;
      } catch (e) {
        problems.push(`${f.name}: ${e instanceof Error ? e.message : 'could not be read'}`);
      }
    }
    setMessage({ text: [added ? `${added} run${added > 1 ? 's' : ''} imported.` : '', ...problems].filter(Boolean).join(' '), bad: !added });
    if (file.current) file.current.value = '';
  }

  return (
    <div className="card stack">
      <div className="row between">
        <b>Running</b>
        <button className="btn sm" onClick={() => setSheet('log')}>
          <Icon name="plus" size={14} /> Log
        </button>
      </div>
      {runs.length === 0 ? (
        <p className="muted small">No runs yet. Log one by hand, or import a GPX file exported from your watch or running app.</p>
      ) : (
        <>
          <div className="tiles">
            <div className="tile">
              <b className="num">{fmt(value(weeks[weeks.length - 1]))}</b>
              <span>This week ({hasDistance ? distanceUnit(units) : 'min'})</span>
            </div>
            <div className="tile">
              <b className="num">{fmt(avg)}</b>
              <span>4-week average</span>
            </div>
            <div className="tile">
              <b className="num">{longest ? (hasDistance && longest.meters ? showDistance(longest.meters, units) : Math.round(longest.seconds / 60)) : '-'}</b>
              <span>Longest, 30 days</span>
            </div>
          </div>
          <div className="bars" role="img" aria-label={`Running per week for the last ${weeks.length} weeks`}>
            {weeks.map((w, i) => (
              <div key={i}>
                <span className="num">{value(w) ? fmt(value(w)) : ''}</span>
                <i className={value(w) ? '' : 'empty'} style={{ height: Math.round((value(w) / max) * 76) }} />
                <span>{w.start.getDate()}/{w.start.getMonth() + 1}</span>
              </div>
            ))}
          </div>
          {longest && (
            <p className="muted small">
              Keep any single run under about {hasDistance && longest.meters ? dist(longest.capMeters, units) : `${Math.round(longest.capSeconds / 60)} min`}: 10 % above your longest of the last 30 days.
            </p>
          )}
          <div className="list">
            {[...runs]
              .reverse()
              .slice(0, showAll ? 60 : 6)
              .map((r) => (
                <button key={r.id} onClick={() => setSheet(r)}>
                  <span className="grow">
                    <b>{r.meters ? dist(r.meters, units) : hms(r.seconds)}</b>
                    <span className="muted small"> · {KIND_LABEL[r.kind]}</span>
                    <span className="muted small" style={{ display: 'block' }}>
                      {shortDate(r.date)} · {hms(r.seconds)}
                      {r.meters ? ` · ${showPace(r.seconds, r.meters, units)}` : ''}
                      {r.avgHr ? ` · ${r.avgHr} bpm` : ''}
                    </span>
                  </span>
                  <Icon name="right" size={16} />
                </button>
              ))}
          </div>
          {runs.length > 6 && (
            <button className="link" style={{ justifySelf: 'start' }} onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show fewer' : `Show all ${runs.length} runs`}
            </button>
          )}
        </>
      )}
      <div className="row">
        <button className="btn sm" onClick={() => file.current?.click()}>
          <Icon name="down" size={14} /> Import GPX
        </button>
        <button className="btn sm" onClick={() => setSheet('zones')}>
          <Icon name="heart" size={14} /> Zones and paces
        </button>
        <input ref={file} type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
      </div>
      {message && <p className={`note ${message.bad ? 'warn' : ''}`}>{message.text}</p>}
      {sheet === 'log' && <RunSheet onClose={() => setSheet(null)} />}
      {sheet === 'zones' && <ZonesSheet profile={profile} onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === 'object' && <RunSheet key={sheet.id} run={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}

/** Today card for runners: this week, the single-run limit and the easy heart-rate range. */
export function RunToday({ profile, runDay, onOpen }: { profile: Profile; runDay: boolean; onOpen: () => void }) {
  const { units } = useSettings();
  const runs = useRuns();
  const s = useRunningSettings();
  const [logging, setLogging] = useState(false);
  const week = weeklyRuns(runs, 1)[0];
  const longest = longestRecent(runs, new Date(Date.now() + 1));
  const max = maxHrOf(profile, s);
  const z2 = max ? hrZones(max.bpm, s.restHr)[1] : undefined;
  const lines = [
    runs.length ? `This week: ${week.meters ? dist(week.meters, units) : `${Math.round(week.seconds / 60)} min`} in ${week.count} run${week.count === 1 ? '' : 's'}.` : 'Log your runs to track your weekly volume.',
    runDay && longest ? `Keep today's run under about ${longest.meters ? dist(longest.capMeters, units) : `${Math.round(longest.capSeconds / 60)} min`}.` : '',
    runDay && z2 ? `Easy pace: about ${z2.from}-${z2.to} bpm, or still able to talk.` : '',
  ].filter(Boolean);
  return (
    <div className="card stack">
      <div className="row">
        <Icon name="run" />
        <b className="grow">Running</b>
        <button className="btn sm" onClick={() => setLogging(true)}>
          <Icon name="plus" size={14} /> Log run
        </button>
        <button className="icon-btn" onClick={onOpen} aria-label="Open running history">
          <Icon name="right" size={18} />
        </button>
      </div>
      {lines.map((l) => (
        <p key={l} className="muted small">
          {l}
        </p>
      ))}
      {logging && <RunSheet onClose={() => setLogging(false)} />}
    </div>
  );
}
