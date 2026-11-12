import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { addDays, dayKey } from '../../lib/body';
import { db, getKV } from '../../lib/db';
import {
  ACTIVITY,
  GAIN_RATES,
  LOSE_RATES,
  addFood,
  addWater,
  deleteFood,
  getFavourites,
  kcalFromMacros,
  portion,
  recentFoods,
  saveNutritionSettings,
  searchFoods,
  suggestCorrection,
  targets,
  toggleFavourite,
  tooFast,
  totals,
  waterTarget,
  defaultSettings,
  type Favourite,
  type FoodHit,
  type NutritionGoal,
  type NutritionSettings,
} from '../../lib/nutrition';
import type { BodyEntry, FoodEntry, Profile } from '../../lib/schema';
import { useSettings } from '../../lib/settings';
import { Icon, NumInput, Ring, Segmented, Sheet } from '../../ui/kit';

const nowTime = () => new Date().toTimeString().slice(0, 5);

function dayLabel(date: string): string {
  const today = dayKey();
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

export function Nutrition({ profile, editProfile }: { profile: Profile; editProfile: () => void }) {
  const { modules } = useSettings();
  const [date, setDate] = useState(dayKey());
  const [adding, setAdding] = useState(false);
  const [editingTargets, setEditingTargets] = useState(false);
  const [open, setOpen] = useState<FoodEntry | null>(null);

  const foods = useLiveQuery(() => db.foods.where('date').equals(date).sortBy('time'), [date], [] as FoodEntry[]);
  const body = useLiveQuery(() => db.body.orderBy('date').toArray(), [], [] as BodyEntry[]);
  const stored = useLiveQuery(() => getKV<NutritionSettings>('nutrition.settings'), [], undefined);
  const water = useLiveQuery(async () => ((await getKV<Record<string, number>>('nutrition.water')) ?? {})[date] ?? 0, [date], 0);
  const favourites = useLiveQuery(getFavourites, [], [] as Favourite[]);

  const s = stored ?? defaultSettings(profile);
  const t = useMemo(() => targets(profile, s), [profile, s]);
  const day = totals(foods, profile.weightKg);
  const correction = modules.body && date === dayKey() ? suggestCorrection(body, s) : null;
  const fast = modules.body && tooFast(body);
  const favNames = new Set(favourites.map((f) => f.name.toLowerCase()));
  const meals = [...new Set(foods.map((f) => f.time))];

  return (
    <div className="screen">
      <div className="row between">
        <h1 className="h1">Food</h1>
        <button className="icon-btn" onClick={() => setEditingTargets(true)} aria-label="Nutrition targets">
          <Icon name="cog" size={20} />
        </button>
      </div>

      <div className="card row">
        <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
          <Icon name="left" size={18} />
        </button>
        <b className="grow center">{dayLabel(date)}</b>
        <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} disabled={date >= dayKey()} aria-label="Next day">
          <Icon name="right" size={18} />
        </button>
      </div>

      {fast && (
        <div className="note warn">
          Your weight has been falling by more than 1 % a week for two weeks. That is faster than the app recommends: eat a little more, and talk to a professional if you also feel constantly tired or cold, or your periods have changed.
        </div>
      )}

      {t.kcal == null ? (
        <div className="card stack">
          <b>Set up your targets</b>
          <p className="muted small">The app needs your {t.missing.join(', ')} to estimate your calories. You can also type your own targets.</p>
          <div className="row">
            <button className="btn sm primary" onClick={editProfile}>
              Add them to my profile
            </button>
            <button className="btn sm" onClick={() => setEditingTargets(true)}>
              Set my own
            </button>
          </div>
        </div>
      ) : (
        <div className="card stack">
          <div className="row">
            <Ring value={day.kcal / t.kcal} size={84} stroke={8}>
              <span className="small num">{day.kcal}</span>
            </Ring>
            <div className="grow">
              <b className="num">
                {Math.max(0, t.kcal - day.kcal)} kcal left
              </b>
              <p className="muted small num">
                {day.kcal} of {t.kcal} kcal · {t.goal === 'lose' ? 'losing' : t.goal === 'gain' ? 'gaining' : 'maintaining'}
              </p>
            </div>
          </div>
          <Macro label="Protein" value={day.protein} target={t.protein} />
          <Macro label="Carbs" value={day.carbs} target={t.carbs} />
          <Macro label="Fat" value={day.fat} target={t.fat} />
          {profile.weightKg && <p className="muted small">Protein-rich meals: {day.proteinMeals} (aim for 3 to 4 spread over the day).</p>}
        </div>
      )}

      {correction && (
        <div className="card accent stack">
          <b>Adjust your calories?</b>
          <p className="small">{correction.reason}</p>
          <div className="row">
            <button className="btn sm primary" onClick={() => void saveNutritionSettings({ ...s, adjustKcal: s.adjustKcal + correction.kcal, adjustedAt: dayKey() })}>
              {correction.kcal > 0 ? '+' : ''}
              {correction.kcal} kcal a day
            </button>
            <button className="btn sm ghost" onClick={() => void saveNutritionSettings({ ...s, adjustedAt: dayKey() })}>
              Not now
            </button>
          </div>
        </div>
      )}

      <button className="btn primary big block" onClick={() => setAdding(true)}>
        <Icon name="plus" size={18} /> Add food
      </button>

      {foods.length === 0 ? (
        <p className="muted small center">Nothing logged {date === dayKey() ? 'yet today' : 'for this day'}. Logging most days, even roughly, is what helps.</p>
      ) : (
        meals.map((time) => (
          <div className="card" key={time}>
            <p className="muted small">{time}</p>
            <div className="list">
              {foods
                .filter((f) => f.time === time)
                .map((f) => (
                  <button key={f.id} onClick={() => setOpen(f)}>
                    <span className="grow">
                      {f.name}
                      {f.grams ? <span className="muted small"> · {f.grams} g</span> : null}
                    </span>
                    <span className="small num">
                      {f.kcal} kcal{f.protein != null ? ` · ${Math.round(f.protein)} g P` : ''}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        ))
      )}

      <div className="card row">
        <span className="grow">
          <b>Water</b>
          <span className="muted small num" style={{ display: 'block' }}>
            {water} of about {waterTarget(profile.weightKg)} ml
          </span>
        </span>
        <button className="btn sm ghost" onClick={() => void addWater(date, -250)} disabled={water <= 0} aria-label="Remove 250 ml of water">
          <Icon name="minus" size={14} />
        </button>
        <button className="btn sm" onClick={() => void addWater(date, 250)}>
          +250 ml
        </button>
      </div>

      {adding && <AddFood date={date} favourites={favourites} onClose={() => setAdding(false)} />}
      {editingTargets && <TargetsSheet profile={profile} settings={s} onClose={() => setEditingTargets(false)} />}
      {open && (
        <Sheet title={open.name} onClose={() => setOpen(null)}>
          <p className="small num">
            {open.kcal} kcal{open.protein != null ? ` · protein ${open.protein} g` : ''}
            {open.carbs != null ? ` · carbs ${open.carbs} g` : ''}
            {open.fat != null ? ` · fat ${open.fat} g` : ''}
            {open.grams ? ` · ${open.grams} g` : ''}
          </p>
          <button
            className="btn block"
            onClick={async () => {
              const { id: _id, ...rest } = open;
              void _id;
              await addFood({ ...rest, date: dayKey(), time: nowTime() });
              setOpen(null);
            }}
          >
            Log it again now
          </button>
          <button className="btn block" onClick={async () => void (await toggleFavourite(open), setOpen(null))}>
            <Icon name="heart" size={16} /> {favNames.has(open.name.toLowerCase()) ? 'Remove from favourites' : 'Add to favourites'}
          </button>
          <button
            className="btn ghost danger block"
            onClick={async () => {
              await deleteFood(open.id);
              setOpen(null);
            }}
          >
            <Icon name="trash" size={16} /> Delete
          </button>
        </Sheet>
      )}
    </div>
  );
}

function Macro({ label, value, target }: { label: string; value: number; target?: number }) {
  return (
    <div className="hbar" style={{ gridTemplateColumns: '64px 1fr auto' }}>
      <span>{label}</span>
      <span className="trk">
        <i style={{ width: `${target ? Math.min(100, (value / target) * 100) : 0}%` }} />
      </span>
      <span className="num muted small" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
        {value}
        {target != null ? `/${target}` : ''} g
      </span>
    </div>
  );
}

/* ---------- Adding food ---------- */

type Mode = 'search' | 'recent' | 'manual';

function AddFood({ date, favourites, onClose }: { date: string; favourites: Favourite[]; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>(favourites.length ? 'recent' : 'search');
  const [time, setTime] = useState(date === dayKey() ? nowTime() : '12:00');
  const recent = useLiveQuery(() => recentFoods(30), [], [] as FoodEntry[]);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<FoodHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<FoodHit | null>(null);
  const [grams, setGrams] = useState<number | undefined>(100);
  const [manual, setManual] = useState<{ name: string; kcal?: number; protein?: number; carbs?: number; fat?: number; grams?: number }>({ name: '' });
  const [added, setAdded] = useState<string | null>(null);

  const log = async (f: Favourite) => {
    await addFood({ ...f, date, time });
    setAdded(f.name);
  };

  async function search() {
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setHits(await searchFoods(query.trim()));
    } catch (e) {
      setHits(null);
      setError(navigator.onLine === false ? 'You are offline. Add the food by hand instead.' : e instanceof Error && e.message.startsWith('Too many') ? e.message : 'The food database is not reachable from here right now. Add the food by hand instead.');
    } finally {
      setBusy(false);
    }
  }

  if (picked) {
    const p = grams ? portion(picked, grams) : null;
    return (
      <Sheet title={picked.name} onClose={onClose}>
        <p className="muted small">
          {picked.brand ? `${picked.brand} · ` : ''}
          {picked.per100.kcal} kcal per 100 g
        </p>
        <label className="field">
          <span>Amount (g)</span>
          <NumInput value={grams} onChange={setGrams} label="Amount in grams" />
        </label>
        {picked.serving && (
          <button className="chip" style={{ justifySelf: 'start' }} onClick={() => setGrams(picked.serving)}>
            One serving: {picked.serving} g
          </button>
        )}
        {p && (
          <p className="small num">
            {p.kcal} kcal{p.protein != null ? ` · protein ${p.protein} g` : ''}
            {p.carbs != null ? ` · carbs ${p.carbs} g` : ''}
            {p.fat != null ? ` · fat ${p.fat} g` : ''}
          </p>
        )}
        <button
          className="btn primary big block"
          disabled={!p}
          onClick={async () => {
            if (!p) return;
            await log({ name: picked.name, code: picked.code || undefined, ...p });
            setPicked(null);
          }}
        >
          Add
        </button>
        <button className="btn ghost block" onClick={() => setPicked(null)}>
          Back
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet title="Add food" onClose={onClose}>
      <div className="row">
        <span className="small muted">Time</span>
        <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value || nowTime())} style={{ maxWidth: 140 }} aria-label="Time of the meal" />
      </div>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'recent', label: 'Recent' },
          { value: 'search', label: 'Search' },
          { value: 'manual', label: 'By hand' },
        ]}
      />
      {added && <p className="note">Added {added}.</p>}

      {mode === 'recent' &&
        (recent.length === 0 && favourites.length === 0 ? (
          <p className="muted small">Foods you log appear here so you can add them again in one tap.</p>
        ) : (
          <>
            {favourites.length > 0 && <b className="small">Favourites</b>}
            <div className="list">
              {favourites.map((f) => (
                <button key={`fav-${f.name}`} onClick={() => void log(f)}>
                  <Icon name="heart" size={14} />
                  <span className="grow">{f.name}</span>
                  <span className="small num muted">{f.kcal} kcal</span>
                </button>
              ))}
            </div>
            {recent.length > 0 && <b className="small">Recent</b>}
            <div className="list">
              {recent.map((f) => (
                <button key={f.id} onClick={() => void log({ name: f.name, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, grams: f.grams, code: f.code })}>
                  <span className="grow">
                    {f.name}
                    {f.grams ? <span className="muted small"> · {f.grams} g</span> : null}
                  </span>
                  <span className="small num muted">{f.kcal} kcal</span>
                </button>
              ))}
            </div>
          </>
        ))}

      {mode === 'search' && (
        <>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              void search();
            }}
          >
            <input className="input grow" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Food or brand" aria-label="Search foods" />
            <button className="btn" type="submit" disabled={busy || !query.trim()}>
              {busy ? '…' : 'Search'}
            </button>
          </form>
          {error && <p className="note warn">{error}</p>}
          {hits && hits.length === 0 && <p className="muted small">No results. Try other words, or add it by hand.</p>}
          {hits && hits.length > 0 && (
            <div className="list">
              {hits.map((h) => (
                <button
                  key={`${h.code}-${h.name}`}
                  onClick={() => {
                    setPicked(h);
                    setGrams(h.serving ?? 100);
                  }}
                >
                  <span className="grow">
                    {h.name}
                    {h.brand && <span className="muted small" style={{ display: 'block' }}>{h.brand}</span>}
                  </span>
                  <span className="small num muted">{h.per100.kcal} kcal/100 g</span>
                </button>
              ))}
            </div>
          )}
          <p className="muted small">Food data from Open Food Facts, a free database anyone can improve (Open Database Licence). Check the values against the label when you can.</p>
        </>
      )}

      {mode === 'manual' && (
        <div className="stack">
          <label className="field">
            <span>Name</span>
            <input className="input" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} placeholder="For example: chicken and rice" />
          </label>
          <div className="row">
            <label className="field grow">
              <span>Protein (g)</span>
              <NumInput value={manual.protein} onChange={(protein) => setManual({ ...manual, protein })} label="Protein in grams" />
            </label>
            <label className="field grow">
              <span>Carbs (g)</span>
              <NumInput value={manual.carbs} onChange={(carbs) => setManual({ ...manual, carbs })} label="Carbohydrate in grams" />
            </label>
            <label className="field grow">
              <span>Fat (g)</span>
              <NumInput value={manual.fat} onChange={(fat) => setManual({ ...manual, fat })} label="Fat in grams" />
            </label>
          </div>
          <label className="field">
            <span>Calories (kcal){manual.kcal == null && (manual.protein || manual.carbs || manual.fat) ? ` · from macros: ${kcalFromMacros(manual.protein, manual.carbs, manual.fat)}` : ''}</span>
            <NumInput value={manual.kcal} onChange={(kcal) => setManual({ ...manual, kcal })} label="Calories" placeholder={manual.protein || manual.carbs || manual.fat ? String(kcalFromMacros(manual.protein, manual.carbs, manual.fat)) : ''} />
          </label>
          <button
            className="btn primary big block"
            disabled={!manual.name.trim() || (manual.kcal == null && !manual.protein && !manual.carbs && !manual.fat)}
            onClick={async () => {
              await log({ name: manual.name.trim(), kcal: manual.kcal ?? kcalFromMacros(manual.protein, manual.carbs, manual.fat), protein: manual.protein, carbs: manual.carbs, fat: manual.fat });
              setManual({ name: '' });
            }}
          >
            Add
          </button>
        </div>
      )}
      <button className="btn block" onClick={onClose}>
        Done
      </button>
    </Sheet>
  );
}

