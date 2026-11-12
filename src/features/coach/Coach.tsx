import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { runTurn, setProposalStatus, upgradeChat } from '../../lib/coach/agent';
import { PROMPT_VERSION } from '../../lib/coach/prompt';
import { PROVIDERS } from '../../lib/coach/providers';
import { clearMemory, getChat, getConfig, getMemory, isReady, newChat, removeMemory, saveChat, saveConfig } from '../../lib/coach/store';
import { acceptProposal, READ_TOOLS } from '../../lib/coach/tools';
import type { AssistantMessage, Chat, CoachConfig, Proposal } from '../../lib/coach/types';
import { Icon, Sheet } from '../../ui/kit';
import { COACH_DRAFT_KEY } from '../../lib/coach/draft';
import { Markdown } from './Markdown';
import { Setup } from './Setup';


const QUICK = ['How did my last workout go?', 'How is my training going this month?', 'My shoulder hurts on presses. What should I change?', 'Make my plan fit 3 days a week.'];

const TOOL_LABEL: Record<string, string> = {
  get_profile: 'your profile',
  get_program: 'your plan',
  get_recent_sessions: 'your recent workouts',
  get_exercise_history: 'an exercise history',
  get_stats: 'your progress',
  search_exercises: 'the exercise library',
  list_plans: 'the built-in plans',
};

