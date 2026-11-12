import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { relay } from '../../../api/llm';
import { getTemplate } from '../../data/templates';
import { activateProgram, db, getState, setState } from '../db';
import { EQUIPMENT } from '../constants';
import { instantiate } from '../matcher';
import type { Profile } from '../schema';
import { closeOpenCalls, runTurn, setProposalStatus, upgradeChat } from './agent';
import { PROMPT_VERSION } from './prompt';
import { sseEvents, toAnthropicMessages, toOpenAIMessages } from './providers';
import { getMemory, newChat } from './store';
import { acceptProposal, applyChanges, buildProgram, runTool, TOOL_SPECS } from './tools';
import type { Chat, CoachConfig, CoachMessage, Completion, CompletionRequest } from './types';

const profile: Profile = {
  id: 'me',
  name: 'Sam',
  goal: 'muscle',
  level: 'intermediate',
  equipment: [...EQUIPMENT],
  daysPerWeek: 4,
  sessionMinutes: 60,
  flags: [],
  ability: {},
  createdAt: '2026-01-01T00:00:00Z',
};

const config: CoachConfig = { provider: 'anthropic', apiKey: 'test', model: 'claude-opus-5-5' };

async function seed() {
  await db.delete();
  await db.open();
  await db.profile.put(profile);
  await activateProgram(instantiate(getTemplate('mus-4-upperlower')!, profile).program);
}

const program = async () => (await db.programs.get((await getState())!.programId))!;
const firstItem = async () => (await program()).phases[0].days[0].blocks.find((b) => b.type === 'main')!.items[0];

describe('relay', () => {
  const req = (target: string, init: RequestInit = {}) => new Request('http://localhost/api/llm', { method: 'POST', body: '{}', ...init, headers: { 'x-banzir-target': target, authorization: 'Bearer k', cookie: 'secret=1', ...(init.headers ?? {}) } });

  it('forwards only to allow-listed provider endpoints', async () => {
    const calls: [string, RequestInit][] = [];
    const fake = (async (url: string, init: RequestInit) => {
      calls.push([url, init]);
      return new Response('data: {}\n\n', { status: 200, headers: { 'content-type': 'text/event-stream' } });
    }) as unknown as typeof fetch;

    const ok = await relay(req('https://api.openai.com/v1/chat/completions'), fake);
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-type')).toBe('text/event-stream');
    const sent = new Headers(calls[0][1].headers);
    expect(sent.get('authorization')).toBe('Bearer k');
    expect(sent.get('cookie')).toBeNull();

    expect((await relay(req('https://evil.example.com/v1/chat/completions'), fake)).status).toBe(403);
    expect((await relay(req('http://api.openai.com/v1/chat/completions'), fake)).status).toBe(403);
    expect((await relay(req('https://api.openai.com/v1/files'), fake)).status).toBe(403);
    expect((await relay(req('https://api.openai.com:8443/v1/models'), fake)).status).toBe(403);
    expect((await relay(req('not a url'), fake)).status).toBe(400);
    expect((await relay(req('https://api.openai.com/v1/models', { method: 'DELETE', body: undefined }), fake)).status).toBe(405);
    expect((await relay(req('https://api.openai.com/v1/chat/completions', { body: 'x'.repeat(3 * 1024 * 1024) }), fake)).status).toBe(413);
    expect(calls).toHaveLength(1);
  });
});

