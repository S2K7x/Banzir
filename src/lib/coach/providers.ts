import type Anthropic from '@anthropic-ai/sdk';
import { CoachError, type CoachConfig, type CoachMessage, type Completion, type CompletionRequest, type ProviderId, type StopReason, type ToolCall, type WireFormat } from './types';

/**
 * Two wire formats cover every provider:
 * - Claude through the official Anthropic SDK, called directly from the
 *   browser (Anthropic allows it with the direct-browser-access header).
 * - Everything else through the OpenAI-compatible chat completions format.
 *   Providers that block browser calls go through the /api/llm relay.
 */

export type ProviderInfo = {
  label: string;
  format: WireFormat;
  baseUrl: string;
  /** Needs the relay because the provider blocks direct browser calls. */
  relay: boolean;
  defaultModel?: string;
  keyUrl?: string;
  keyHint: string;
};

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  anthropic: {
    label: 'Claude (Anthropic)',
    format: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    relay: false,
    defaultModel: 'claude-opus-5-5',
    keyUrl: 'https://platform.claude.com/settings/keys',
    keyHint: 'Starts with sk-ant-',
  },
  openai: { label: 'OpenAI', format: 'openai', baseUrl: 'https://api.openai.com/v1', relay: true, keyUrl: 'https://platform.openai.com/api-keys', keyHint: 'Starts with sk-' },
  gemini: {
    label: 'Google Gemini',
    format: 'openai',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    relay: true,
    keyUrl: 'https://aistudio.google.com/apikey',
    keyHint: 'From Google AI Studio',
  },
  openrouter: { label: 'OpenRouter', format: 'openai', baseUrl: 'https://openrouter.ai/api/v1', relay: false, keyUrl: 'https://openrouter.ai/keys', keyHint: 'Starts with sk-or-' },
  groq: { label: 'Groq', format: 'openai', baseUrl: 'https://api.groq.com/openai/v1', relay: true, keyUrl: 'https://console.groq.com/keys', keyHint: 'Starts with gsk_' },
  mistral: { label: 'Mistral', format: 'openai', baseUrl: 'https://api.mistral.ai/v1', relay: true, keyUrl: 'https://console.mistral.ai/api-keys', keyHint: 'From the Mistral console' },
  custom: { label: 'Other (OpenAI-compatible)', format: 'openai', baseUrl: '', relay: false, keyHint: 'Optional for local servers such as Ollama' },
};

const baseUrl = (c: CoachConfig) => (c.provider === 'custom' ? (c.baseUrl ?? '').replace(/\/+$/, '') : PROVIDERS[c.provider].baseUrl);

/* ---------- Transport ---------- */

const RELAY_URL = '/api/llm';

async function send(config: CoachConfig, url: string, init: RequestInit): Promise<Response> {
  const info = PROVIDERS[config.provider];
  let response: Response;
  try {
    if (info.relay) {
      const headers = new Headers(init.headers);
      headers.set('x-banzir-target', url);
      response = await fetch(RELAY_URL, { ...init, headers });
      if (response.status === 404 && !response.headers.get('content-type')?.includes('json')) {
        throw new CoachError(`${info.label} cannot be called directly from a browser, and this copy of Banzir has no relay. Deploy it on Vercel (the relay is included), or use Claude or OpenRouter.`, 'relay');
      }
    } else {
      response = await fetch(url, init);
    }
  } catch (e) {
    if (e instanceof CoachError) throw e;
    if ((e as Error).name === 'AbortError') throw e;
    throw new CoachError(config.provider === 'custom' ? 'Could not reach the server. Check the address, and that it allows requests from this site (CORS).' : `Could not reach ${info.label}. Check your connection.`, 'network');
  }
  if (!response.ok) throw await httpError(response, info.label);
  return response;
}

