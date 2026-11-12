// The AI coach with an OpenAI-compatible provider through the /api/llm relay (mocked).
// Run with the app served on BASE_URL (default http://localhost:4173/); see e2e/run.mjs.
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const out = process.argv[2] || require('node:os').tmpdir();
require('node:fs').mkdirSync(out, { recursive: true });
const chunks = (list) => list.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  const seen = [];
  await page.route('**/api/llm', async (route) => {
    const req = route.request();
    const h = req.headers();
    seen.push({ target: h['x-banzir-target'], auth: h.authorization, body: req.postData() ? JSON.parse(req.postData()) : null });
    if (req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'models/gemini-test' }] }) });
    const body = JSON.parse(req.postData());
    const last = body.messages[body.messages.length - 1];
    if (last.role !== 'tool') {
      return route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: chunks([
          { choices: [{ delta: { content: 'Checking your ' } }] },
          { choices: [{ delta: { content: 'progress.' } }] },
          { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'get_stats', arguments: '{"wee' }, extra_content: { google: { thought_signature: 'SIG' } } }] } }] },
          { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'ks":4}' } }] } }] },
          { choices: [{ delta: {}, finish_reason: 'tool_calls' }] },
        ]),
      });
    }
    return route.fulfill({ status: 200, contentType: 'text/event-stream', body: chunks([{ choices: [{ delta: { content: 'You have not logged a workout yet. Start with **Full body A** today.' }, finish_reason: 'stop' }] }]) });
  });
  const click = (name) => page.locator('button', { hasText: name }).first().click({ timeout: 8000 });
  await page.goto(BASE);
  for (const n of ['Continue', 'Continue', 'Continue', 'Continue', 'Continue', 'Continue', 'Use this plan', 'Continue', 'Start training']) { await click(n); await page.waitForTimeout(100); }
  await page.waitForSelector('text=This week');
  await page.locator('nav.tabbar button', { hasText: 'Coach' }).click();
  await click('Google Gemini');
  await page.locator('input[type=password]').fill('AIza-test');
  await click('Connect'); await page.waitForSelector('text=Use this model');
  if ((await page.locator('select').inputValue()) !== 'gemini-test') throw new Error('model list not cleaned');
  await click('Use this model');
  await page.getByLabel('Message to the coach').fill('How am I doing?');
  await page.getByLabel('Send').click();
  await page.waitForSelector('text=Start with', { timeout: 15000 });
  await page.screenshot({ path: `${out}/01-gemini.png` });
  const posts = seen.filter((s) => s.body);
  if (!seen[0].target.startsWith('https://generativelanguage.googleapis.com/v1beta/openai/models')) throw new Error('models target ' + seen[0].target);
  if (posts[0].auth !== 'Bearer AIza-test') throw new Error('auth header');
  if (!posts[0].target.endsWith('/chat/completions')) throw new Error('chat target');
  if (posts[0].body.messages[0].role !== 'system') throw new Error('system message');
  if (posts[0].body.tools[0].type !== 'function') throw new Error('tool format');
  if (JSON.stringify(posts[0].body.tools).includes('additionalProperties')) throw new Error('schema not portable');
  const replay = posts[1].body.messages.find((m) => m.role === 'assistant');
  if (replay.tool_calls[0].extra_content?.google?.thought_signature !== 'SIG') throw new Error('thought signature not replayed: ' + JSON.stringify(replay));
  if (replay.tool_calls[0].function.arguments !== '{"weeks":4}') throw new Error('arguments not reassembled');
  const toolMsg = posts[1].body.messages.find((m) => m.role === 'tool');
  if (toolMsg.tool_call_id !== 'call_1' || !toolMsg.content.includes('weeklyTarget')) throw new Error('tool result');
  console.log('openai-compatible via relay ok, errors:', JSON.stringify(errors));
  if (errors.length) process.exitCode = 1;
  await browser.close();
})().catch((e) => { console.error('FLOW FAILED', e.message); process.exit(1); });