describe('wire formats', () => {
  const msgs: CoachMessage[] = [
    { id: 'u1', role: 'user', text: 'Hi', context: 'Today: Monday', at: '' },
    {
      id: 'a1',
      role: 'assistant',
      text: 'Let me look.',
      toolCalls: [{ id: 'c1', name: 'get_stats', input: {} }],
      native: { format: 'anthropic', data: [{ type: 'thinking', thinking: '', signature: 's' }, { type: 'text', text: 'Let me look.' }, { type: 'tool_use', id: 'c1', name: 'get_stats', input: {} }] },
      epoch: 0,
      stop: 'tool_use',
      at: '',
    },
    { id: 't1', role: 'tool', results: [{ id: 'c1', name: 'get_stats', content: '{}' }], at: '' },
  ];

  it('replays Claude turns unchanged in the same epoch and without thinking after a summary', () => {
    const same = toAnthropicMessages(msgs, undefined, 0);
    expect(same[0].content).toEqual([{ type: 'text', text: '<app_context>\nToday: Monday\n</app_context>' }, { type: 'text', text: 'Hi' }]);
    expect((same[1].content as { type: string }[]).map((b) => b.type)).toEqual(['thinking', 'text', 'tool_use']);
    expect(same[2]).toEqual({ role: 'user', content: [{ type: 'tool_result', tool_use_id: 'c1', content: '{}', is_error: undefined }] });

    const later = toAnthropicMessages(msgs, 'Earlier: goal is muscle.', 1);
    expect((later[1].content as { type: string }[]).map((b) => b.type)).toEqual(['text', 'tool_use']);
    expect((later[0].content as { text: string }[])[0].text).toContain('<conversation_summary>');
  });

  it('rebuilds turns from another provider for OpenAI-compatible servers', () => {
    const out = toOpenAIMessages('SYSTEM', msgs, undefined);
    expect(out[0]).toEqual({ role: 'system', content: 'SYSTEM' });
    expect(out[2]).toEqual({ role: 'assistant', content: 'Let me look.', tool_calls: [{ id: 'c1', type: 'function', function: { name: 'get_stats', arguments: '{}' } }] });
    expect(out[3]).toEqual({ role: 'tool', tool_call_id: 'c1', content: '{}' });
  });

  it('parses server-sent events split across chunks', async () => {
    const parts = ['data: {"a":1}\n\ndata: {"b"', ':2}\n\n: keep-alive\n\ndata: [DONE]\n\n', 'data: {"c":3}\n\n'];
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        for (const p of parts) c.enqueue(new TextEncoder().encode(p));
        c.close();
      },
    });
    const seen = [];
    for await (const e of sseEvents(body)) seen.push(e);
    expect(seen).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('exposes every tool with an object schema', () => {
    expect(TOOL_SPECS.length).toBeGreaterThanOrEqual(13);
    for (const t of TOOL_SPECS) {
      expect(t.schema.type, t.name).toBe('object');
      expect(t.schema.$schema).toBeUndefined();
    }
  });
});

