// Measures WCAG contrast for every theme's colour pairs, across accent hues.
// Usage: npm run build && npx vite preview --port 4173 & node scripts/contrast.mjs
// Exits with 1 when a pair is below its minimum. Rules: docs/product/design.md.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const APP = process.env.APP_URL || 'http://localhost:4173/';
const THEMES = ['midnight', 'lilac', 'sky', 'carbon', 'sand', 'forest', 'sunset', 'mono', 'contrast', 'system'];
/** Hero and goal-card gradients carry white text: read from GOAL_INFO in src/lib/text.ts, plus the default hero. */
const GRADIENTS = { default: ['#1d63c9'] };
for (const m of readFileSync(new URL('../src/lib/text.ts', import.meta.url), 'utf8').matchAll(/(\w+): \{ label: '[^']+'.*?g1: '(#\w+)', g2: '(#\w+)'/g)) GRADIENTS[m[1]] = [m[2], m[3]];

// [foreground, background, minimum, label]. Backgrounds are composited over --bg.
const PAIRS = [
  ['--text', '--bg', 4.5, 'text on page'],
  ['--text', '--surface', 4.5, 'text on card'],
  ['--text-muted', '--bg', 4.5, 'muted on page'],
  ['--text-muted', '--surface', 4.5, 'muted on card'],
  ['--text-muted', '--surface-raised', 4.5, 'muted on raised (chips, inputs)'],
  ['--accent-contrast', '--accent', 4.5, 'primary button label'],
  ['--accent', '--bg', 3, 'accent graphics on page'],
  ['--accent-text', '--surface', 4.5, 'accent text on card (links)'],
  ['--accent-text', '--bg', 4.5, 'accent text on page'],
  ['--accent-text', '--accent-soft', 4.5, 'active tab label'],
  ['--text', '--accent-soft', 4.5, 'text in accent card'],
  ['--danger', '--bg', 4.5, 'danger text'],
  ['--text', 'warn', 4.5, 'text in warning note'],
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(APP);
const failures = [];
const report = [];

for (const scheme of ['light', 'dark']) {
  await page.emulateMedia({ colorScheme: scheme });
  for (const theme of THEMES) {
    if (scheme === 'dark' && theme !== 'system') continue;
    const name = theme === 'system' ? `system-${scheme}` : theme;
    const base = await page.evaluate((t) => {
      document.documentElement.dataset.theme = t;
      document.documentElement.style.removeProperty('--accent-h');
      return Number(getComputedStyle(document.documentElement).getPropertyValue('--accent-h'));
    }, theme);
    // The person can move the accent hue anywhere; mono has no chroma, so one hue is enough.
    const hues = theme === 'mono' ? [base] : [...new Set([base, ...Array.from({ length: 24 }, (_, i) => i * 15)])];
    for (const hue of hues) {
      const rows = await page.evaluate(
        ({ theme, hue, pairs }) => {
          const root = document.documentElement;
          root.dataset.theme = theme;
          root.style.setProperty('--accent-h', String(hue));
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          const probe = document.createElement('div');
          document.body.append(probe);
          const css = (v) => {
            if (v === 'warn') probe.style.color = 'color-mix(in srgb, var(--warning) 18%, var(--surface))';
            else probe.style.color = v.startsWith('--') ? `var(${v})` : v;
            return getComputedStyle(probe).color;
          };
          const paint = (...colors) => {
            ctx.clearRect(0, 0, 1, 1);
            for (const c of colors) {
              ctx.fillStyle = c;
              ctx.fillRect(0, 0, 1, 1);
            }
            return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
          };
          const lum = ([r, g, b]) => {
            const f = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
            return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
          };
          const ratio = (a, b) => {
            const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
            return (x + 0.05) / (y + 0.05);
          };
          const bg = css('--bg');
          const out = pairs.map(([fg, back, min, label]) => {
            const backRgb = paint('#fff', bg, css(back));
            const fgRgb = paint(`rgb(${backRgb.join(',')})`, css(fg));
            return { label, ratio: Math.round(ratio(fgRgb, backRgb) * 100) / 100, min };
          });
          probe.remove();
          return out;
        },
        { theme, hue, pairs: PAIRS },
      );
      for (const r of rows) {
        if (r.ratio < r.min) failures.push(`${name} hue ${hue}: ${r.label} ${r.ratio} < ${r.min}`);
      }
      if (hue === base) report.push(`${name.padEnd(14)} ${rows.map((r) => `${r.label.split(' ')[0]}:${r.ratio}`).join('  ')}`);
    }
  }
}

{
  for (const [goal, colors] of Object.entries(GRADIENTS)) {
    for (const c of colors) {
      const r = await page.evaluate((c) => {
        const h = c.replace('#', '');
        const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
        const f = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
        const L = 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
        return Math.round((1.05 / (L + 0.05)) * 100) / 100;
      }, c);
      // Hero text includes 13 px lines at 92 % white, so the lighter stop needs about 5:1 with pure white.
      if (r < 4.9) failures.push(`gradient ${goal} ${c}: white text ${r} < 4.9`);
    }
  }
}

await browser.close();
console.log(report.join('\n'));
if (failures.length) {
  console.log(`\n${failures.length} pairs below minimum:`);
  const seen = new Map();
  for (const f of failures) {
    const k = f.replace(/ hue \d+/, '');
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  for (const [k, n] of seen) console.log(`  ${k}${n > 1 ? ` (${n} hues)` : ''}`);
  process.exit(1);
}
console.log('\nAll pairs meet their minimum.');
