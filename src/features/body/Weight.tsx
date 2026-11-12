import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { dayKey, deleteWeight, logWeight, series, trend } from '../../lib/body';
import { db } from '../../lib/db';
import type { BodyEntry } from '../../lib/schema';
import { showBodyWeight, toKg, useSettings, weightUnit } from '../../lib/settings';
import { shortDate } from '../../lib/text';
import { Icon, NumInput, Sheet } from '../../ui/kit';

export const useWeights = () => useLiveQuery(() => db.body.orderBy('date').toArray(), [], [] as BodyEntry[]);

function rateText(rate: number | undefined): string {
  if (rate == null) return 'Weigh in at least 3 times a week for 2 weeks to see your trend.';
  if (Math.abs(rate) < 0.1) return 'Stable over the last week.';
  return `${rate > 0 ? 'Up' : 'Down'} ${Math.abs(rate).toFixed(2)} % of body weight per week.`;
}

/** Daily weigh-ins as dots and the 7-day average as a line. */
function Chart({ entries }: { entries: BodyEntry[] }) {
  // From the first weigh-in (at least two weeks), up to eight weeks.
  const first = entries[0]?.date;
  const span = first ? Math.round((Date.now() - new Date(`${first}T12:00:00`).getTime()) / 86400000) + 1 : 14;
  const points = series(entries, Math.min(56, Math.max(14, span)));
  const values = points.flatMap((p) => [p.kg, p.avg]).filter((v): v is number => v != null);
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(0.5, (max - min) * 0.15);
  const lo = min - pad;
  const hi = max + pad;
  // Wide enough that the chart keeps its proportions from a phone to a desktop column.
  const W = 480;
  const H = 150;
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  const line = points
    .map((p, i) => (p.avg != null ? `${x(i).toFixed(1)},${y(p.avg).toFixed(1)}` : null))
    .filter(Boolean)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Body weight over the last 8 weeks" style={{ overflow: 'visible', height: 'auto', display: 'block' }}>
      {points.map((p, i) => (p.kg != null ? <circle key={p.date} cx={x(i)} cy={y(p.kg)} r={2.6} fill="var(--text-muted)" opacity={0.6} /> : null))}
      {line && <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
    </svg>
  );
}

export function WeightSheet({ onClose }: { onClose: () => void }) {
  const { units } = useSettings();
  const entries = useWeights();
  const today = dayKey();
  const latest = entries[entries.length - 1];
  const [date, setDate] = useState(today);
  const [value, setValue] = useState<number | undefined>(latest ? showBodyWeight(latest.kg, units) : undefined);
  return (
    <Sheet title="Log your weight" onClose={onClose}>
      <p className="muted small">Weigh yourself in the morning, after the toilet and before eating, a few times a week. Single days move with water and food; the 7-day average shows the real trend.</p>
      <div className="row">
        <label className="field grow">
          <span>Weight ({weightUnit(units)})</span>
          <NumInput value={value} onChange={setValue} label="Weight" step={0.1} />
        </label>
        <label className="field grow">
          <span>Date</span>
          <input className="input" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} />
        </label>
      </div>
      <button
        className="btn primary big block"
        disabled={!value || value < 20}
        onClick={async () => {
          if (!value) return;
          await logWeight(toKg(value, units), date);
          onClose();
        }}
      >
        Save
      </button>
    </Sheet>
  );
}

/** Body weight on the Progress tab. */
export function WeightCard() {
  const { units } = useSettings();
  const entries = useWeights();
  const [logging, setLogging] = useState(false);
  const [history, setHistory] = useState(false);
  const t = trend(entries);
  const fmt = (kg: number) => `${showBodyWeight(kg, units)} ${weightUnit(units)}`;
  return (
    <div className="card stack">
      <div className="row between">
        <b>Body weight</b>
        <button className="btn sm" onClick={() => setLogging(true)}>
          <Icon name="plus" size={14} /> Log
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="muted small">No weigh-ins yet. Log your weight a few mornings a week to see your trend.</p>
      ) : (
        <>
          <div className="tiles">
            <div className="tile">
              <b className="num">{t.latest ? showBodyWeight(t.latest.kg, units) : '-'}</b>
              <span>Latest</span>
            </div>
            <div className="tile">
              <b className="num">{t.average != null ? showBodyWeight(t.average, units) : '-'}</b>
              <span>7-day average</span>
            </div>
            <div className="tile">
              <b className="num">{t.weeklyRatePct != null ? `${t.weeklyRatePct > 0 ? '+' : ''}${t.weeklyRatePct.toFixed(1)}%` : '-'}</b>
              <span>Per week</span>
            </div>
          </div>
          <Chart entries={entries} />
          <p className="muted small">{rateText(t.weeklyRatePct)}</p>
          <button className="link" style={{ justifySelf: 'start' }} onClick={() => setHistory(!history)}>
            {history ? 'Hide weigh-ins' : 'Show weigh-ins'}
          </button>
          {history && (
            <div className="list">
              {[...entries]
                .reverse()
                .slice(0, 30)
                .map((e) => (
                  <div key={e.date}>
                    <span className="grow small">{shortDate(`${e.date}T12:00:00`)}</span>
                    <b className="num small">{fmt(e.kg)}</b>
                    <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => void deleteWeight(e.date)} aria-label={`Delete weigh-in of ${e.date}`}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
      {logging && <WeightSheet onClose={() => setLogging(false)} />}
    </div>
  );
}

/** A quick weigh-in on the Today tab, shown until today's weight is logged. */
export function QuickWeigh() {
  const { units } = useSettings();
  const entries = useWeights();
  const [value, setValue] = useState<number | undefined>();
  const today = dayKey();
  const latest = entries[entries.length - 1];
  const t = trend(entries);
  if (latest?.date === today) {
    return (
      <div className="card row">
        <Icon name="scale" />
        <span className="grow small">
          Today {showBodyWeight(latest.kg, units)} {weightUnit(units)}
          {t.average != null ? ` · 7-day average ${showBodyWeight(t.average, units)}` : ''}
        </span>
      </div>
    );
  }
  return (
    <div className="card stack">
      <div className="row">
        <Icon name="scale" />
        <b className="grow">Morning weigh-in</b>
      </div>
      <div className="row">
        <div className="grow">
          <NumInput value={value} onChange={setValue} label={`Today's weight in ${weightUnit(units)}`} placeholder={latest ? String(showBodyWeight(latest.kg, units)) : weightUnit(units)} step={0.1} />
        </div>
        <button className="btn primary" disabled={!value || value < 20} onClick={() => value && void logWeight(toKg(value, units))}>
          Save
        </button>
      </div>
    </div>
  );
}