describe('tools and proposals', () => {
  beforeEach(seed);

  it('reads the plan with ids the model can use', async () => {
    const r = await runTool({ id: '1', name: 'get_program', input: {} }, { proposals: [] });
    const body = JSON.parse(r.content);
    expect(body.name).toBe('Upper / Lower');
    expect(body.days[0].items[0]).toHaveProperty('itemId');
    expect(body.days[0].items[0]).toHaveProperty('exerciseId');
  });

  it('rejects bad input and unknown ids with a message the model can act on', async () => {
    const bad = await runTool({ id: '1', name: 'get_recent_sessions', input: { limit: 99 } }, { proposals: [] });
    expect(bad.isError).toBe(true);
    const unknown = await runTool({ id: '2', name: 'propose_program_change', input: { summary: 'x y z', changes: [{ op: 'swap_exercise', itemId: 'nope', exerciseId: 'pullup' }] } }, { proposals: [] });
    expect(unknown.isError).toBe(true);
    expect(unknown.content).toContain('get_program');
  });

  it('proposes a change without applying it, and applies it on acceptance', async () => {
    const item = await firstItem();
    const ctx = { proposals: [] as never[] };
    const r = await runTool(
      { id: '1', name: 'propose_program_change', input: { summary: 'Lighter pressing for the shoulder', changes: [{ op: 'set_dose', itemId: item.id, sets: 3, repsMin: 8, repsMax: 12 }] } },
      ctx,
    );
    expect(r.isError).toBeUndefined();
    expect(ctx.proposals).toHaveLength(1);
    expect((await firstItem()).prescription).toEqual(item.prescription);

    await acceptProposal(ctx.proposals[0]);
    expect((await firstItem()).prescription).toMatchObject({ sets: 3, reps: [8, 12] });
    expect((await program()).source).toBe('user');
  });

  it('builds a complete new plan and a plan switch from proposals', async () => {
    const { program: p, lines } = buildProgram(
      {
        name: 'Garage plan',
        goal: 'strength',
        daysPerWeek: 2,
        days: [
          { name: 'Day A', exercises: [{ exerciseId: 'back_squat', sets: 5, repsMin: 5, repsMax: 5 }, { exerciseId: 'plank', holdMin: 30, holdMax: 45 }] },
          { name: 'Day B', exercises: [{ exerciseId: 'deadlift' }] },
        ],
      },
      profile,
    );
    expect(p.phases[0].days.map((d) => d.name)).toEqual(['Day A', 'Day B']);
    expect(lines[0]).toContain('Back squat 5 × 5');
    expect(lines[0]).toContain('Plank 3 × 30-45 s');
    expect(() => buildProgram({ name: 'x', goal: 'muscle', daysPerWeek: 1, days: [{ name: 'A', exercises: [{ exerciseId: 'made_up' }] }] }, profile)).toThrow(/search_exercises/);

    await acceptProposal({ id: 'p', kind: 'plan_switch', title: '', lines: [], payload: 'str-4-undulating', status: 'pending' });
    expect((await program()).templateId).toBe('str-4-undulating');
  });

  it('moves a whole ladder step at once', async () => {
    await activateProgram(instantiate(getTemplate('cal-planche')!, { ...profile, goal: 'calisthenics', equipment: ['pullup_bar'] }).program);
    const p = await program();
    const tuck = p.phases[0].days.flatMap((d) => d.blocks.flatMap((b) => b.items)).find((i) => i.exerciseId === 'tuck_planche')!;
    const { program: next, lines } = applyChanges(p, [{ op: 'swap_exercise', itemId: tuck.id, exerciseId: 'adv_tuck_planche', everywhere: true }]);
    expect(lines[0]).toContain('everywhere');
    expect(JSON.stringify(next)).not.toContain('"tuck_planche"');
  });

  it('saves and forgets memory notes', async () => {
    const saved = JSON.parse((await runTool({ id: '1', name: 'save_memory', input: { text: 'Left shoulder hurts on overhead pressing.' } }, { proposals: [] })).content);
    expect((await getMemory()).map((n) => n.id)).toEqual([saved.saved]);
    await runTool({ id: '2', name: 'forget_memory', input: { id: saved.saved } }, { proposals: [] });
    expect(await getMemory()).toEqual([]);
  });

  it('a lighter-week proposal marks the current week', async () => {
    await acceptProposal({ id: 'p', kind: 'lighter_week', title: '', lines: [], payload: null, status: 'pending' });
    expect((await getState())!.lightWeek).toBe(0);
    await setState({ ...(await getState())!, lightWeek: undefined });
  });
});

