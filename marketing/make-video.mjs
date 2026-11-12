// Renders the Banzir presentation video from the real app.
// Usage: npm run build && npx vite preview --port 4173 &
//        node marketing/make-video.mjs [--format landscape|portrait] [--out file.mp4]
// landscape: 1920x1080, about 47 s (README, YouTube, X, LinkedIn).
// portrait:  1080x1920, about 36 s (Instagram Reels, TikTok, Shorts).
// Every frame is rendered from the timeline below, then encoded with ffmpeg
// (libx264). Workout, Progress and Coach scenes are captured live from the app,
// so sets get ticked, the rest timer counts down and lists really scroll.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { clicker } from '../scripts/demo.mjs';
import { captureStills, NOW, snap } from './stills.mjs';

const arg = (n, d) => (process.argv.includes(`--${n}`) ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
const FORMAT = arg('format', 'landscape');
const PORTRAIT = FORMAT === 'portrait';
const OUT = arg('out', new URL(`./banzir-${PORTRAIT ? 'reel' : 'presentation'}.mp4`, import.meta.url).pathname);
const FPS = 30;
const W = PORTRAIT ? 1080 : 1920;
const H = PORTRAIT ? 1920 : 1080;
const ICON = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8');

/* ---------- Timeline: [id, seconds]. The Reel runs about 25 % faster. ---------- */
const PACE = PORTRAIT ? 0.78 : 1;
const PLAN = [
  ['hook', 4.2],
  ['plan', 5.6],
  ['workout', 6.6],
  ['progress', 5.2],
  ['coach', 5.6],
  ['modules', 5.4],
  ['themes', 4.6],
  ['devices', 4.6],
  ['end', 5.6],
];
let at = 0;
const SCENES = PLAN.map(([id, d]) => {
  const s = { id, start: at, end: at + d * PACE };
  at += d * PACE;
  return s;
});
const TOTAL = at;

const browser = await chromium.launch();

/* ---------- Stills from the app ---------- */
console.log('capturing stills...');
const { stills, live } = await captureStills(browser);
const click = clicker(live);
const tab = async (t) => {
  await live.locator('nav.tabbar button', { hasText: t }).click();
  await live.waitForTimeout(500);
};

/* ---------- Live scenes: the app is driven while frames are rendered ---------- */
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const clamp = (x) => Math.max(0, Math.min(1, x));
const LIVE = {
  workout: {
    async enter() {
      await click('Start workout');
      await live.waitForSelector('.overlay');
      await click('Mark as done');
      await live.getByRole('button', { name: /^Next/ }).click();
      await live.waitForTimeout(300);
      this.ticked = 0;
    },
    async frame(sec) {
      // The clock moves with the video, so the rest timer really counts down.
      await live.clock.setFixedTime(new Date(NOW.getTime() + sec * 1000));
      const due = sec > 3.6 * PACE ? 2 : sec > 1.4 * PACE ? 1 : 0;
      while (this.ticked < due) {
        this.ticked++;
        await live.getByRole('button', { name: `Set ${this.ticked} not done` }).click();
      }
      await live.waitForTimeout(40);
    },
    async leave() {
      await live.getByLabel('Close workout').click();
      await live.locator('.sheet button', { hasText: 'Discard' }).click();
      await live.clock.setFixedTime(NOW);
      await live.waitForTimeout(300);
    },
  },
  progress: {
    async enter() {
      await tab('Progress');
      this.max = await live.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    },
    async frame(sec, local) {
      await live.evaluate((y) => window.scrollTo(0, y), Math.round(easeInOut(clamp((local - 0.15) / 0.75)) * Math.min(this.max, 1500)));
    },
  },
  coach: {
    async enter() {
      await tab('Coach');
      await live.waitForTimeout(300);
      this.max = await live.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    },
    async frame(sec, local) {
      await live.evaluate((y) => window.scrollTo(0, y), Math.round(easeInOut(clamp((local - 0.2) / 0.6)) * this.max));
    },
  },
};

/* ---------- The composition page ---------- */
const comp = await browser.newPage({ viewport: { width: W, height: H } });
await comp.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
  :root { --accent: #36d6a1; --bg: #0a0f11; }
  * { box-sizing: border-box; margin: 0; }
  body { width: ${W}px; height: ${H}px; overflow: hidden; background: var(--bg); color: #f2f5f4; font-family: Inter, sans-serif; }
  .bg { position: absolute; inset: 0; background:
      radial-gradient(1200px 800px at ${PORTRAIT ? '50% 70%' : '78% 55%'}, rgb(25 199 154 / 0.22), transparent 60%),
      radial-gradient(900px 700px at ${PORTRAIT ? '10% 0%' : '0% 0%'}, rgb(11 59 70 / 0.55), transparent 65%), var(--bg); }
  .grain { position: absolute; inset: 0; opacity: .05; background-image: repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 3px); }
  .brand { position: absolute; ${PORTRAIT ? 'top: 72px; left: 50%; transform: translateX(-50%);' : 'top: 56px; left: 72px;'} display: flex; align-items: center; gap: 14px; font: 700 30px 'Inter Display', Inter, sans-serif; letter-spacing: -0.02em; z-index: 5; }
  .brand svg { width: 44px; height: 44px; }
  .scene { position: absolute; inset: 0; opacity: 0; }
  .copy { position: absolute; ${PORTRAIT ? 'left: 80px; right: 80px; top: 190px; text-align: center;' : 'left: 120px; top: 50%; width: 760px; transform: translateY(-50%);'} }
  .kicker { font: 700 ${PORTRAIT ? 30 : 26}px Inter, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); margin-bottom: 22px; }
  h1 { font: 800 ${PORTRAIT ? 92 : 96}px/1.02 'Inter Display', Inter, sans-serif; letter-spacing: -0.035em; }
  .sub { margin-top: 28px; font: 400 ${PORTRAIT ? 38 : 34}px/1.4 Inter, sans-serif; color: #b6c2be; }
  .word { display: inline-block; }
  .stage { position: absolute; ${PORTRAIT ? 'left: 0; right: 0; bottom: 120px; height: 1180px;' : 'right: 80px; top: 0; bottom: 0; width: 980px;'} }
  .phone { position: absolute; width: ${PORTRAIT ? 500 : 392}px; padding: 12px; border-radius: 60px;
    background: linear-gradient(160deg, #2a3136, #12171a); box-shadow: 0 50px 120px rgb(0 0 0 / .6), inset 0 0 0 2px rgb(255 255 255 / .09); }
  /* The screen keeps the phone's 390:844 shape exactly, so nothing is cropped. */
  .phone img { width: 100%; aspect-ratio: 390 / 844; height: auto; border-radius: 48px; display: block; }
  .window { position: absolute; width: 1240px; border-radius: 22px; overflow: hidden; background: #1a1f22; box-shadow: 0 50px 140px rgb(0 0 0 / .6), inset 0 0 0 2px rgb(255 255 255 / .07); }
  .window .bar { height: 48px; display: flex; align-items: center; gap: 10px; padding: 0 18px; background: #23292d; }
  .window .bar i { width: 13px; height: 13px; border-radius: 50%; background: #3b454b; }
  .window .bar span { margin-left: 18px; padding: 7px 18px; border-radius: 99px; background: #161b1e; font: 500 17px Inter; color: #93a19c; }
  .window img { display: block; width: 100%; }
  .pill { display: inline-block; padding: 12px 22px; border-radius: 99px; background: rgb(255 255 255 / .08); border: 1px solid rgb(255 255 255 / .12); font: 600 ${PORTRAIT ? 28 : 24}px Inter; margin: 6px 4px; }
  .end { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; }
  .end .mark svg { width: ${PORTRAIT ? 190 : 170}px; height: ${PORTRAIT ? 190 : 170}px; filter: drop-shadow(0 30px 60px rgb(25 199 154 / .35)); }
  .end h1 { font-size: ${PORTRAIT ? 120 : 132}px; margin-top: 34px; }
  .end .sub { max-width: ${PORTRAIT ? 860 : 1100}px; margin: 24px auto 0; }
  .cta { margin-top: 46px; display: inline-flex; gap: 18px; align-items: center; padding: 22px 38px; border-radius: 99px; background: var(--accent); color: #05140e; font: 800 ${PORTRAIT ? 36 : 34}px Inter; }
  .url { margin-top: 26px; font: 600 ${PORTRAIT ? 32 : 30}px 'JetBrains Mono', monospace; color: #d8e4e0; }
</style></head><body>
  <div class="bg"></div><div class="grain"></div>
  <div class="brand" id="brand">${ICON}<span>Banzir</span></div>

  <section class="scene" id="hook">
    <div class="copy"><div class="kicker">Free and open source</div><h1 id="hookTitle"></h1><p class="sub">A training plan for your goal, on your own URL. No account, no subscription.</p></div>
    <div class="stage"><div class="phone" id="hookPhone"><img src="${stills.today}"></div></div>
  </section>

  <section class="scene" id="plan">
    <div class="copy"><div class="kicker">Onboarding</div><h1>A plan built for your goal</h1><p class="sub">Muscle, strength, calisthenics, running, fat loss or sport. 35 plans, beginner to advanced.</p></div>
    <div class="stage"><div class="phone" id="planPhone"><img id="planA" src="${stills.goal}"><img id="planB" src="${stills.plan}" style="position:absolute;left:12px;top:12px;width:calc(100% - 24px)"></div></div>
  </section>

  <section class="scene" id="workout">
    <div class="copy"><div class="kicker">Workouts</div><h1>Guided, set by set</h1><p class="sub">Rest timer, last time's numbers and what to lift next time.</p></div>
    <div class="stage"><div class="phone" id="workoutPhone"><img id="liveWorkout"></div></div>
  </section>

  <section class="scene" id="progress">
    <div class="copy"><div class="kicker">Progress</div><h1>Watch every week add up</h1><p class="sub">Sessions, sets per muscle, personal bests, body weight and runs.</p></div>
    <div class="stage"><div class="phone" id="progressPhone"><img id="liveProgress"></div></div>
  </section>

  <section class="scene" id="coach">
    <div class="copy"><div class="kicker">AI coach, optional</div><h1>A coach that reads your log</h1><p class="sub">Bring your own key: Claude, OpenAI, Gemini, OpenRouter, Groq, Mistral or a local model.</p></div>
    <div class="stage"><div class="phone" id="coachPhone"><img id="liveCoach"></div></div>
  </section>

  <section class="scene" id="modules">
    <div class="copy"><div class="kicker">Modules</div><h1>Only what you need</h1><p class="sub"><span class="pill">Food</span><span class="pill">Body weight</span><span class="pill">Running</span><span class="pill">Fasting</span><br>Turn each one on or off.</p></div>
    <div class="stage"><div class="phone" id="modA"><img src="${stills.food}"></div><div class="phone" id="modB"><img src="${stills.fasting}"></div></div>
  </section>

  <section class="scene" id="themes">
    <div class="copy"><div class="kicker">Themes</div><h1>Make it yours</h1><p class="sub">Ten themes, any accent colour, kg or lb, km or mi.</p></div>
    <div class="stage">${stills.themes.map((s, i) => `<div class="phone theme" id="th${i}"><img src="${s}"></div>`).join('')}</div>
  </section>

  <section class="scene" id="devices">
    <div class="copy"><div class="kicker">Everywhere</div><h1>Phone, tablet and desktop</h1><p class="sub">Install it like an app. Works offline.</p></div>
    <div class="stage"><div class="window" id="win"><div class="bar"><i></i><i></i><i></i><span>your-banzir.vercel.app</span></div><img src="${stills.desktop}"></div><div class="phone" id="devPhone"><img src="${stills.today}"></div></div>
  </section>

  <section class="scene" id="end"><div class="end"><div>
    <div class="mark">${ICON}</div>
    <h1>Banzir</h1>
    <p class="sub">Your training data stays on your device. No account. MIT licence.</p>
    <div class="cta">Fork it. Deploy it. Train.</div>
    <div class="url">github.com/S2K7x/Banzir</div>
  </div></div></section>
</body></html>`);
await comp.evaluate(() => document.fonts.ready);

/* Per-frame layout. Everything is a pure function of time, so renders are repeatable. */
await comp.evaluate(
  ({ SCENES, PORTRAIT }) => {
    const $ = (id) => document.getElementById(id);
    const clamp = (x) => Math.max(0, Math.min(1, x));
    const out = (x) => 1 - (1 - x) ** 3;
    const inout = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
    const words = 'Your own workout app.'.split(' ');
    $('hookTitle').innerHTML = words.map((w) => `<span class="word">${w}</span>`).join(' ');
    const FADE = 0.45;
    // Phones sit in the stage: centre and size differ between formats.
    const place = (el, x, y, scale = 1, rot = 0, op = 1) => {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${rot}deg)`;
      el.style.opacity = op;
    };
    const stage = () => {
      const r = document.querySelector('.stage').getBoundingClientRect();
      return { cx: (PORTRAIT ? 1080 : 980) / 2, cy: (PORTRAIT ? 1180 : 1080) / 2, w: r.width };
    };
    const copyIn = (sec, scene) => {
      const c = scene.querySelector('.copy');
      if (!c) return;
      // Text waits for the previous scene to fade, so two titles never overlap.
      const k = scene.id === 'hook' ? 1 : out(clamp((sec - FADE) / 0.6));
      c.style.opacity = k;
      c.style.translate = `0 ${(1 - k) * 40}px`;
    };
    window.render = (t) => {
      for (const s of SCENES) {
        const el = $(s.id);
        const d = s.end - s.start;
        const sec = t - s.start;
        // Each scene fades in from its own start while the previous one fades out over it.
        const vis = sec >= 0 && sec <= d + FADE;
        el.style.display = vis ? 'block' : 'none';
        if (!vis) continue;
        el.style.opacity = clamp(Math.min(s.id === 'hook' ? 1 : sec / FADE, (d + FADE - sec) / FADE));
        el.style.zIndex = sec < FADE ? 2 : 1;
        const p = clamp(sec / d);
        const { cx, cy } = stage();
        copyIn(sec, el);
        if (s.id === 'hook') {
          // The title arrives word by word; the phone rises in.
          el.querySelectorAll('.word').forEach((w, i) => {
            const k = out(clamp((sec - 0.15 - i * 0.18) / 0.45));
            w.style.opacity = k;
            w.style.transform = `translateY(${(1 - k) * 30}px)`;
          });
          const k = out(clamp((sec - 0.3) / 1.1));
          place($('hookPhone'), cx, cy + (1 - k) * 260, 0.94 + 0.06 * k, (1 - k) * 4);
        } else if (s.id === 'plan') {
          place($('planPhone'), cx, cy, 1);
          $('planB').style.opacity = inout(clamp((sec - d * 0.5) / 0.5));
        } else if (s.id === 'workout' || s.id === 'progress' || s.id === 'coach') {
          place($(`${s.id}Phone`), cx, cy, 1 + 0.03 * p);
        } else if (s.id === 'modules') {
          const k = out(clamp(sec / 0.9));
          const dx = PORTRAIT ? 135 : 120;
          place($('modA'), cx - dx * k, cy + 20, 0.86, -5 * k);
          place($('modB'), cx + dx * k, cy - 20, 0.86, 5 * k);
        } else if (s.id === 'themes') {
          const k = out(clamp(sec / 1.2));
          [...el.querySelectorAll('.theme')].forEach((ph, i) => {
            const o = i - 2;
            place(ph, cx + o * (PORTRAIT ? 150 : 128) * k, cy + Math.abs(o) * 30 * k, 0.74 - Math.abs(o) * 0.04, o * 7 * k);
            ph.style.zIndex = 10 - Math.abs(o);
          });
        } else if (s.id === 'devices') {
          const k = out(clamp(sec / 1));
          const win = $('win');
          win.style.left = `${cx}px`;
          win.style.top = `${cy - (PORTRAIT ? 60 : 30)}px`;
          win.style.transform = `translate(-50%, -50%) scale(${PORTRAIT ? 0.78 : 0.72 + 0.03 * k})`;
          win.style.opacity = k;
          place($('devPhone'), cx + (PORTRAIT ? 300 : 330), cy + (PORTRAIT ? 290 : 150) + (1 - k) * 120, PORTRAIT ? 0.62 : 0.56);
        } else if (s.id === 'end') {
          const k = out(clamp(sec / 0.9));
          el.querySelector('.end > div').style.transform = `scale(${0.94 + 0.06 * k})`;
        }
      }
      // The small brand mark hides on the end card, where the big one shows.
      const end = SCENES[SCENES.length - 1];
      $('brand').style.opacity = clamp((end.start - t) / 0.4);
    };
  },
  { SCENES, PORTRAIT },
);

/* ---------- Render and encode ---------- */
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], {
  stdio: ['pipe', 'inherit', 'inherit'],
});
const frames = Math.round(TOTAL * FPS);
let current = null;
console.log(`rendering ${frames} frames (${TOTAL.toFixed(1)} s, ${W}x${H})...`);
for (let f = 0; f < frames; f++) {
  const t = f / FPS;
  const scene = SCENES.find((s) => t >= s.start && t < s.end) ?? SCENES[SCENES.length - 1];
  if (scene !== current) {
    if (current && LIVE[current.id]?.leave) await LIVE[current.id].leave();
    current = scene;
    if (LIVE[scene.id]) await LIVE[scene.id].enter();
  }
  const liveScene = LIVE[scene.id];
  if (liveScene) {
    const sec = t - scene.start;
    await liveScene.frame(sec, sec / (scene.end - scene.start));
    const img = await snap(live);
    await comp.evaluate(
      async ({ id, src }) => {
        const el = document.getElementById(id);
        el.src = src;
        await el.decode();
      },
      { id: `live${scene.id[0].toUpperCase()}${scene.id.slice(1)}`, src: img },
    );
  }
  await comp.evaluate((tt) => window.render(tt), t);
  const buf = await comp.screenshot({ type: 'jpeg', quality: 94 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % 150 === 0) console.log(`  ${f}/${frames}`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
console.log(`wrote ${OUT}`);
