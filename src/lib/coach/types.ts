/** Provider-neutral conversation model for the AI coach. Design: docs/product/ai-coach.md. */

export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'openrouter' | 'groq' | 'mistral' | 'custom';
export type WireFormat = 'anthropic' | 'openai';

export type CoachConfig = {
  provider: ProviderId;
  apiKey: string;
  model: string;
  /** Only for `custom`: an OpenAI-compatible server, for example a local Ollama. */
  baseUrl?: string;
};

export type ToolCall = { id: string; name: string; input: unknown };
export type ToolResult = { id: string; name: string; content: string; isError?: boolean };

export type ProposalKind = 'program_change' | 'new_program' | 'plan_switch' | 'lighter_week' | 'nutrition_targets';

export type Proposal = {
  id: string;
  kind: ProposalKind;
  title: string;
  /** Human-readable summary of each change. */
  lines: string[];
  /** What to apply when accepted (operations, a program, a template id). */
  payload: unknown;
  status: 'pending' | 'accepted' | 'dismissed' | 'failed';
  error?: string;
};

export type UserMessage = {
  id: string;
  role: 'user';
  text: string;
  /** App context snapshot, sent only when it changed since the last one. */
  context?: string;
  at: string;
};

export type AssistantMessage = {
  id: string;
  role: 'assistant';
  text: string;
  toolCalls: ToolCall[];
  /** The provider's own message, replayed unchanged when the same wire format is used (thinking blocks, thought signatures). */
  native?: { format: WireFormat; data: unknown };
  /** Compaction epoch the message was produced in; older epochs replay without thinking blocks. */
  epoch: number;
  stop: StopReason;
  proposals?: Proposal[];
  at: string;
};

export type ToolMessage = { id: string; role: 'tool'; results: ToolResult[]; at: string };

export type CoachMessage = UserMessage | AssistantMessage | ToolMessage;

export type StopReason = 'end' | 'tool_use' | 'max_tokens' | 'refusal' | 'aborted' | 'other';

export type Chat = {
  messages: CoachMessage[];
  /** Messages before this index are represented by `summary` and not sent again. */
  cut: number;
  summary?: string;
  epoch: number;
  /** System prompt and tool set this conversation started with; they stay frozen for it. */
  promptVersion: string;
  lastContext?: string;
  /** Decisions on proposal cards since the last message, told to the model with the next one. */
  pending?: string[];
};

export type MemoryNote = { id: string; text: string; at: string };

/** A tool as every adapter needs it. */
export type ToolSpec = { name: string; description: string; schema: Record<string, unknown> };

export type CompletionRequest = {
  system: string;
  tools: ToolSpec[];
  /** Messages to send, already trimmed to the part after the summary. */
  messages: CoachMessage[];
  /** Prepended to the first user message when older turns were summarised. */
  summary?: string;
  epoch: number;
  signal?: AbortSignal;
  onText?: (delta: string) => void;
};

export type Completion = {
  text: string;
  toolCalls: ToolCall[];
  native?: { format: WireFormat; data: unknown };
  stop: StopReason;
};

/** Thrown for provider errors with a message that can be shown to the person. */
export class CoachError extends Error {
  constructor(
    message: string,
    readonly kind: 'auth' | 'rate' | 'model' | 'network' | 'relay' | 'other' = 'other',
  ) {
    super(message);
  }
}
