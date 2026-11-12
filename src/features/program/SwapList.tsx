import { getExercise, ladderSteps } from '../../data/exercises';
import { canDo, compatible, equipmentSet, swapOptions } from '../../lib/matcher';
import type { Item, Profile } from '../../lib/schema';
import { LEVEL_INFO } from '../../lib/text';
import { Icon } from '../../ui/kit';

type Props = {
  item: Item;
  profile: Profile;
  /** `everywhere` is true for a ladder step, which should change across the whole plan. */
  onPick: (exerciseId: string, everywhere: boolean) => void;
};

/** Alternatives for one exercise: its progression ladder first, then other options for the same movement. */
export function SwapList({ item, profile, onPick }: Props) {
  const ex = getExercise(item.exerciseId);
  const eq = equipmentSet(profile.equipment);
  const ladder = ex.ladder ? ladderSteps(ex.ladder).filter((s) => canDo(s, eq) && compatible(item.prescription.mode, s)) : [];
  const ladderIds = new Set(ladder.map((s) => s.id));
  const others = swapOptions(item, profile).filter((o) => !ladderIds.has(o.id));

  return (
    <>
      {ladder.length > 1 && (
        <>
          <div>
            <b>Progression ladder</b>
            <p className="muted small">Easier at the top, harder at the bottom. Choosing a step changes it everywhere in this plan.</p>
          </div>
          <div className="list">
            {ladder.map((s) => (
              <button key={s.id} onClick={() => s.id !== ex.id && onPick(s.id, true)} aria-current={s.id === ex.id}>
                <span className="grow">{s.name}</span>
                {s.id === ex.id ? <span className="chip on">Current</span> : <Icon name="right" size={16} />}
              </button>
            ))}
          </div>
        </>
      )}
      {others.length > 0 && (
        <>
          <b>{ladder.length > 1 ? 'Other exercises' : 'Swap for'}</b>
          <div className="list">
            {others.map((o) => (
              <button key={o.id} onClick={() => onPick(o.id, false)}>
                <span className="grow">
                  {o.name}
                  <span className="muted small" style={{ display: 'block' }}>
                    {LEVEL_INFO[o.level].label}
                    {o.primary.length ? ` · ${o.primary.join(', ')}` : ''}
                  </span>
                </span>
                <Icon name="swap" size={16} />
              </button>
            ))}
          </div>
        </>
      )}
      {ladder.length <= 1 && others.length === 0 && <p className="muted small">No alternative fits your equipment.</p>}
    </>
  );
}
