// The AI coach with Claude (mocked): setup, streaming, tools, a plan proposal and memory.
// Run with the app served on BASE_URL (default http://localhost:4173/); see e2e/run.mjs.
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const out = process.argv[2] || require('node:os').tmpdir();
require('node:fs').mkdirSync(out, { recursive: true });
const sse = (events) => events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('');
const message = (blocks, stop) => {
  const ev = [{ type: 'message_start', message: { id: 'msg_' + Math.random().toString(36).slice(2), type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 1 } } }];
  blocks.forEach((b, index) => {
    if (b.type === 'text') {
      ev.push({ type: 'content_block_start', index, content_block: { type: 'text', text: '' } });
      for (const piece of b.text.match(/.{1,12}/gs)) ev.push({ type: 'content_block_delta', index, delta: { type: 'text_delta', text: piece } });
    } else if (b.type === 'thinking') {
      ev.push({ type: 'content_block_start', index, content_block: { type: 'thinking', thinking: '', signature: '' } });
      ev.push({ type: 'content_block_delta', index, delta: { type: 'signature_delta', signature: 'sig123' } });
    } else {
      ev.push({ type: 'content_block_start', index, content_block: { type: 'tool_use', id: b.id, name: b.name, input: {} } });
      ev.push({ type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: JSON.stringify(b.input) } });
    }
    ev.push({ type: 'content_block_stop', index });
  });
  ev.push({ type: 'message_delta', delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: 30 } });
  ev.push({ type: 'message_stop' });
  return sse(ev);
};
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  const bodies = [];
  const headers = [];
  await page.route('https://api.anthropic.com/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (req.url().includes('/v1/models')) {
      return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ data: [{ id: 'claude-opus-5-5', type: 'model', display_name: 'Claude Opus 5.5', created_at: '2026-10-01T00:00:00Z' }, { id: 'claude-haiku-5-5', type: 'model', display_name: 'Claude Haiku 5.5', created_at: '2026-10-01T00:00:00Z' }], has_more: false, first_id: 'claude-opus-5-5', last_id: 'claude-haiku-5-5' }) });
    }
    const body = JSON.parse(req.postData());
    bodies.push(body);
    headers.push(req.headers());
    const last = body.messages[body.messages.length - 1];
    const results = Array.isArray(last.content) ? last.content.filter((c) => c.type === 'tool_result') : [];
    let reply;
    if (!results.length) {
      reply = message([{ type: 'thinking' }, { type: 'text', text: 'Let me look at your plan first.' }, { type: 'tool_use', id: 'toolu_1', name: 'get_program', input: {} }], 'tool_use');
    } else if (results[0].tool_use_id === 'toolu_1') {
      const plan = JSON.parse(results[0].content);
      const press = plan.days.flatMap((d) => d.items).find((i) => i.exerciseId === 'overhead_press' || i.exerciseId === 'db_shoulder_press') || plan.days[0].items[1];
      reply = message([
        { type: 'text', text: 'Here is a gentler option for the shoulder.' },
        { type: 'tool_use', id: 'toolu_2', name: 'propose_program_change', input: { summary: 'Swap overhead pressing for landmine press while the shoulder settles', changes: [{ op: 'swap_exercise', itemId: press.itemId, exerciseId: 'landmine_press' }] } },
        { type: 'tool_use', id: 'toolu_3', name: 'save_memory', input: { text: 'Shoulder pain on overhead pressing (November 2026).' } },
      ], 'tool_use');
    } else {
      reply = message([{ type: 'text', text: 'I proposed a **landmine press** instead. If the pain is sharp or lasts into the next day:\n\n- stop the exercise\n- see a physiotherapist' }], 'end_turn');
    }
    return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'text/event-stream' }, body: reply });
  });

  const shot = async (n) => { await page.waitForTimeout(300); await page.screenshot({ path: `${out}/${n}.png` }); };
  const click = (name) => page.locator('button', { hasText: name }).first().click({ timeout: 8000 });
  const text = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  const expect = async (needle) => { if (!(await text()).includes(needle)) throw new Error(`expected "${needle}"`); };
  const tab = async (t) => { await page.locator('nav.tabbar button', { hasText: t }).click(); await page.waitForTimeout(400); };

  await page.goto(BASE);
  await click('Continue'); await click('Build muscle'); await click('Continue'); await click('Intermediate'); await click('Continue');
  await click('Continue'); await page.locator('.seg button', { hasText: /^4$/ }).click(); await page.locator('.seg button', { hasText: /^60$/ }).click(); await click('Continue');
  await click('Continue'); await click('Use this plan'); await click('Continue'); await click('Start training');
  await page.waitForSelector('text=This week');
  await click('Set up your AI coach');
  await page.waitForSelector('text=Your own AI coach'); await shot('01-setup');
  await page.locator('input[type=password]').fill('sk-ant-test');
  await click('Connect');
  await page.waitForSelector('text=Use this model');
  const selected = await page.locator('select').inputValue();
  if (selected !== 'claude-opus-5-5') throw new Error('default model should be claude-opus-5-5, got ' + selected);
  await shot('02-model'); await click('Use this model');
  await page.waitForSelector('text=Some ideas'); await shot('03-empty-chat');
  await click('My shoulder hurts on presses');
  await page.waitForSelector('text=Accept', { timeout: 15000 });
  await page.waitForSelector('text=see a physiotherapist');
  await expect('Looked at your plan'); await expect('Saved a note to memory'); await shot('04-proposal');

  // Request checks: browser access header, cached frozen system prompt, eager tool input, fallbacks, thinking replayed.
  const h = headers[0];
  if (h['anthropic-dangerous-direct-browser-access'] !== 'true') throw new Error('missing direct browser access header');
  if (h['x-api-key'] !== 'sk-ant-test' && h.authorization !== 'Bearer sk-ant-test') throw new Error('missing key header');
  if (!String(h['anthropic-beta']).includes('server-side-fallback-2026-07-01')) throw new Error('missing fallback beta');
  if (bodies[0].fallbacks !== 'default') throw new Error('fallbacks not default');
  if (bodies[0].model !== 'claude-opus-5-5') throw new Error('model');
  if (bodies[0].system[0].cache_control?.type !== 'ephemeral') throw new Error('system not cached');
  if (!bodies[0].tools.every((t) => t.eager_input_streaming === true)) throw new Error('eager input streaming missing');
  if (bodies[0].output_config?.effort !== 'medium') throw new Error('effort missing');
  if (JSON.stringify(bodies[0].system) !== JSON.stringify(bodies[2].system)) throw new Error('system prompt changed between requests');
  if (!bodies[1].messages[1].content.some((b) => b.type === 'thinking' && b.signature === 'sig123')) throw new Error('thinking block not replayed');
  if (!bodies[0].messages[0].content[0].text.startsWith('<app_context>')) throw new Error('context not sent');

  await click('Accept');
  await page.waitForSelector('text=Accepted and applied.'); await shot('05-accepted');
  await tab('Program');
  await expect('Landmine press'); await expect('Customised');
  await tab('Coach');
  await page.getByLabel('Coach settings').click();
  await page.waitForSelector('text=What the coach remembers');
  await expect('Shoulder pain on overhead pressing'); await shot('06-settings');
  await page.getByLabel(/^Forget: Shoulder pain/).click();
  await page.waitForSelector('text=Nothing yet');
  await page.locator('.sheet').getByLabel('Close').click();

  // The next message tells the model about the accepted proposal, and the context is not repeated.
  await page.getByLabel('Message to the coach').fill('Thanks!');
  await page.getByLabel('Send').click();
  await page.waitForTimeout(1200);
  const thanks = bodies.find((b) => JSON.stringify(b.messages[b.messages.length - 1]).includes('Thanks!'));
  const lastText = JSON.stringify(thanks.messages[thanks.messages.length - 1]);
  if (!lastText.includes('accepted and applied')) throw new Error('decision not passed to the model: ' + lastText.slice(0, 300));
  await shot('07-after');

  // A backup must not contain the key.
  await tab('Profile');
  const [dl] = await Promise.all([page.waitForEvent('download'), click('Save a backup')]);
  const file = `${out}/backup.json`; await dl.saveAs(file);
  const backup = require('fs').readFileSync(file, 'utf8');
  if (backup.includes('sk-ant-test')) throw new Error('API key leaked into the backup');
  console.log('requests:', bodies.length, 'errors:', JSON.stringify(errors));
  if (errors.length) process.exitCode = 1;
  await browser.close();
})().catch((e) => { console.error('FLOW FAILED', e.message); process.exit(1); });