async function httpError(response: Response, label: string): Promise<CoachError> {
  let detail = '';
  try {
    const body = await response.json();
    detail = body?.error?.message ?? body?.message ?? '';
  } catch {
    /* not JSON */
  }
  const suffix = detail ? ` (${String(detail).slice(0, 200)})` : '';
  if (response.status === 401 || response.status === 403) return new CoachError(`${label} rejected the API key${suffix}.`, 'auth');
  if (response.status === 404) return new CoachError(`${label} does not know this model or address${suffix}.`, 'model');
  if (response.status === 429) return new CoachError(`${label} says you are sending too many requests or are out of credit${suffix}.`, 'rate');
  return new CoachError(`${label} returned an error ${response.status}${suffix}.`);
}

/* ---------- Model lists ---------- */

export async function listModels(config: CoachConfig): Promise<string[]> {
  if (PROVIDERS[config.provider].format === 'anthropic') {
    const client = await anthropicClient(config);
    const ids: string[] = [];
    try {
      for await (const model of client.models.list()) ids.push(model.id);
    } catch (e) {
      throw await anthropicError(e);
    }
    return ids;
  }
  const response = await send(config, `${baseUrl(config)}/models`, { headers: authHeaders(config) });
  const body = await response.json();
  const list: { id?: string; name?: string }[] = body?.data ?? body?.models ?? [];
  return list
    .map((m) => String(m.id ?? m.name ?? '').replace(/^models\//, ''))
    .filter(Boolean)
    .sort();
}

/* ---------- Completion ---------- */

export async function complete(config: CoachConfig, request: CompletionRequest): Promise<Completion> {
  return PROVIDERS[config.provider].format === 'anthropic' ? completeAnthropic(config, request) : completeOpenAI(config, request);
}

const userText = (m: Extract<CoachMessage, { role: 'user' }>, summary: string | undefined, first: boolean) =>
  [first && summary ? `<conversation_summary>\n${summary}\n</conversation_summary>` : '', m.context ? `<app_context>\n${m.context}\n</app_context>` : '', m.text].filter(Boolean);

/* ---------- Claude ---------- */

/** Models that accept server-side refusal fallbacks (`fallbacks: "default"`). */
const FALLBACK_MODELS = /^claude-(fable-5-[12]|opus-5(-5)?|sonnet-5-5)$/;
/** Models that take `output_config.effort`. */
const EFFORT_MODELS = /^claude-(fable|mythos|opus|sonnet|haiku)-(5|4-[5-8])/;

let sdk: Promise<typeof import('@anthropic-ai/sdk')> | undefined;

async function anthropicClient(config: CoachConfig) {
  sdk ??= import('@anthropic-ai/sdk');
  const { default: AnthropicClient } = await sdk;
  // The person's own key, used from their own device: this is the "bring your own key" case the option exists for.
  return new AnthropicClient({ apiKey: config.apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
}

async function anthropicError(e: unknown): Promise<unknown> {
  const { default: A } = await (sdk ??= import('@anthropic-ai/sdk'));
  if (e instanceof A.AuthenticationError || e instanceof A.PermissionDeniedError) return new CoachError('Anthropic rejected the API key.', 'auth');
  if (e instanceof A.NotFoundError) return new CoachError('Anthropic does not know this model.', 'model');
  if (e instanceof A.RateLimitError) return new CoachError('Anthropic says you are sending too many requests or are out of credit.', 'rate');
  if (e instanceof A.APIConnectionError) return new CoachError('Could not reach Anthropic. Check your connection.', 'network');
  if (e instanceof A.APIError) return new CoachError(`Anthropic returned an error${e.status ? ` ${e.status}` : ''}: ${e.message.slice(0, 200)}`);
  return e;
}

type ABlock = Anthropic.Beta.BetaContentBlockParam;

/** Converts the neutral conversation to Messages API turns. */
export function toAnthropicMessages(messages: CoachMessage[], summary: string | undefined, epoch: number): Anthropic.Beta.BetaMessageParam[] {
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  messages.forEach((m, i) => {
    if (m.role === 'user') {
      out.push({ role: 'user', content: userText(m, summary, i === 0).map((text) => ({ type: 'text', text }) as ABlock) });
    } else if (m.role === 'assistant') {
      let content: ABlock[];
      if (m.native?.format === 'anthropic') {
        content = m.native.data as ABlock[];
        // After a summary replaced earlier turns, retained turns go back without thinking blocks.
        if (m.epoch < epoch) content = content.filter((b) => b.type !== 'thinking' && b.type !== 'redacted_thinking');
      } else {
        content = [...(m.text ? [{ type: 'text', text: m.text } as ABlock] : []), ...m.toolCalls.map((c) => ({ type: 'tool_use', id: c.id, name: c.name, input: c.input }) as ABlock)];
      }
      if (content.length) out.push({ role: 'assistant', content });
    } else {
      out.push({ role: 'user', content: m.results.map((r) => ({ type: 'tool_result', tool_use_id: r.id, content: r.content, is_error: r.isError }) as ABlock) });
    }
  });
  return out;
}

async function completeAnthropic(config: CoachConfig, req: CompletionRequest): Promise<Completion> {
  const client = await anthropicClient(config);
  const model = config.model;
  const fallback = FALLBACK_MODELS.test(model);
  const params: Anthropic.Beta.MessageCreateParamsStreaming = {
    model,
    max_tokens: 32000,
    stream: true,
    // Frozen for the conversation and marked for caching; changing context arrives as appended user content.
    system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
    tools: req.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.schema as Anthropic.Beta.BetaTool.InputSchema, eager_input_streaming: true })),
    messages: toAnthropicMessages(req.messages, req.summary, req.epoch),
    cache_control: { type: 'ephemeral' },
    ...(EFFORT_MODELS.test(model) ? { output_config: { effort: 'medium' as const } } : {}),
    // Refusal fallbacks route a declined request to another model inside the same call.
    ...(fallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
  };
  const { stream: _s, ...rest } = params;
  void _s;
  let message: Anthropic.Beta.BetaMessage;
  try {
    const stream = client.beta.messages.stream(rest, { signal: req.signal });
    stream.on('text', (delta) => req.onText?.(delta));
    message = await stream.finalMessage();
  } catch (e) {
    throw await anthropicError(e);
  }
  const text = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  const toolCalls: ToolCall[] = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use').map((b) => ({ id: b.id, name: b.name, input: b.input }));
  const stop: StopReason =
    message.stop_reason === 'tool_use' ? 'tool_use' : message.stop_reason === 'max_tokens' ? 'max_tokens' : message.stop_reason === 'refusal' ? 'refusal' : message.stop_reason === 'end_turn' ? 'end' : 'other';
  return { text, toolCalls, native: { format: 'anthropic', data: message.content }, stop };
}

/* ---------- OpenAI-compatible ---------- */

function authHeaders(config: CoachConfig): Record<string, string> {
  const h: Record<string, string> = { 'content-type': 'application/json' };
  if (config.apiKey) h.authorization = `Bearer ${config.apiKey}`;
  if (config.provider === 'openrouter') {
    h['http-referer'] = location.origin;
    h['x-title'] = 'Banzir';
  }
  return h;
}

type OAToolCall = { id: string; type: 'function'; function: { name: string; arguments: string }; [extra: string]: unknown };
type OAMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: OAToolCall[]; [extra: string]: unknown }
  | { role: 'tool'; tool_call_id: string; content: string };

export function toOpenAIMessages(system: string, messages: CoachMessage[], summary: string | undefined): OAMessage[] {
  const out: OAMessage[] = [{ role: 'system', content: system }];
  messages.forEach((m, i) => {
    if (m.role === 'user') out.push({ role: 'user', content: userText(m, summary, i === 0).join('\n\n') });
    else if (m.role === 'assistant') {
      if (m.native?.format === 'openai') out.push(m.native.data as OAMessage);
      else
        out.push({
          role: 'assistant',
          content: m.text || null,
          ...(m.toolCalls.length ? { tool_calls: m.toolCalls.map((c) => ({ id: c.id, type: 'function' as const, function: { name: c.name, arguments: JSON.stringify(c.input) } })) } : {}),
        });
    } else for (const r of m.results) out.push({ role: 'tool', tool_call_id: r.id, content: r.content });
  });
  return out;
}

/** Strips JSON Schema keys that some OpenAI-compatible servers (Gemini) reject. */
function portableSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(portableSchema);
  if (!schema || typeof schema !== 'object') return schema;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema)) if (k !== '$schema' && k !== 'additionalProperties') out[k] = portableSchema(v);
  return out;
}

