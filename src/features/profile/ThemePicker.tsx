import { updateSettings, useSettings } from '../../lib/settings';
import { THEMES } from '../../lib/themes';
import { Segmented } from '../../ui/kit';

export function ThemePicker() {
  const s = useSettings();
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="swatches">
        {THEMES.map((t) => (
          <button key={t.id} className={`swatch ${s.theme === t.id ? 'on' : ''}`} onClick={() => updateSettings({ theme: t.id, accentHue: null })} aria-pressed={s.theme === t.id}>
            <i style={{ background: t.bg, boxShadow: `inset 0 -10px 0 ${t.accent}` }} />
            {t.label}
          </button>
        ))}
      </div>
      <label className="field">
        <span>Accent colour</span>
        <input className="hue" type="range" min={0} max={360} step={5} value={s.accentHue ?? 165} onChange={(e) => updateSettings({ accentHue: Number(e.target.value) })} aria-label="Accent colour hue" />
      </label>
      {s.accentHue != null && (
        <button className="link" style={{ justifySelf: 'start' }} onClick={() => updateSettings({ accentHue: null })}>
          Reset to theme colour
        </button>
      )}
      <div className="field">
        <span>Corners</span>
        <Segmented
          value={s.radius}
          onChange={(radius) => updateSettings({ radius })}
          options={[
            { value: 'sharp', label: 'Sharp' },
            { value: 'round', label: 'Rounded' },
            { value: 'pill', label: 'Soft' },
          ]}
        />
      </div>
    </div>
  );
}
