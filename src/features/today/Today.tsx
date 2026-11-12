import { useLiveQuery } from 'dexie-react-hooks';
import { lazy, Suspense, useState } from 'react';
import { COACH_CONFIG_KEY } from '../../lib/coach/draft';
import { getExercise, rx } from '../../data/exercises';
import { getKV, setState, type ActiveSession } from '../../lib/db';
import { estimateMinutes } from '../../lib/matcher';
import { lighten, position, type ProgramState } from '../../lib/programState';
import type { Profile, Program, Session } from '../../lib/schema';
import { useSettings } from '../../lib/settings';
import { sessionsInWeek, totalMinutes, weekStreak } from '../../lib/stats';
import { GOAL_INFO, describe, greeting, shortDate } from '../../lib/text';
import { flatItems, startWorkout, unlockAudio } from '../../lib/workout';
import { Icon, Ring } from '../../ui/kit';
import { isStandalone } from '../onboarding/Install';

// Module cards load only when the module is on.
const QuickWeigh = lazy(() => import('../body/Weight').then((m) => ({ default: m.QuickWeigh })));
const FoodToday = lazy(() => import('../nutrition/FoodToday').then((m) => ({ default: m.FoodToday })));


type Props = {
  profile: Profile;
  program: Program | undefined;
  state: ProgramState | undefined;
  sessions: Session[];
  active: ActiveSession | undefined;
  openPlayer: () => void;
  goTo: (tab: 'program' | 'profile' | 'coach' | 'food') => void;
};

const TIPS: Record<string, string> = {
  first: 'First session: go lighter than you think. Learn the movements and finish feeling you could do more.',
  muscle: 'Growth comes from sets taken close to failure. Leave 1 to 3 reps in the tank on big lifts.',
  strength: 'Rest 2 to 3 minutes between heavy sets. Quality reps matter more than fatigue.',
  calisthenics: 'Stop holds a second or two before your form breaks. Tendons adapt more slowly than muscles.',
  running: 'Easy means easy: you should be able to talk in full sentences.',
  fat_loss: 'Lifting keeps your muscle while you lose fat. Daily steps do the rest.',
  general_fitness: 'Showing up every week matters more than any single session.',
  sport: 'Do jumps and sprints fresh, with full recovery. Tired power work is just conditioning.',
};

