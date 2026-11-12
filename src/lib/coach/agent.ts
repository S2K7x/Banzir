import { uid } from '../matcher';
import { contextSnapshot, PROMPT_VERSION, SYSTEM_PROMPT } from './prompt';
import { complete } from './providers';
import { newChat, saveChat } from './store';
import { runTool, TOOL_SPECS } from './tools';
import { CoachError, type AssistantMessage, type Chat, type CoachConfig, type CoachMessage, type Completion, type CompletionRequest, type Proposal, type ToolMessage } from './types';

/**
 * One coach turn: the person's message, then model calls and tool runs until
 * the model answers without tools. The conversation is saved after every step
 * and always stays well formed (every tool call gets a result).
 */

const MAX_STEPS = 8;
/** Rough size of the history sent each turn before older turns are summarised. */
const SUMMARY_TRIGGER_CHARS = 60_000;
const KEEP_RECENT_TURNS = 4;

type Complete = (config: CoachConfig, request: CompletionRequest) => Promise<Completion>;

export type TurnOptions = {
  config: CoachConfig;
  chat: Chat;
  text: string;
  signal?: AbortSignal;
  /** Called whenever the conversation changes, and with streamed text. */
  onUpdate: (chat: Chat, streaming: string) => void;
  /** Injected in tests. */
  completeFn?: Complete;
  context?: () => Promise<string>;
};

const now = () => new Date().toISOString();

/** A conversation started with an older prompt or tool set keeps going, but without its thinking blocks. */
export function upgradeChat(chat: Chat | undefined): Chat {
  if (!chat) return newChat(PROMPT_VERSION);
  if (chat.promptVersion === PROMPT_VERSION) return chat;
  return { ...chat, promptVersion: PROMPT_VERSION, epoch: chat.epoch + 1 };
}

const size = (m: CoachMessage) => (m.role === 'user' ? m.text.length + (m.context?.length ?? 0) : m.role === 'assistant' ? m.text.length + JSON.stringify(m.toolCalls).length : JSON.stringify(m.results).length);

/** Summarises older turns when the history grows large. Returns the chat unchanged when not needed. */
export async function maybeSummarise(chat: Chat, config: CoachConfig, completeFn: Complete, signal?: AbortSignal): Promise<Chat> {
  const live = chat.messages.slice(chat.cut);
  const total = live.reduce((n, m) => n + size(m), 0) + (chat.summary?.length ?? 0);
  if (total < SUMMARY_TRIGGER_CHARS) return chat;
  // Cut at a person's message so the kept part starts cleanly and no tool call is separated from its result.
  const userIdx = live.map((m, i) => (m.role === 'user' ? i : -1)).filter((i) => i > 0);
  const cutAt = userIdx[Math.max(0, userIdx.length - KEEP_RECENT_TURNS)];
  if (!cutAt) return chat;
  const older = live.slice(0, cutAt);
  const transcript = older
    .map((m) => (m.role === 'user' ? `Person: ${m.text}` : m.role === 'assistant' ? `Coach: ${m.text}${m.toolCalls.length ? ` [used ${m.toolCalls.map((c) => c.name).join(', ')}]` : ''}` : ''))
    .filter(Boolean)
    .join('\n');
  const result = await completeFn(config, {
    system: 'You summarise coaching conversations for the coach to read later.',
    tools: [],
    messages: [
      {
        id: 'sum',
        role: 'user',
        at: now(),
        text: `Summarise this conversation in at most 15 short bullet points: the person's goals, situation, pains or limits, decisions and plan changes accepted or declined, and open questions. Facts only.\n\n${chat.summary ? `Earlier summary:\n${chat.summary}\n\n` : ''}${transcript}`,
      },
    ],
    epoch: 0,
    signal,
  });
  // Turns kept after the summary are replayed without thinking blocks (a new epoch).
  return { ...chat, summary: result.text.trim() || chat.summary, cut: chat.cut + cutAt, epoch: chat.epoch + 1 };
}

