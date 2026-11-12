import { useLiveQuery } from 'dexie-react-hooks';
import { dayKey } from '../../lib/body';
import { db, getKV } from '../../lib/db';
import { defaultSettings, targets, totals, type NutritionSettings } from '../../lib/nutrition';
import type { Profile } from '../../lib/schema';
import { Icon } from '../../ui/kit';

/** Today's food at a glance, linking to the Food tab. */
export function FoodToday({ profile, onOpen }: { profile: Profile; onOpen: () => void }) {
  const foods = useLiveQuery(() => db.foods.where('date').equals(dayKey()).toArray(), [], []);
  const stored = useLiveQuery(() => getKV<NutritionSettings>('nutrition.settings'), [], undefined);
  const t = targets(profile, stored ?? defaultSettings(profile));
  const day = totals(foods, profile.weightKg);
  return (
    <button className="card tap" onClick={onOpen}>
      <span className="row">
      <Icon name="food" />
      <span className="grow">
        <b>Food today</b>
        <span className="muted small num" style={{ display: 'block' }}>
          {t.kcal ? `${day.kcal} of ${t.kcal} kcal · protein ${day.protein}${t.protein ? ` of ${t.protein}` : ''} g` : `${day.kcal} kcal logged`}
        </span>
      </span>
      <Icon name="right" size={18} />
      </span>
    </button>
  );
}