/* ---------- Targets ---------- */

function TargetsSheet({ profile, settings, onClose }: { profile: Profile; settings: NutritionSettings; onClose: () => void }) {
  const [s, setS] = useState(settings);
  const t = targets(profile, s);
  const setGoal = (goal: NutritionGoal) => setS({ ...s, goal, ratePct: goal === 'lose' ? -0.5 : goal === 'gain' ? 0.25 : 0, adjustKcal: 0, adjustedAt: undefined });
  return (
    <Sheet title="Your targets" onClose={onClose}>
      <div className="field">
        <span>Goal</span>
        <Segmented
          value={s.goal}
          onChange={setGoal}
          options={[
            { value: 'lose', label: 'Lose fat' },
            { value: 'maintain', label: 'Maintain' },
            { value: 'gain', label: 'Gain' },
          ]}
        />
      </div>
      {s.goal !== 'maintain' && (
        <div className="field">
          <span>Pace (% of body weight per week)</span>
          <div className="chips">
            {(s.goal === 'lose' ? LOSE_RATES.map((r) => -r) : GAIN_RATES).map((r) => (
              <button key={r} className={`chip ${s.ratePct === r ? 'on' : ''}`} onClick={() => setS({ ...s, ratePct: r })}>
                {r > 0 ? '+' : ''}
                {r} %
              </button>
            ))}
          </div>
          <p className="muted small">{s.goal === 'lose' ? 'Slower keeps more muscle, especially when you are already lean. 0.5 % is a good default.' : 'Small surpluses add muscle with less fat; larger ones mostly add fat.'}</p>
        </div>
      )}
      <div className="field">
        <span>How active is your whole day?</span>
        <div className="stack" style={{ gap: 6 }}>
          {ACTIVITY.map((a) => (
            <button key={a.pal} className={`card tap ${s.pal === a.pal ? 'accent' : ''}`} style={{ padding: 12 }} onClick={() => setS({ ...s, pal: a.pal })}>
              <b className="small">{a.label}</b>
              <span className="muted small" style={{ display: 'block' }}>
                {a.detail}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="card stack" style={{ gap: 4 }}>
        {t.kcal != null ? (
          <>
            <b className="num">
              {t.kcal} kcal · protein {t.protein} g · carbs {t.carbs} g · fat {t.fat} g
            </b>
            {t.maintenance && <p className="muted small num">Estimated maintenance: {t.maintenance} kcal{s.adjustKcal ? `, corrected by ${s.adjustKcal > 0 ? '+' : ''}${s.adjustKcal} kcal from your weight trend` : ''}.</p>}
          </>
        ) : (
          <p className="muted small">Add your {t.missing.join(', ')} to your profile, or type your own targets below.</p>
        )}
        {t.notes.map((n) => (
          <p key={n} className="small">
            {n}
          </p>
        ))}
        <p className="muted small">This is an estimate. Your weight trend over the next weeks tells the truth, and the app suggests small corrections from it.</p>
      </div>

      <div className="row">
        <label className="field grow">
          <span>My own calories</span>
          <NumInput value={s.manualKcal} onChange={(manualKcal) => setS({ ...s, manualKcal })} label="My own calorie target" placeholder="auto" />
        </label>
        <label className="field grow">
          <span>My own protein (g)</span>
          <NumInput value={s.manualProtein} onChange={(manualProtein) => setS({ ...s, manualProtein })} label="My own protein target" placeholder="auto" />
        </label>
      </div>
      <button
        className="btn primary big block"
        onClick={async () => {
          await saveNutritionSettings(s);
          onClose();
        }}
      >
        Save
      </button>
    </Sheet>
  );
}
