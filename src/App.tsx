import { useLiveQuery } from 'dexie-react-hooks';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { setCoachDraft } from './lib/coach/draft';
import { db, getActive, getState } from './lib/db';
import { useSettings } from './lib/settings';
import { Icon } from './ui/kit';
import { Today } from './features/today/Today';

// Only the first screen is in the main bundle; the rest load on demand.
const Onboarding = lazy(() => import('./features/onboarding/Onboarding').then((m) => ({ default: m.Onboarding })));
const ProgramTab = lazy(() => import('./features/program/ProgramTab').then((m) => ({ default: m.ProgramTab })));
const Progress = lazy(() => import('./features/progress/Progress').then((m) => ({ default: m.Progress })));
const Coach = lazy(() => import('./features/coach/Coach').then((m) => ({ default: m.Coach })));
const ProfileTab = lazy(() => import('./features/profile/ProfileTab').then((m) => ({ default: m.ProfileTab })));
const Nutrition = lazy(() => import('./features/nutrition/Nutrition').then((m) => ({ default: m.Nutrition })));
const Builder = lazy(() => import('./features/program/Builder').then((m) => ({ default: m.Builder })));
const Player = lazy(() => import('./features/player/Player').then((m) => ({ default: m.Player })));

type Tab = 'today' | 'program' | 'progress' | 'food' | 'coach' | 'profile';
type Overlay = 'player' | 'edit' | 'builder' | null;

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: 'home' },
  { id: 'program', label: 'Program', icon: 'list' },
  { id: 'progress', label: 'Progress', icon: 'chart' },
  { id: 'food', label: 'Food', icon: 'food' },
  { id: 'coach', label: 'Coach', icon: 'chat' },
  { id: 'profile', label: 'Profile', icon: 'user' },
];

/** Full-screen overlays push a history entry so the system back button closes them. */
function useOverlay(): [Overlay, (o: Exclude<Overlay, null>) => void, () => void] {
  const [overlay, setOverlay] = useState<Overlay>(null);
  useEffect(() => {
    const onPop = () => setOverlay(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const open = useCallback((o: Exclude<Overlay, null>) => {
    history.pushState({ overlay: o }, '');
    setOverlay(o);
  }, []);
  const close = useCallback(() => {
    if (history.state?.overlay) history.back();
    else setOverlay(null);
  }, []);
  return [overlay, open, close];
}

export default function App({ update }: { update?: { subscribe: (cb: () => void) => void; apply: () => void } }) {
  const data = useLiveQuery(async () => {
    const [profile, state, active, sessions] = await Promise.all([db.profile.get('me'), getState(), getActive(), db.sessions.toArray()]);
    const program = state ? await db.programs.get(state.programId) : undefined;
    return { profile: profile ?? null, state, active, sessions, program };
  }, []);
  const [tab, setTab] = useState<Tab>('today');
  const { modules } = useSettings();
  const [overlay, open, close] = useOverlay();
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => update?.subscribe(() => setUpdateReady(true)), [update]);
  useEffect(() => {
    // Braces matter: newer browsers return a promise from scrollTo, and an effect must not return one.
    window.scrollTo(0, 0);
  }, [tab]);

  if (!data) return null;
  const { profile, program, state, active, sessions } = data;
  if (!profile)
    return (
      <Suspense fallback={null}>
        <Onboarding onDone={() => setTab('today')} />
      </Suspense>
    );

  return (
    <div className="app">
      {updateReady && (
        <div className="screen" style={{ paddingBottom: 0 }}>
          <div className="card accent row">
            <span className="grow small">A new version of Banzir is ready.</span>
            <button className="btn sm primary" onClick={() => update?.apply()}>
              Update
            </button>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        {tab === 'today' && <Today profile={profile} program={program} state={state} sessions={sessions} active={active} openPlayer={() => open('player')} goTo={setTab} />}
        {tab === 'program' && <ProgramTab profile={profile} program={program} state={state} sessions={sessions} active={active} openPlayer={() => open('player')} openBuilder={() => open('builder')} />}
        {tab === 'progress' && <Progress sessions={sessions} target={program?.daysPerWeek ?? profile.daysPerWeek} />}
        {tab === 'coach' && <Coach />}
        {tab === 'food' && <Nutrition profile={profile} editProfile={() => open('edit')} />}
        {tab === 'profile' && <ProfileTab profile={profile} program={program} sessionCount={sessions.length} editProfile={() => open('edit')} />}

        {overlay === 'builder' && program && <Builder key={program.id} program={program} profile={profile} onClose={close} />}
        {overlay === 'player' && (
          <Player
            initial={active}
            program={program}
            profile={profile}
            sessions={sessions}
            onClose={close}
            onAskCoach={() => {
              setCoachDraft('Review the workout I just finished. What went well, and what should I change next time?');
              close();
              setTab('coach');
            }}
          />
        )}
      </Suspense>
      {overlay === 'edit' && (
        <Suspense fallback={null}>
          <Onboarding initial={profile} currentPlan={program?.name} onDone={close} onCancel={close} />
        </Suspense>
      )}

      <nav className="tabbar" aria-label="Main">
        {TABS.filter((t) => t.id !== 'food' || modules.nutrition).map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
            <Icon name={t.icon} size={22} />
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