describe('agent loop', () => {
  beforeEach(seed);

  /** A scripted model: each call returns the next completion. */
  const scripted = (steps: Completion[]) => {
    const requests: CompletionRequest[] = [];
    const fn = async (_c: CoachConfig, r: CompletionRequest) => {
      requests.push(r);
      const next = steps.shift()!;
      r.onText?.(next.text);
      return next;
    };
    return { fn, requests };
  };

  it('runs tools, attaches proposals and ends with the answer', async () => {
    const item = await firstItem();
    const { fn, requests } = scripted([
      { text: 'Checking.', toolCalls: [{ id: 'c1', name: 'get_program', input: {} }], stop: 'tool_use' },
      { text: '', toolCalls: [{ id: 'c2', name: 'propose_program_change', input: { summary: 'Fewer sets', changes: [{ op: 'set_dose', itemId: item.id, sets: 2 }] } }], stop: 'tool_use' },
      { text: 'I suggested fewer sets.', toolCalls: [], stop: 'end' },
    ]);
    const updates: string[] = [];
    const chat = await runTurn({ config, chat: newChat(PROMPT_VERSION), text: 'My shoulder is tired', onUpdate: (_c, s) => updates.push(s), completeFn: fn, context: async () => 'CTX' });

    expect(chat.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'assistant', 'tool', 'assistant']);
    expect((chat.messages[0] as { context?: string }).context).toBe('CTX');
    const proposals = chat.messages.flatMap((m) => (m.role === 'assistant' ? (m.proposals ?? []) : []));
    expect(proposals).toHaveLength(1);
    expect(requests[2].messages).toHaveLength(5);
    expect(updates).toContain('Checking.');

    // The same context is not sent twice.
    const again = await runTurn({ config, chat, text: 'Thanks', onUpdate: () => {}, completeFn: scripted([{ text: 'Any time.', toolCalls: [], stop: 'end' }]).fn, context: async () => 'CTX' });
    expect((again.messages[6] as { context?: string }).context).toBeUndefined();

    const decided = setProposalStatus(again, proposals[0].id, 'accepted');
    expect(decided.messages.flatMap((m) => (m.role === 'assistant' ? (m.proposals ?? []) : []))[0].status).toBe('accepted');
  });

  it('never runs the tools of a cut-off answer and keeps the conversation well formed', async () => {
    const { fn } = scripted([{ text: '', toolCalls: [{ id: 'c1', name: 'save_memory', input: { text: 'half' } }], stop: 'max_tokens' }]);
    const chat = await runTurn({ config, chat: newChat(PROMPT_VERSION), text: 'Remember this', onUpdate: () => {}, completeFn: fn, context: async () => 'CTX' });
    expect(await getMemory()).toEqual([]);
    const last = chat.messages[chat.messages.length - 1];
    expect(last.role).toBe('tool');
  });

  it('summarises long histories and drops thinking from the kept turns', async () => {
    const requests: CompletionRequest[] = [];
    let summaries = 0;
    const fn = async (_c: CoachConfig, r: CompletionRequest): Promise<Completion> => {
      requests.push(r);
      if (r.system.startsWith('You summarise')) return { text: `- Summary ${++summaries}`, toolCalls: [], stop: 'end' };
      return { text: 'ok', toolCalls: [], stop: 'end' };
    };
    let chat: Chat = newChat(PROMPT_VERSION);
    const long = 'x'.repeat(4000);
    for (let i = 0; i < 25; i++) chat = await runTurn({ config, chat, text: `${i} ${long}`, onUpdate: () => {}, completeFn: fn, context: async () => 'CTX' });

    expect(summaries).toBeGreaterThan(0);
    expect(chat.summary).toBe(`- Summary ${summaries}`);
    expect(chat.cut).toBeGreaterThan(0);
    expect(chat.epoch).toBe(summaries);
    const last = requests[requests.length - 1];
    expect(last.summary).toBe(chat.summary);
    expect(last.messages[0].role).toBe('user');
    // What is sent stays under the trigger plus the kept turns.
    expect(last.messages.length).toBeLessThan(chat.messages.length);
    // The full history is still kept for display.
    expect(chat.messages.filter((m) => m.role === 'user')).toHaveLength(25);
  });

  it('closes unanswered tool calls and upgrades old conversations', () => {
    const open: Chat = { ...newChat('old'), messages: [{ id: 'a', role: 'assistant', text: '', toolCalls: [{ id: 'c', name: 'get_stats', input: {} }], epoch: 0, stop: 'tool_use', at: '' }] };
    expect(closeOpenCalls(open, 'Stopped').messages[1]).toMatchObject({ role: 'tool', results: [{ id: 'c', isError: true }] });
    expect(upgradeChat(open)).toMatchObject({ promptVersion: PROMPT_VERSION, epoch: 1 });
  });
});
