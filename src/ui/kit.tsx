import { useEffect, useState, type ReactNode } from 'react';

/* One stroke icon set, bundled. No emoji in the interface. */
const PATHS: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7.5 8a7.5 7.5 0 0 1 15 0',
  play: 'M7 4.5v15l12-7.5-12-7.5Z',
  pause: 'M8 5v14M16 5v14',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  right: 'm9 5 7 7-7 7',
  left: 'm15 5-7 7 7 7',
  x: 'M6 6l12 12M18 6 6 18',
  timer: 'M12 8v5l3 2M9 2h6M12 22a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Z',
  swap: 'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  flame: 'M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-3 3 0-3-1-6-4-9 0 4-4 7-4 12 0 5 3 8 7 8Z',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4Zm0 2H4v1a4 4 0 0 0 4 4m8-5h4v1a4 4 0 0 1-4 4m-4 2v4m-4 3h8',
  down: 'M12 4v12m0 0-5-5m5 5 5-5M5 20h14',
  up: 'M12 20V8m0 0-5 5m5-5 5 5M5 4h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  dumbbell: 'M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11',
  run: 'M13.5 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM7 21l3.5-5 -2-3.5 3-4 3.5 1 2 3h3M10.5 16l4 1.5V22M8.5 9.5 6 11.5',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 12 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-11v6m0-9.5h.01',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
  body: 'M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 9h14M12 9v6m0 0-3.5 7M12 15l3.5 7',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  scale: 'M4 20h16M6 20V8l6-4 6 4v12M9 12h6',
  ball: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20',
  arrowUp: 'M12 19V5m0 0-6 6m6-6 6 6',
  arrowDown: 'M12 5v14m0 0-6-6m6 6 6-6',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  food: 'M7 3v7a2 2 0 0 0 4 0V3M9 12v9M17 21V3c-2.5 1.5-3.5 4-3.5 7.5 0 2 1.5 3 3.5 3',
  pen: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4.5 4.5',
  cog: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-3.5 2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1L15.5 4h-4l-.4 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.5L7 11.5v1L5 14l2 3.5 2.4-1a7 7 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5v-1Z',
};

export function Icon({ name, size = 22 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? PATHS.info} />
    </svg>
  );
}

export function Ring({ value, size = 64, stroke = 7, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle className="value" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
      </svg>
      <span>{children}</span>
    </div>
  );
}

export function Sheet({ title, onClose, children }: { title?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="row between">
            <h2 className="h2">{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="x" size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={String(o.value)} role="tab" aria-selected={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} role="switch" aria-checked={value}>
      <span className="grow">
        <span style={{ display: 'block', fontWeight: 600 }}>{label}</span>
        {hint && <span className="muted small">{hint}</span>}
      </span>
      <span className={`switch ${value ? 'on' : ''}`} />
    </button>
  );
}

/** Number input that tolerates empty text while typing. */
export function NumInput({ value, onChange, placeholder, step, label }: { value: number | undefined; onChange: (v: number | undefined) => void; placeholder?: string; step?: number; label?: string }) {
  const [text, setText] = useState(value == null ? '' : String(value));
  useEffect(() => {
    setText((t) => (t !== '' && Number(t) === value ? t : value == null ? '' : String(value)));
  }, [value]);
  return (
    <input
      className="input num"
      inputMode="decimal"
      type="number"
      step={step ?? 'any'}
      aria-label={label}
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = e.target.value === '' ? undefined : Number(e.target.value);
        onChange(n != null && Number.isFinite(n) && n >= 0 ? n : undefined);
      }}
    />
  );
}

/** Re-renders on an interval while active; timers compute from timestamps. */
export function useNow(active: boolean, ms = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now;
}

/** A labelled number with minus and plus buttons, for sets, reps and rest. */
export function Stepper({ label, value, onChange, min = 0, max = 999, step = 1, format }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; format?: (v: number) => string }) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="stepper">
      <span className="grow">{label}</span>
      <button className="icon-btn" onClick={() => onChange(clamp(value - step))} disabled={value <= min} aria-label={`Less: ${label}`}>
        <Icon name="minus" size={16} />
      </button>
      <b className="num">{format ? format(value) : value}</b>
      <button className="icon-btn" onClick={() => onChange(clamp(value + step))} disabled={value >= max} aria-label={`More: ${label}`}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}
