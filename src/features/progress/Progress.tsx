import { lazy, Suspense, useState } from 'react';
import { findExercise } from '../../data/exercises';
import { db } from '../../lib/db';
import type { Profile, Session } from '../../lib/schema';
import { formatDuration, showWeight, useSettings, weightUnit } from '../../lib/settings';
import { WeightCard } from '../body/Weight';
import { muscleSets, records, sessionsInWeek, weeklyCounts } from '../../lib/stats';
import { shortDate } from '../../lib/text';

const RunsCard = lazy(() => import('../running/Running').then((m) => ({ default: m.RunsCard })));
import { Icon, Sheet } from '../../ui/kit';

export function Progress({ profile, sessions, target }: { profile: Profile; sessions: Session[]; target: number }) {
  const { modules, units } = useSettings();
  const runs = modules.running && (
    <Suspense fallback={null}>
      <RunsCard profile={profile} />
    </Suspense>
  );
  const [open, setOpen] = useState<Session | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const weeks = weeklyCounts(sessions);
  const max = Math.max(target, ...weeks.map((w) => w.count), 1);
  const muscles = muscleSets(sessionsInWeek(sessions));
  const maxSets = Math.max(...muscles.map((m) => m.sets), 1);
  const best = records(sessions);

  if (sessions.length === 0) {
    return (
      <div className="screen">
        <h1 className="h1">Progress</h1>
        {modules.body && <WeightCard />}
        {runs}
        <div className="card stack center" style={{ padding: 28 }}>
          <div style={{ color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
            <Icon name="chart" size={44} />
          </div>
          <b>Your progress will appear here</b>
          <p className="muted small">After your first workout you will see your weekly sessions, the work each muscle group gets, your personal bests and your full history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1 className="h1">Progress</h1>

      <div className="masonry">
        {modules.body && <WeightCard />}
        {runs}

        <div className="card stack">
          <div className="row between">
            <b>Sessions per week</b>
            <span className="muted small">target {target}</span>
          </div>
          <div className="bars" role="img" aria-label={`Sessions per week for the last ${weeks.length} weeks`}>
            {weeks.map((w, i) => (
              <div key={i}>
                <span className="num">{w.count || ''}</span>
                <i className={w.count ? '' : 'empty'} style={{ height: Math.round((w.count / max) * 76), opacity: w.count >= target ? 1 : 0.55 }} />
                <span>{w.label}</span>
              </div>
            ))}
          </div>
        </div>

        {muscles.length > 0 && (
          <div className="card stack">
            <div>
              <b>Sets this week by muscle</b>
              <p className="muted small">Main muscles count as one set, helpers as half.</p>
            </div>
            {muscles.map((m) => (
              <div className="hbar" key={m.muscle}>
                <span style={{ textTransform: 'capitalize' }}>{m.muscle}</span>
                <span className="trk">
                  <i style={{ width: `${(m.sets / maxSets) * 100}%` }} />
                </span>
                <span className="num muted">{m.sets % 1 ? m.sets.toFixed(1) : m.sets}</span>
              </div>
            ))}
          </div>
        )}

        {best.length > 0 && (
          <section className="stack">
            <div className="section-title">
              <h2 className="h2">Personal bests</h2>
            </div>
            <div className="card list">
              {best.slice(0, 12).map((r) => {
                const ex = findExercise(r.exerciseId);
                const label = ex?.logType === 'weight_reps' ? r.label.replace(/^([\d.]+) kg/, (_, kg) => `${showWeight(Number(kg), units)} ${weightUnit(units)}`) : r.label;
                return (
                  <div key={r.exerciseId}>
                    <span style={{ color: 'var(--accent)' }}>
                      <Icon name="trophy" size={18} />
                    </span>
                    <span className="grow">
                      {r.name}
                      <span className="muted small" style={{ display: 'block' }}>
                        {shortDate(r.date)}
                      </span>
                    </span>
                    <b className="num">{label}</b>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="stack">
          <div className="section-title">
            <h2 className="h2">History</h2>
            <span className="muted small">
              {sessions.length} session{sessions.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="card list">
            {sorted.slice(0, 50).map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setConfirmDelete(false);
                  setOpen(s);
                }}
              >
                <span className="grow">
                  <b>{s.dayName}</b>
                  <span className="muted small" style={{ display: 'block' }}>
                    {shortDate(s.date)} · {formatDuration(s.durationSeconds)} · {s.entries.reduce((n, e) => n + e.sets.length, 0)} sets
                  </span>
                </span>
                <Icon name="right" size={18} />
              </button>
            ))}
          </div>
        </section>
      </div>

      {open && (
        <Sheet title={open.dayName} onClose={() => setOpen(null)}>
          <p className="muted small">
            {shortDate(open.date)} · {formatDuration(open.durationSeconds)}
            {open.effort ? ` · effort ${open.effort}/10` : ''}
          </p>
          {open.note && <p className="note">{open.note}</p>}
          <div className="list">
            {open.entries.map((e, i) => {
              const ex = findExercise(e.exerciseId);
              const text = e.sets
                .map((s) =>
                  ex?.logType === 'weight_reps'
                    ? `${s.kg != null ? `${showWeight(s.kg, units)} ${weightUnit(units)} × ` : ''}${s.reps ?? 0}`
                    : s.reps != null
                      ? `${s.reps}`
                      : formatDuration(s.seconds ?? 0),
                )
                .join('  ·  ');
              return (
                <div key={i} style={{ display: 'grid', gap: 2 }}>
                  <b>{ex?.name ?? e.exerciseId}</b>
                  <span className="muted small num">{text}</span>
                </div>
              );
            })}
          </div>
          {confirmDelete ? (
            <button
              className="btn danger block"
              onClick={async () => {
                await db.sessions.delete(open.id);
                setOpen(null);
              }}
            >
              Confirm: delete this session
            </button>
          ) : (
            <button className="btn ghost danger block" onClick={() => setConfirmDelete(true)}>
              <Icon name="trash" size={16} /> Delete session
            </button>
          )}
        </Sheet>
      )}
    </div>
  );
}
