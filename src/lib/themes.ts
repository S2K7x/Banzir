/** Theme presets. The tokens themselves live in styles.css under [data-theme]. */
export const THEMES: { id: string; label: string; bg: string; accent: string }[] = [
  { id: 'midnight', label: 'Midnight', bg: '#0e1113', accent: 'oklch(0.78 0.15 165)' },
  { id: 'lilac', label: 'Lilac', bg: '#eceafb', accent: 'oklch(0.52 0.2 282)' },
  { id: 'sky', label: 'Sky', bg: '#dcebf9', accent: 'oklch(0.5 0.17 252)' },
  { id: 'system', label: 'System', bg: 'linear-gradient(135deg, #f2f2f7 50%, #1c1c1e 50%)', accent: 'oklch(0.6 0.2 255)' },
  { id: 'carbon', label: 'Carbon', bg: '#000', accent: 'oklch(0.66 0.22 25)' },
  { id: 'sand', label: 'Sand', bg: '#f3ede3', accent: 'oklch(0.58 0.14 45)' },
  { id: 'forest', label: 'Forest', bg: '#0c1811', accent: 'oklch(0.84 0.19 130)' },
  { id: 'sunset', label: 'Sunset', bg: '#1b0f1f', accent: 'oklch(0.76 0.16 52)' },
  { id: 'mono', label: 'Mono', bg: '#fff', accent: '#222' },
  { id: 'contrast', label: 'Contrast', bg: '#000', accent: 'oklch(0.9 0.19 100)' },
];
