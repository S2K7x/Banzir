# Program schema (draft v0)

One schema for built-in templates, user programs and AI-generated programs.
Implemented as Zod schemas in `src/features/program/schema.ts`; the TypeScript
below is the reference. Change this document and the code together.

```ts
type Program = {
  id: string;
  schemaVersion: 1;
  name: string;
  description: string;
  source: 'template' | 'user' | 'coach';
  templateId?: string;            // which catalog entry it came from
  goal: Goal;
  level: 'beginner' | 'intermediate' | 'advanced';
  equipment: Equipment[];         // what it needs
  daysPerWeek: number;
  sessionMinutes: number;         // typical length
  durationWeeks?: number;         // undefined = open-ended
  phases: Phase[];                // at least one
  schedule: WeekSchedule;         // which day template runs on which weekday
  progression: ProgressionDefaults;
  tags: string[];                 // 'express', 'home', 'hybrid', ...
  sources?: string[];             // doc references for the evidence
};

type Goal =
  | 'muscle' | 'strength' | 'calisthenics' | 'running'
  | 'fat_loss' | 'general_fitness' | 'sport';

type Phase = {
  id: string;
  name: string;                   // 'Base', 'Build', 'Peak', 'Deload'
  weeks: number;
  days: DayTemplate[];
  weekOverrides?: WeekOverride[]; // e.g. week 3 intervals, deload week
};

type WeekSchedule = {
  // weekday 0-6 → day template id, or 'rest'
  [weekday: number]: string | 'rest';
};

type DayTemplate = {
  id: string;
  name: string;                   // 'Upper A', 'Easy run'
  kind: 'strength' | 'skill' | 'run' | 'conditioning' | 'mobility' | 'mixed';
  focus?: string[];               // muscles or qualities
  blocks: Block[];
  notes?: string;
};

type Block = {
  id: string;
  type: 'warmup' | 'main' | 'superset' | 'circuit' | 'intervals' | 'cooldown';
  rounds?: number;                // for circuits and supersets
  items: Item[];
};

type Item = {
  id: string;
  exerciseId: string;             // library reference
  slot?: MovementSlot;            // drives substitution
  alternatives?: string[];        // explicit substitutes
  priority: 1 | 2 | 3;            // 3 is dropped first when trimming time
  prescription: Prescription;
  restSeconds?: number;
  tempo?: string;                 // '3-1-1'
  cue?: string;                   // one short coaching cue
  progression?: ProgressionRule;  // overrides program default
};

type Prescription =
  | { mode: 'reps'; sets: number; reps: [number, number]; target: Effort; load?: Load }
  | { mode: 'hold'; sets: number; seconds: [number, number]; target?: Effort }
  | { mode: 'time'; sets?: number; seconds: number; target?: Effort }
  | { mode: 'distance'; sets?: number; meters: number; target?: Effort }
  | { mode: 'intervals'; reps: number; work: Work; recover: Work; target: Effort }
  | { mode: 'amrap'; sets: number; capReps?: number };

type Work = { seconds?: number; meters?: number };

type Effort =
  | { type: 'rir'; value: [number, number] }
  | { type: 'rpe'; value: [number, number] }
  | { type: 'hrZone'; value: 1 | 2 | 3 | 4 | 5 }
  | { type: 'pace'; ref: 'easy' | 'threshold' | '5k' | '10k' | 'race' }
  | { type: 'percent1rm'; value: [number, number] };

type Load =
  | { type: 'bodyweight' }
  | { type: 'absolute'; kg: number }
  | { type: 'percent1rm'; value: number }
  | { type: 'auto' };             // engine suggests from history

type ProgressionRule =
  | { type: 'linear'; stepKg: number; failuresBeforeReset: number; resetPercent: number }
  | { type: 'double'; stepKg: number }              // reps then load
  | { type: 'variation'; ladderId: string; standard: Standard } // calisthenics
  | { type: 'time'; stepSeconds: number }           // holds, easy runs
  | { type: 'distance'; maxIncreasePercent: number } // long run rule
  | { type: 'none' };

type Standard = { sets: number; reps?: number; seconds?: number; sessions: number };

type ProgressionDefaults = {
  strength: ProgressionRule;
  deload: { everyWeeks?: number; volumeFactor: number }; // e.g. 0.5
};

type WeekOverride = {
  week: number;                   // 1-based within the phase
  volumeFactor?: number;          // 0.5 for a deload
  replaceItems?: { itemId: string; prescription: Prescription }[];
};

type MovementSlot =
  | 'squat' | 'hinge' | 'push_h' | 'push_v' | 'pull_h' | 'pull_v'
  | 'single_leg' | 'core' | 'carry' | 'calf' | 'arm_flex' | 'arm_ext'
  | 'shoulder_lat' | 'shoulder_rear' | 'skill' | 'plyo' | 'sprint'
  | 'rotation' | 'neck' | 'grip' | 'mobility';

type Equipment =
  | 'none' | 'pullup_bar' | 'rings' | 'parallettes' | 'bands'
  | 'dumbbells' | 'kettlebell' | 'barbell' | 'rack' | 'bench'
  | 'cables' | 'machines' | 'medball' | 'box' | 'jump_rope'
  | 'treadmill' | 'bike' | 'rower' | 'heavy_bag';
```

## Exercise library entry

```ts
type Exercise = {
  id: string;
  name: string;
  slot: MovementSlot;
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];     // counted as 0.5 set in volume charts
  equipment: Equipment[];
  level: 'beginner' | 'intermediate' | 'advanced';
  logType: 'weight_reps' | 'reps' | 'hold' | 'time' | 'distance';
  unilateral?: boolean;
  instructions: string[];
  images?: string[];
  ladderId?: string;              // calisthenics progression ladder
  ladderStep?: number;
  source: 'free-exercise-db' | 'banzir' | 'user';
};
```

The library is seeded from `yuhonas/free-exercise-db` (public domain, 800+
exercises with `name`, `force`, `level`, `mechanic`, `equipment`,
`primaryMuscles`, `secondaryMuscles`, `instructions`, `category`, `images`).
A mapping script adds `slot`, `logType` and Banzir equipment tags. Calisthenics
progressions and running sessions missing from that dataset are added as
`source: 'banzir'`. Images should be bundled or cached by the service worker,
not hot-linked at runtime.

## Logged session

```ts
type Session = {
  id: string;
  date: string;                   // ISO
  programId?: string;
  dayTemplateId?: string;
  durationSeconds: number;
  entries: {
    itemId?: string;
    exerciseId: string;
    sets: {
      reps?: number; kg?: number; seconds?: number; meters?: number;
      rir?: number; rpe?: number; done: boolean; note?: string;
    }[];
  }[];
  sessionRpe?: number;
  readiness?: { sleep: number; soreness: number; pain: boolean };
  note?: string;
};
```

## Rules

- IDs are stable strings; templates never change IDs between versions so user
  history keeps matching.
- Anything optional must have a sensible default in the player.
- The matcher trims by `priority` and substitutes by `slot` + `equipment`.
- A program must validate before it is saved, whatever its source.