/** Reads a server-sent-events body and yields each JSON payload. */
export async function* sseEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index: number;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        yield JSON.parse(data);
      } catch {
        /* keep-alive or partial line */
      }
    }
  }
}

type ChunkToolCall = { index?: number; id?: string; type?: string; function?: { name?: string; arguments?: string }; [extra: string]: unknown };
type Chunk = { choices?: { delta?: { content?: string | null; tool_calls?: ChunkToolCall[] }; finish_reason?: string | null }[]; error?: { message?: string } };

async function completeOpenAI(config: CoachConfig, req: CompletionRequest): Promise<Completion> {
  const body = {
    model: config.model,
    stream: true,
    messages: toOpenAIMessages(req.system, req.messages, req.summary),
    tools: req.tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: portableSchema(t.schema) } })),
  };
  const response = await send(config, `${baseUrl(config)}/chat/completions`, { method: 'POST', headers: authHeaders(config), body: JSON.stringify(body), signal: req.signal });
  if (!response.body) throw new CoachError('The provider sent an empty answer.');

  let text = '';
  let finish: string | null | undefined;
  const calls: OAToolCall[] = [];
  for await (const raw of sseEvents(response.body)) {
    const chunk = raw as Chunk;
    if (chunk.error) throw new CoachError(`${PROVIDERS[config.provider].label}: ${String(chunk.error.message ?? 'error').slice(0, 200)}`);
    const choice = chunk.choices?.[0];
    if (!choice) continue;
    const delta = choice.delta ?? {};
    if (delta.content) {
      text += delta.content;
      req.onText?.(delta.content);
    }
    for (const part of delta.tool_calls ?? []) {
      const i = part.index ?? calls.length;
      const { index: _i, function: fn, id, type: _t, ...extra } = part;
      void _i;
      void _t;
      calls[i] ??= { id: id ?? `call_${i}`, type: 'function', function: { name: '', arguments: '' } };
      const call = calls[i];
      if (id) call.id = id;
      if (fn?.name) call.function.name += fn.name;
      if (fn?.arguments) call.function.arguments += fn.arguments;
      // Provider extras (for example Gemini thought signatures) must be replayed unchanged.
      Object.assign(call, extra);
    }
    if (choice.finish_reason) finish = choice.finish_reason;
  }

  const toolCalls: ToolCall[] = calls.filter(Boolean).map((c) => {
    let input: unknown = {};
    try {
      input = c.function.arguments ? JSON.parse(c.function.arguments) : {};
    } catch {
      input = { __invalid_json: c.function.arguments };
    }
    return { id: c.id, name: c.function.name, input };
  });
  const native = { format: 'openai' as const, data: { role: 'assistant', content: text || null, ...(calls.length ? { tool_calls: calls.filter(Boolean) } : {}) } };
  const stop: StopReason = toolCalls.length ? 'tool_use' : finish === 'length' ? 'max_tokens' : finish === 'content_filter' ? 'refusal' : 'end';
  return { text, toolCalls, native, stop };
}
