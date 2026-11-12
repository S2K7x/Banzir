// Renders the Instagram carousel (1080x1350, 4:5) and a Reel cover (1080x1920)
// from the real app. Usage: npm run build && npx vite preview --port 4173 &
//                           node marketing/make-posts.mjs
// Output: marketing/instagram/*.jpg. The caption is in marketing/instagram/caption.md.
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { captureStills } from './stills.mjs';

const OUT = new URL('./instagram/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const ICON = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8');

const browser = await chromium.launch();
console.log('capturing stills...');
const { stills } = await captureStills(browser, { scale: 3 });

const phone = (src, style = '') => `<div class="phone" style="${style}"><img src="${src}"></div>`;
const pills = (xs) => `<div class="pills">${xs.map((x) => `<span>${x}</span>`).join('')}</div>`;

/* One idea per slide. Text stays inside the centre, which the profile grid's 3:4 crop keeps. */
const SLIDES = [
  {
    file: '01-cover',
    kicker: 'Free and open source',
    title: 'Your own<br>workout app.',
    sub: 'A training plan for your goal, on your own URL. No account, no subscription.',
    stage: phone(stills.today, 'left:50%;top:470px;width:560px;transform:translateX(-50%) rotate(-4deg)'),
    swipe: true,
  },
  {
    file: '02-plans',
    kicker: 'Onboarding',
    title: 'A plan built<br>for your goal',
    sub: 'Muscle, strength, calisthenics, running, fat loss or sport. 35 plans, beginner to advanced.',
    stage: phone(stills.goal, 'left:50%;top:470px;width:540px;transform:translateX(-50%)'),
  },
  {
    file: '03-workouts',
    kicker: 'Workouts',
    title: 'Guided,<br>set by set',
    sub: "Rest timer, last time's numbers, what to lift next.",
    stage: phone(stills.workout, 'left:50%;top:400px;width:500px;transform:translateX(-50%)'),
  },
  {
    file: '04-coach',
    kicker: 'AI coach, optional',
    title: 'A coach that<br>reads your log',
    sub: 'Bring your own key: Claude, OpenAI, Gemini, OpenRouter, Groq, Mistral or a local model.',
    stage: phone(stills.coachTop, 'left:50%;top:470px;width:540px;transform:translateX(-50%)'),
  },
  {
    file: '05-modules',
    kicker: 'Modules',
    title: 'Only what<br>you need',
    sub: pills(['Food', 'Body weight', 'Running', 'Fasting']),
    stage: phone(stills.food, 'left:310px;top:470px;width:440px;transform:translateX(-50%) rotate(-6deg)') + phone(stills.fasting, 'left:770px;top:430px;width:440px;transform:translateX(-50%) rotate(6deg)'),
  },
  {
    file: '06-themes',
    kicker: 'Themes',
    title: 'Make it yours',
    sub: 'Ten themes, any accent colour, kg or lb, km or mi.',
    stage: stills.themes
      .map((s, i) => {
        const o = i - 2;
        return phone(s, `left:${540 + o * 140}px;top:${400 + Math.abs(o) * 40}px;width:${380 - Math.abs(o) * 22}px;transform:translateX(-50%) rotate(${o * 7}deg);z-index:${10 - Math.abs(o)}`);
      })
      .join(''),
  },
  {
    file: '07-everywhere',
    kicker: 'Phone, tablet and desktop',
    title: 'Private by design',
    sub: 'Your data stays on your device. Install it like an app. Works offline.',
    stage: `<div class="window" style="left:50%;top:420px;transform:translateX(-50%)"><div class="bar"><i></i><i></i><i></i><span>your-banzir.vercel.app</span></div><img src="${stills.desktop}"></div>${phone(stills.today, 'left:830px;top:640px;width:300px;transform:translateX(-50%)')}`,
  },
  {
    file: '08-get-yours',
    end: true,
  },
];

