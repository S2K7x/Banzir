// Renders public/icon.svg to the PNG sizes the manifest and iOS need.
// Run with: node scripts/make-icons.mjs  (requires Playwright's Chromium)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readFileSync } from 'node:fs';

const svg = readFileSync('public/icon.svg', 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
const shots = [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['apple-touch-icon.png', 180, 0],
  ['icon-maskable.png', 512, 0.1], // padding keeps the mark inside the safe zone
];
for (const [name, size, pad] of shots) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(
    `<body style="margin:0;display:grid;place-items:center;width:${size}px;height:${size}px;background:${pad ? '#12a488' : 'transparent'}"><div style="width:${inner}px;height:${inner}px">${svg}</div></body>`,
  );
  await page.screenshot({ path: `public/${name}`, omitBackground: !pad });
}
await browser.close();
