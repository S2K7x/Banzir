import { useEffect, useRef, useState } from 'react';
import { findExercise } from '../../data/exercises';
import { exportBackup, exportCsv, importBackup, wipeAll } from '../../lib/backup';
import { requestPersistence } from '../../lib/db';
import type { Profile, Program } from '../../lib/schema';
import { fastingBlocked, FASTING_CAUTION } from '../../lib/fastingSafety';
import { updateSettings, useSettings } from '../../lib/settings';
import { DISCLAIMER, EQUIPMENT_LABEL, GOAL_INFO, LEVEL_INFO, shortDate } from '../../lib/text';
import { Icon, Segmented, Sheet, Toggle } from '../../ui/kit';
import { InstallCard } from '../onboarding/Install';
import { ThemePicker } from './ThemePicker';

export function ProfileTab({ profile, program, sessionCount, editProfile }: { profile: Profile; program: Program | undefined; sessionCount: number; editProfile: () => void }) {
  const s = useSettings();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [message, setMessage] = useState<{ text: string; bad?: boolean } | null>(null);
  const [resetting, setResetting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null));
  }, []);

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      const res = await importBackup(await file.text());
      setMessage({ text: `Backup restored: ${res.sessions} sessions.` });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'Could not read this file.', bad: true });
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  const equipment = profile.equipment.length >= 12 ? 'Full gym' : profile.equipment.length ? profile.equipment.map((e) => EQUIPMENT_LABEL[e]).join(', ') : 'No equipment';

  return (
    <div className="screen">
      <h1 className="h1">Profile</h1>

      <div className="card stack">
        <div className="row between">
          <b>{profile.name || 'You'}</b>
          <button className="link" onClick={editProfile}>
            Edit
          </button>
        </div>
        <div className="chips">
          <span className="chip">{GOAL_INFO[profile.goal].label}</span>
          <span className="chip">{LEVEL_INFO[profile.level].label}</span>
          <span className="chip">
            {profile.daysPerWeek} × {profile.sessionMinutes} min
          </span>
        </div>
        <p className="muted small">{equipment}</p>
        {program && <p className="muted small">Current plan: {program.name}</p>}
      </div>

      <div className="section-title">
        <h2 className="h2">Appearance</h2>
      </div>
      <div className="card">
        <ThemePicker />
      </div>

      <div className="section-title">
        <h2 className="h2">Modules</h2>
      </div>
      <div className="card list">
        <Toggle label="Nutrition" hint="Food log, calorie and protein targets, water" value={s.modules.nutrition} onChange={(nutrition) => updateSettings({ modules: { ...s.modules, nutrition } })} />
        <Toggle label="Body weight" hint="Weigh-ins, 7-day trend, calorie corrections" value={s.modules.body} onChange={(body) => updateSettings({ modules: { ...s.modules, body } })} />
        <Toggle label="Running" hint="Run log, GPX import, heart-rate zones, race times" value={s.modules.running} onChange={(running) => updateSettings({ modules: { ...s.modules, running } })} />
        {fastingBlocked(profile) ? (
          <div>
            <span className="grow">
              <span style={{ display: 'block', fontWeight: 600 }}>Fasting</span>
              <span className="muted small">{fastingBlocked(profile)}</span>
            </span>
          </div>
        ) : (
          <Toggle label="Fasting" hint="Eating window, fasting timer and log" value={s.modules.fasting} onChange={(fasting) => updateSettings({ modules: { ...s.modules, fasting } })} />
        )}
      </div>
      {s.modules.fasting && !fastingBlocked(profile) && <p className="muted small">{FASTING_CAUTION}</p>}

      <div className="section-title">
        <h2 className="h2">Workout</h2>
      </div>
      <div className="card stack">
        <div className="field">
          <span>Units</span>
          <Segmented
            value={s.units}
            onChange={(units) => updateSettings({ units })}
            options={[
              { value: 'metric', label: 'kg · km' },
              { value: 'imperial', label: 'lb · mi' },
            ]}
          />
        </div>
        <div className="list">
          <Toggle label="Automatic rest timer" hint="Starts after each completed set" value={s.autoRest} onChange={(autoRest) => updateSettings({ autoRest })} />
          <Toggle label="Sounds" hint="Beeps for timers and intervals" value={s.sound} onChange={(sound) => updateSettings({ sound })} />
          <Toggle label="Keep screen on" hint="During a workout, where the browser allows it" value={s.keepAwake} onChange={(keepAwake) => updateSettings({ keepAwake })} />
        </div>
      </div>

      <div className="section-title">
        <h2 className="h2">Your data</h2>
      </div>
      <div className="card stack">
        <p className="muted small">
          Everything is stored on this device only. {sessionCount} session{sessionCount === 1 ? '' : 's'} logged.
          {s.lastBackup ? ` Last backup: ${shortDate(s.lastBackup)}.` : ' No backup yet.'}
        </p>
        <button className="btn block" onClick={() => exportBackup().catch(() => setMessage({ text: 'The backup could not be created.', bad: true }))}>
          <Icon name="down" size={18} /> Save a backup
        </button>
        <button className="btn block" onClick={() => fileRef.current?.click()}>
          <Icon name="up" size={18} /> Restore from a backup
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <button className="btn block" onClick={() => exportCsv((id) => findExercise(id)?.name ?? id)} disabled={sessionCount === 0}>
          Export sessions as CSV
        </button>
        {message && <p className={`note ${message.bad ? 'warn' : ''}`}>{message.text}</p>}
        <div className="row between">
          <span className="small">
            Storage protection: <b>{persisted == null ? 'unknown' : persisted ? 'on' : 'off'}</b>
          </span>
          {persisted === false && (
            <button className="link" onClick={async () => setPersisted(await requestPersistence())}>
              Turn on
            </button>
          )}
        </div>
        <button className="btn ghost danger block" onClick={() => setResetting(true)}>
          <Icon name="trash" size={16} /> Erase everything
        </button>
      </div>

      <div className="section-title">
        <h2 className="h2">Install</h2>
      </div>
      <InstallCard />

      <div className="section-title">
        <h2 className="h2">About</h2>
      </div>
      <div className="card stack">
        <p className="muted small">{DISCLAIMER}</p>
        <p className="muted small">Banzir {__APP_VERSION__} · open source, MIT licence.</p>
      </div>

      {resetting && (
        <Sheet title="Erase everything?" onClose={() => setResetting(false)}>
          <p className="muted small">This deletes your profile, plan and all {sessionCount} logged sessions from this device. It cannot be undone. Save a backup first if you might want them back.</p>
          <button
            className="btn danger block"
            onClick={async () => {
              await wipeAll();
              setResetting(false);
            }}
          >
            Erase all data
          </button>
          <button className="btn block" onClick={() => setResetting(false)}>
            Cancel
          </button>
        </Sheet>
      )}
    </div>
  );
}
