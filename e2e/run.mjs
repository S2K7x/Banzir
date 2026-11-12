// Runs every browser test in e2e/ against a served build, one after another.
// Usage: npm run build && npm run e2e
// Starts `vite preview` on a free port unless BASE_URL is set.
// Screenshots go to e2e/output/<test>/ (ignored by git).
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { createServer } from 'node:net';

const only = process.argv.slice(2);
const dir = new URL('.', import.meta.url).pathname;
const tests = readdirSync(dir)
  .filter((f) => f.endsWith('.cjs'))
  .map((f) => f.replace('.cjs', ''))
  .filter((t) => !only.length || only.includes(t));

const freePort = () =>
  new Promise((res) => {
    const s = createServer().listen(0, () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });

let server;
let base = process.env.BASE_URL;
if (!base) {
  const port = await freePort();
  base = `http://localhost:${port}/`;
  server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}

const run = (t) =>
  new Promise((res) => {
    const started = Date.now();
    const child = spawn(process.execPath, [`${dir}${t}.cjs`, `${dir}output/${t}`], { env: { ...process.env, BASE_URL: base } });
    let log = '';
    child.stdout.on('data', (d) => (log += d));
    child.stderr.on('data', (d) => (log += d));
    child.on('close', (code) => res({ t, ok: code === 0, seconds: Math.round((Date.now() - started) / 100) / 10, log }));
  });

let failed = 0;
for (const t of tests) {
  const r = await run(t);
  console.log(`${r.ok ? 'pass' : 'FAIL'}  ${t.padEnd(14)} ${r.seconds} s`);
  if (!r.ok) {
    failed++;
    console.log(r.log.split('\n').slice(-25).join('\n'));
  }
}
server?.kill();
console.log(`\n${tests.length - failed} of ${tests.length} passed.`);
process.exit(failed ? 1 : 0);