export function Today({ profile, program, state, sessions, active, openPlayer, goTo }: Props) {
  const coachReady = useLiveQuery(async () => {
    const c = await getKV<{ apiKey?: string; model?: string; provider?: string }>(COACH_CONFIG_KEY);
    return !!c?.model && (!!c.apiKey || c.provider === 'custom');
  }, []);
  const settings = useSettings();
  const [hideInstall, setHideInstall] = useState(() => isStandalone() || sessionStorage.getItem('banzir.hideInstall') === '1');
  const week = sessionsInWeek(sessions);
  const target = program?.daysPerWeek ?? profile.daysPerWeek;
  const pos = program && state ? position(program, state.completed) : undefined;
  const light = !!(pos && state?.lightWeek === pos.week);
  const day = pos ? (light ? lighten(pos.day) : pos.day) : undefined;
  const info = GOAL_INFO[program?.goal ?? profile.goal];
  const last = [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0];
  const daysSinceBackup = settings.lastBackup ? (Date.now() - new Date(settings.lastBackup).getTime()) / 86400000 : Infinity;

  async function start() {
    unlockAudio();
    if (!active && program && day) await startWorkout(program, day, sessions, light);
    openPlayer();
  }

  return (
    <div className="screen">
      <header>
        <p className="muted small">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="h1">
          {greeting()}
          {profile.name ? `, ${profile.name}` : ''}
        </h1>
      </header>

      <div className="card row">
        <Ring value={target ? week.length / target : 0} size={68}>
          {week.length}/{target}
        </Ring>
        <div className="grow">
          <b>This week</b>
          <p className="muted small">
            {week.length >= target ? 'Weekly target reached.' : `${target - week.length} session${target - week.length > 1 ? 's' : ''} to go.`}
            {pos && program && (program.loops ? ` Week ${pos.week + 1}.` : ` Week ${Math.min(pos.week + 1, pos.totalWeeks)} of ${pos.totalWeeks}.`)}
          </p>
        </div>
      </div>

      {active ? (
        <div className="hero" style={{ ['--g1' as string]: info.g1, ['--g2' as string]: info.g2 }}>
          <span className="chip">In progress</span>
          <h2 className="h1" style={{ fontSize: 24, margin: '10px 0 14px' }}>
            {active.dayName}
          </h2>
          <button className="btn big block" onClick={start}>
            <Icon name="play" size={18} /> Resume workout
          </button>
        </div>
      ) : pos?.finished ? (
        <div className="card accent stack">
          <div className="row">
            <Icon name="trophy" />
            <b className="grow">Program complete</b>
          </div>
          <p className="small">You finished {program?.name}. Choose what comes next.</p>
          <button className="btn primary block" onClick={() => goTo('program')}>
            Choose a new plan
          </button>
        </div>
      ) : program && day ? (
        <div className="hero" style={{ ['--g1' as string]: info.g1, ['--g2' as string]: info.g2 }}>
          <div className="chips">
            <span className="chip">Next session</span>
            {light && <span className="chip">Lighter week</span>}
          </div>
          <h2 className="h1" style={{ fontSize: 26, margin: '10px 0 4px' }}>
            {day.name}
          </h2>
          <p className="muted small" style={{ marginBottom: 14 }}>
            {flatItems(day).length === 0 ? 'No exercises yet' : `${flatItems(day).length} exercises · about ${estimateMinutes(day)} min${day.focus.length ? ` · ${day.focus.slice(0, 3).join(', ')}` : ''}`}
          </p>
          {flatItems(day).length === 0 ? (
            <button className="btn big block" onClick={() => goTo('program')}>
              Add exercises to this day
            </button>
          ) : (
            <button className="btn big block" onClick={start}>
              <Icon name="play" size={18} /> Start workout
            </button>
          )}
        </div>
      ) : (
        <div className="card stack">
          <b>No plan yet</b>
          <button className="btn primary block" onClick={() => goTo('program')}>
            Choose a plan
          </button>
        </div>
      )}

      {pos?.deloadSuggested && !light && !active && state && !pos.finished && (
        <div className="card stack">
          <b>Lighter week suggested</b>
          <p className="muted small">You have trained hard for several weeks. Half the sets at the same loads lets your body catch up.</p>
          <button className="btn block" onClick={() => setState({ ...state, lightWeek: pos.week })}>
            Use a lighter week
          </button>
        </div>
      )}

      {day && !active && !pos?.finished && flatItems(day).length > 0 && (
        <div className="card">
          <div className="list">
            {flatItems(day)
              .filter((i) => getExercise(i.exerciseId).slot !== 'mobility')
              .map((item) => (
                <div key={item.id} style={{ minHeight: 0, padding: '9px 0' }}>
                  <span className="grow">{getExercise(item.exerciseId).name}</span>
                  <span className="muted small num">{describe(rx(item))}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        {settings.modules.body && <QuickWeigh />}
        {settings.modules.nutrition && <FoodToday profile={profile} onOpen={() => goTo('food')} />}
      </Suspense>

      <div className="tiles">
        <div className="tile">
          <b className="num">{sessions.length}</b>
          <span>Sessions</span>
        </div>
        <div className="tile">
          <b className="num">{weekStreak(sessions, target)}</b>
          <span>Week streak</span>
        </div>
        <div className="tile">
          <b className="num">{totalMinutes(sessions)}</b>
          <span>Minutes</span>
        </div>
      </div>

      <div className="card accent stack">
        <div className="row">
          <Icon name="spark" size={20} />
          <b className="grow">Coach tip</b>
        </div>
        <p className="small">{sessions.length === 0 ? TIPS.first : TIPS[program?.goal ?? profile.goal]}</p>
        {last && (
          <p className="muted small">
            Last session: {last.dayName}, {shortDate(last.date)}.
          </p>
        )}
        <button className="btn sm" style={{ justifySelf: 'start' }} onClick={() => goTo('coach')}>
          <Icon name="chat" size={14} /> {coachReady ? 'Ask your coach' : 'Set up your AI coach'}
        </button>
      </div>

      {!hideInstall && (
        <div className="card stack">
          <b>Install Banzir on your home screen</b>
          <p className="muted small">Browsers can clear the data of sites that are not installed. Installing keeps your training log safe.</p>
          <div className="row">
            <button className="btn sm" onClick={() => goTo('profile')}>
              How to install
            </button>
            <button
              className="btn sm ghost"
              onClick={() => {
                sessionStorage.setItem('banzir.hideInstall', '1');
                setHideInstall(true);
              }}
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {sessions.length >= 3 && daysSinceBackup > 30 && (
        <div className="card stack">
          <b>Back up your data</b>
          <p className="muted small">{settings.lastBackup ? 'Your last backup is more than a month old.' : 'You have not saved a backup yet.'}</p>
          <button className="btn sm" onClick={() => goTo('profile')}>
            Go to backup
          </button>
        </div>
      )}
    </div>
  );
}