export function Coach() {
  const config = useLiveQuery(async () => (await getConfig()) ?? null, []);
  const memory = useLiveQuery(getMemory, [], []);
  const [chat, setChat] = useState<Chat | null>(null);
  const [streaming, setStreaming] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState(() => {
    const draft = sessionStorage.getItem(COACH_DRAFT_KEY) ?? '';
    sessionStorage.removeItem(COACH_DRAFT_KEY);
    return draft;
  });
  const [settings, setSettings] = useState(false);
  const [editing, setEditing] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void getChat().then((c) => setChat(upgradeChat(c)));
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [chat?.messages.length, streaming]);
  useEffect(() => () => abort.current?.abort(), []);

  if (config === undefined || !chat) return <div className="screen" />;

  if (!isReady(config ?? undefined) || editing) {
    return (
      <div className="screen">
        <h1 className="h1">Coach</h1>
        {!editing && (
          <div className="card accent stack">
            <div className="row">
              <Icon name="spark" />
              <b className="grow">Your own AI coach</b>
            </div>
            <p className="small">It reads your plan and training log, remembers what matters about you, and proposes changes for you to accept or decline. Connect it with your own key from Claude, OpenAI, Gemini, OpenRouter or another provider.</p>
          </div>
        )}
        <Setup initial={config ?? undefined} onDone={() => setEditing(false)} onCancel={editing ? () => setEditing(false) : undefined} />
      </div>
    );
  }
  const ready = config as CoachConfig;

  async function send(text: string) {
    const question = text.trim();
    if (!question || running || !chat) return;
    setInput('');
    setError(null);
    setRunning(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      await runTurn({
        config: ready,
        chat,
        text: question,
        signal: controller.signal,
        onUpdate: (c, s) => {
          setChat(c);
          setStreaming(s);
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setRunning(false);
      setStreaming('');
      abort.current = null;
    }
  }

  async function decide(p: Proposal, accept: boolean) {
    if (!chat) return;
    let next: Chat;
    if (!accept) next = setProposalStatus(chat, p.id, 'dismissed');
    else {
      try {
        await acceptProposal(p);
        next = setProposalStatus(chat, p.id, 'accepted');
      } catch (e) {
        next = setProposalStatus(chat, p.id, 'failed', e instanceof Error ? e.message : 'Could not apply it.');
      }
    }
    setChat(next);
    await saveChat(next);
  }

  const visible = chat.messages.filter((m) => m.role !== 'tool');

  return (
    <div className="screen coach">
      <div className="row between">
        <div>
          <h1 className="h1">Coach</h1>
          <p className="muted small">
            {PROVIDERS[ready.provider].label} · {ready.model}
          </p>
        </div>
        <button className="icon-btn" onClick={() => setSettings(true)} aria-label="Coach settings">
          <Icon name="cog" size={20} />
        </button>
      </div>

      {visible.length === 0 && !running && (
        <div className="card stack">
          <p className="small">Ask about your training, a pain or a plateau, or ask for a change to your plan. Some ideas:</p>
          <div className="chips">
            {QUICK.map((q) => (
              <button key={q} className="chip" onClick={() => void send(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chat">
        {chat.summary && <p className="muted small center">Earlier messages are summarised for the coach.</p>}
        {visible.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="bubble me">
              {m.text}
            </div>
          ) : (
            <AssistantBubble key={m.id} message={m as AssistantMessage} onDecide={decide} />
          ),
        )}
        {running && (
          <div className="bubble coach-bubble">
            {streaming ? <Markdown text={streaming} /> : <span className="typing" aria-label="The coach is thinking" />}
          </div>
        )}
        {error && (
          <div className="note warn">
            {error}{' '}
            <button className="link" onClick={() => setEditing(true)}>
              Check the connection
            </button>
          </div>
        )}
        <div ref={end} />
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <textarea
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          placeholder="Ask your coach"
          aria-label="Message to the coach"
        />
        {running ? (
          <button type="button" className="icon-btn send" onClick={() => abort.current?.abort()} aria-label="Stop">
            <Icon name="pause" size={18} />
          </button>
        ) : (
          <button type="submit" className="icon-btn send" disabled={!input.trim()} aria-label="Send">
            <Icon name="up" size={18} />
          </button>
        )}
      </form>

      {settings && (
        <Sheet title="Coach settings" onClose={() => setSettings(false)}>
          <div className="card stack">
            <p className="small">
              {PROVIDERS[ready.provider].label} · {ready.model}
            </p>
            <button
              className="btn block"
              onClick={() => {
                setSettings(false);
                setEditing(true);
              }}
            >
              Change provider, key or model
            </button>
            <button
              className="btn ghost danger block"
              onClick={async () => {
                await saveConfig({ ...ready, apiKey: '' });
                setSettings(false);
              }}
            >
              Disconnect and forget the key
            </button>
          </div>

          <b>What the coach remembers</b>
          {memory.length === 0 ? (
            <p className="muted small">Nothing yet. The coach saves lasting facts here, such as an injury or a goal date. You can delete any of them.</p>
          ) : (
            <div className="card list">
              {memory.map((n) => (
                <div key={n.id}>
                  <span className="grow small">{n.text}</span>
                  <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => void removeMemory(n.id)} aria-label={`Forget: ${n.text}`}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {memory.length > 0 && (
            <button className="btn ghost danger block" onClick={() => void clearMemory()}>
              Forget everything
            </button>
          )}

          <button
            className="btn block"
            onClick={async () => {
              abort.current?.abort();
              const fresh = newChat(PROMPT_VERSION);
              setChat(fresh);
              await saveChat(fresh);
              setSettings(false);
            }}
            disabled={running}
          >
            Start a new conversation
          </button>
          <p className="muted small">A new conversation keeps the coach's memory. Your key is stored only on this device; usage is billed by your provider.</p>
        </Sheet>
      )}
    </div>
  );
}

function AssistantBubble({ message, onDecide }: { message: AssistantMessage; onDecide: (p: Proposal, accept: boolean) => void }) {
  const looked = [...new Set(message.toolCalls.filter((c) => READ_TOOLS.has(c.name)).map((c) => TOOL_LABEL[c.name] ?? c.name))];
  const remembered = message.toolCalls.some((c) => c.name === 'save_memory');
  if (!message.text && !looked.length && !remembered && !message.proposals?.length) return null;
  return (
    <div className="stack" style={{ gap: 8 }}>
      {(looked.length > 0 || remembered) && (
        <p className="muted small tool-line">
          <Icon name="info" size={14} />
          {[looked.length ? `Looked at ${looked.join(', ')}` : '', remembered ? 'Saved a note to memory' : ''].filter(Boolean).join(' · ')}
        </p>
      )}
      {message.text && (
        <div className="bubble coach-bubble">
          <Markdown text={message.text} />
          {message.stop === 'aborted' && <p className="muted small">Stopped.</p>}
        </div>
      )}
      {message.proposals?.map((p) => (
        <div key={p.id} className={`card stack proposal ${p.status}`}>
          <div className="row">
            <Icon name="swap" size={18} />
            <b className="grow">{p.title}</b>
          </div>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            {p.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
          {p.status === 'pending' ? (
            <div className="row">
              <button className="btn sm primary" onClick={() => onDecide(p, true)}>
                Accept
              </button>
              <button className="btn sm ghost" onClick={() => onDecide(p, false)}>
                Dismiss
              </button>
            </div>
          ) : (
            <p className="muted small">{p.status === 'accepted' ? 'Accepted and applied.' : p.status === 'dismissed' ? 'Dismissed.' : `Could not apply: ${p.error}`}</p>
          )}
        </div>
      ))}
    </div>
  );
}
