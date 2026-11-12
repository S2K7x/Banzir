import { useState } from 'react';
import { PROVIDERS, listModels } from '../../lib/coach/providers';
import { saveConfig } from '../../lib/coach/store';
import { CoachError, type CoachConfig, type ProviderId } from '../../lib/coach/types';
import { Icon } from '../../ui/kit';

const ORDER: ProviderId[] = ['anthropic', 'openai', 'gemini', 'openrouter', 'groq', 'mistral', 'custom'];

/** Connects a provider: key, test call, model choice. */
export function Setup({ initial, onDone, onCancel }: { initial?: CoachConfig; onDone: () => void; onCancel?: () => void }) {
  const [provider, setProvider] = useState<ProviderId>(initial?.provider ?? 'anthropic');
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? '');
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? 'http://localhost:11434/v1');
  const [models, setModels] = useState<string[] | null>(null);
  const [model, setModel] = useState(initial?.model ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const info = PROVIDERS[provider];
  const config: CoachConfig = { provider, apiKey: apiKey.trim(), model, ...(provider === 'custom' ? { baseUrl: baseUrl.trim() } : {}) };

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const list = await listModels(config);
      setModels(list);
      const preferred = info.defaultModel && list.includes(info.defaultModel) ? info.defaultModel : list.includes(model) ? model : (list[0] ?? '');
      setModel(preferred);
    } catch (e) {
      // Some servers have no model list: let the person type the name.
      if (e instanceof CoachError && e.kind === 'model') setModels([]);
      setError(e instanceof Error ? e.message : 'Could not connect.');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    await saveConfig({ ...config, model: model.trim() });
    onDone();
  }

  const canConnect = provider === 'custom' ? !!baseUrl.trim() : !!apiKey.trim();

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="field">
        <span>Provider</span>
        <div className="chips">
          {ORDER.map((id) => (
            <button
              key={id}
              className={`chip ${provider === id ? 'on' : ''}`}
              onClick={() => {
                setProvider(id);
                setModels(null);
                setModel('');
                setError(null);
              }}
              aria-pressed={provider === id}
            >
              {PROVIDERS[id].label}
            </button>
          ))}
        </div>
      </div>

      {provider === 'custom' && (
        <label className="field">
          <span>Server address (OpenAI-compatible)</span>
          <input className="input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="http://localhost:11434/v1" autoComplete="off" spellCheck={false} />
        </label>
      )}

      <label className="field">
        <span>API key</span>
        <input className="input" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={info.keyHint} autoComplete="off" spellCheck={false} />
      </label>
      {info.keyUrl && (
        <a className="link" href={info.keyUrl} target="_blank" rel="noreferrer noopener" style={{ justifySelf: 'start' }}>
          Get a key from {info.label}
        </a>
      )}

      <button className="btn block" onClick={connect} disabled={!canConnect || busy}>
        {busy ? 'Connecting…' : models ? 'Check again' : 'Connect'}
      </button>
      {error && <p className="note warn">{error}</p>}

      {models && (
        <label className="field">
          <span>Model</span>
          {models.length ? (
            <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model name from your provider" autoComplete="off" spellCheck={false} />
          )}
        </label>
      )}
      {models && (
        <button className="btn primary big block" onClick={save} disabled={!model.trim()}>
          <Icon name="check" size={18} /> Use this model
        </button>
      )}
      {onCancel && (
        <button className="btn ghost block" onClick={onCancel}>
          Cancel
        </button>
      )}

      <div className="card stack" style={{ gap: 6 }}>
        <b className="small">Good to know</b>
        <p className="muted small">Your key is stored only on this device and is never included in backups. Usage is billed by {provider === 'custom' ? 'your server' : info.label} to your account.</p>
        <p className="muted small">When you chat, the coach sends your question and the training data it needs to {provider === 'custom' ? 'your server' : info.label}. Nothing is sent to the people who made Banzir.</p>
        {info.relay && (
          <p className="muted small">{info.label} does not accept calls from a browser, so requests pass through this site's own relay (on Vercel). The relay forwards them and stores nothing.</p>
        )}
      </div>
    </div>
  );
}