const css = (w, h) => `
  * { box-sizing: border-box; margin: 0; }
  body { width: ${w}px; height: ${h}px; overflow: hidden; position: relative; color: #f2f5f4; font-family: Inter, sans-serif;
    background: radial-gradient(900px 700px at 50% 85%, rgb(25 199 154 / 0.26), transparent 62%), radial-gradient(800px 600px at 0% 0%, rgb(11 59 70 / 0.7), transparent 65%), #0a0f11; }
  .copy { position: absolute; left: 90px; right: 90px; top: 96px; text-align: center; }
  .kicker { font: 700 26px Inter; letter-spacing: .14em; text-transform: uppercase; color: #36d6a1; }
  h1 { margin-top: 18px; font: 800 88px/1.02 'Inter Display', Inter, sans-serif; letter-spacing: -0.035em; }
  .sub { margin: 24px auto 0; max-width: 820px; font: 400 32px/1.38 Inter; color: #b9c5c1; }
  .pills { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
  .pills span { padding: 12px 24px; border-radius: 99px; background: rgb(255 255 255 / .08); border: 1px solid rgb(255 255 255 / .14); font: 600 28px Inter; color: #f2f5f4; }
  .phone { position: absolute; padding: 12px; border-radius: 64px; background: linear-gradient(160deg, #2c3439, #12171a); box-shadow: 0 50px 110px rgb(0 0 0 / .6), inset 0 0 0 2px rgb(255 255 255 / .1); }
  .phone img { width: 100%; aspect-ratio: 390 / 844; display: block; border-radius: 52px; }
  .window { position: absolute; width: 940px; border-radius: 20px; overflow: hidden; background: #1a1f22; box-shadow: 0 40px 110px rgb(0 0 0 / .6), inset 0 0 0 2px rgb(255 255 255 / .08); }
  .window .bar { height: 40px; display: flex; align-items: center; gap: 9px; padding: 0 16px; background: #23292d; }
  .window .bar i { width: 11px; height: 11px; border-radius: 50%; background: #3b454b; }
  .window .bar span { margin-left: 14px; padding: 5px 14px; border-radius: 99px; background: #161b1e; font: 500 15px Inter; color: #93a19c; }
  .window img { display: block; width: 100%; }
  .brand { position: absolute; left: 90px; bottom: 64px; display: flex; align-items: center; gap: 12px; font: 700 28px 'Inter Display', Inter; z-index: 20; }
  .brand svg { width: 40px; height: 40px; }
  .count { position: absolute; right: 90px; bottom: 70px; font: 600 22px Inter; color: #b9c5c1; z-index: 20; }
  .swipe { position: absolute; right: 90px; bottom: 60px; display: flex; align-items: center; gap: 12px; padding: 14px 24px; border-radius: 99px; background: #36d6a1; color: #05140e; font: 800 26px Inter; z-index: 20; }
  .fade { position: absolute; left: 0; right: 0; bottom: 0; height: 260px; background: linear-gradient(to top, #0a0f11 25%, transparent); z-index: 15; }
  .end { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; padding: 90px; }
  .end .mark svg { width: 150px; height: 150px; filter: drop-shadow(0 26px 60px rgb(25 199 154 / .4)); }
  .end h1 { font-size: 92px; margin-top: 28px; }
  .steps { margin: 44px auto 0; display: grid; gap: 18px; text-align: left; width: 760px; }
  .steps div { display: flex; align-items: center; gap: 22px; padding: 22px 28px; border-radius: 24px; background: rgb(255 255 255 / .06); border: 1px solid rgb(255 255 255 / .12); font: 600 34px Inter; }
  .steps b { flex: none; width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; background: #36d6a1; color: #05140e; font: 800 28px Inter; }
  .url { margin-top: 40px; font: 600 34px 'JetBrains Mono', monospace; color: #e3ece9; }
  .ask { margin-top: 22px; font: 500 28px Inter; color: #b9c5c1; }
`;

const arrow = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

function slideHtml(s, i, n, w = 1080, h = 1350) {
  if (s.end)
    return `<style>${css(w, h)}</style><div class="end"><div>
      <div class="mark">${ICON}</div>
      <h1>Get your own copy</h1>
      <div class="steps">
        <div><b>1</b>Fork the repo on GitHub</div>
        <div><b>2</b>Deploy it to Vercel in one click</div>
        <div><b>3</b>Open it on your phone and train</div>
      </div>
      <div class="url">github.com/S2K7x/Banzir</div>
      <div class="ask">Save this for your next training block.</div>
    </div></div>`;
  return `<style>${css(w, h)}</style>
    <div class="copy"><div class="kicker">${s.kicker}</div><h1>${s.title}</h1><div class="sub">${s.sub}</div></div>
    ${s.stage}
    <div class="fade"></div>
    <div class="brand">${ICON}<span>Banzir</span></div>
    ${s.swipe ? `<div class="swipe">Swipe ${arrow}</div>` : `<div class="count">${i + 1} / ${n}</div>`}`;
}

const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
for (const [i, s] of SLIDES.entries()) {
  await page.setContent(slideHtml(s, i, SLIDES.length));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}${s.file}.jpg`, type: 'jpeg', quality: 92 });
}

// Reel cover, 9:16: the cover slide with room for Instagram's interface at the top and bottom.
await page.setViewportSize({ width: 1080, height: 1920 });
const cover = { ...SLIDES[0], swipe: false, stage: phone(stills.today, 'left:50%;top:820px;width:600px;transform:translateX(-50%) rotate(-4deg)') };
await page.setContent(slideHtml(cover, 0, 1, 1080, 1920).replace('<div class="count">1 / 1</div>', '').replace('top: 96px', 'top: 330px'));
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: `${OUT}reel-cover.jpg`, type: 'jpeg', quality: 92 });

await browser.close();
console.log(`wrote ${SLIDES.length} slides and a Reel cover to ${OUT}`);