/** Gives every unanswered tool call a result, for example after the person pressed stop. */
export function closeOpenCalls(chat: Chat, reason: string): Chat {
  const last = chat.messages[chat.messages.length - 1];
  if (last?.role !== 'assistant' || !last.toolCalls.length) return chat;
  const tool: ToolMessage = { id: uid('t'), role: 'tool', at: now(), results: last.toolCalls.map((c) => ({ id: c.id, name: c.name, content: reason, isError: true })) };
  return { ...chat, messages: [...chat.messages, tool] };
}

export async function runTurn(o: TurnOptions): Promise<Chat> {
  const completeFn = o.completeFn ?? complete;
  let chat = closeOpenCalls(upgradeChat(o.chat), 'Not run: the conversation moved on.');
  const commit = async (next: Chat, streaming = '') => {
    chat = next;
    o.onUpdate(chat, streaming);
    await saveChat(chat);
  };

  const context = await (o.context ?? contextSnapshot)();
  const changed = context !== chat.lastContext;
  await commit({
    ...chat,
    lastContext: context,
    messages: [...chat.messages, { id: uid('u'), role: 'user', text: o.text, context: changed ? context : undefined, at: now() }],
  });

  chat = await maybeSummarise(chat, o.config, completeFn, o.signal);

  for (let step = 0; step < MAX_STEPS; step++) {
    let streamed = '';
    let result: Completion;
    try {
      result = await completeFn(o.config, {
        system: SYSTEM_PROMPT,
        tools: TOOL_SPECS,
        messages: chat.messages.slice(chat.cut),
        summary: chat.summary,
        epoch: chat.epoch,
        signal: o.signal,
        onText: (d) => {
          streamed += d;
          o.onUpdate(chat, streamed);
        },
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError' || o.signal?.aborted) {
        if (streamed) await commit({ ...chat, messages: [...chat.messages, assistant({ text: streamed, toolCalls: [], stop: 'aborted' }, chat.epoch)] });
        else await commit(chat);
        return chat;
      }
      await commit(chat);
      throw e instanceof CoachError ? e : new CoachError(e instanceof Error ? e.message : 'Something went wrong.');
    }

    const msg = assistant(result, chat.epoch);
    // A cut-off or declined answer must never run its tools.
    const runnable = result.stop !== 'max_tokens' && result.stop !== 'refusal' ? result.toolCalls : [];
    if (result.toolCalls.length && !runnable.length) msg.text ||= result.stop === 'refusal' ? 'The model declined this request.' : 'The answer was cut off before it finished.';
    await commit({ ...chat, messages: [...chat.messages, msg] });
    if (!result.toolCalls.length) return chat;

    const proposals: Proposal[] = [];
    const results = [];
    for (const call of result.toolCalls) {
      if (!runnable.length) results.push({ id: call.id, name: call.name, content: 'Not run.', isError: true });
      else results.push(await runTool(call, { proposals }));
    }
    const withProposals = proposals.length ? chat.messages.map((m) => (m.id === msg.id ? { ...msg, proposals } : m)) : chat.messages;
    await commit({ ...chat, messages: [...withProposals, { id: uid('t'), role: 'tool', at: now(), results }] });
    if (!runnable.length) return chat;
    if (o.signal?.aborted) return chat;
  }
  // Too many steps: close the turn politely.
  await commit({ ...chat, messages: [...chat.messages, assistant({ text: 'I stopped here to avoid a long chain of steps. Ask me to continue if you want more.', toolCalls: [], stop: 'other' }, chat.epoch)] });
  return chat;
}

function assistant(r: Pick<Completion, 'text' | 'toolCalls' | 'stop'> & { native?: Completion['native'] }, epoch: number): AssistantMessage {
  return { id: uid('a'), role: 'assistant', text: r.text, toolCalls: r.toolCalls, native: r.native, stop: r.stop, epoch, at: now() };
}

/** Records the person's decision on a proposal card. */
export function setProposalStatus(chat: Chat, proposalId: string, status: Proposal['status'], error?: string): Chat {
  return {
    ...chat,
    messages: chat.messages.map((m) => (m.role === 'assistant' && m.proposals?.some((p) => p.id === proposalId) ? { ...m, proposals: m.proposals.map((p) => (p.id === proposalId ? { ...p, status, error } : p)) } : m)),
  };
}
