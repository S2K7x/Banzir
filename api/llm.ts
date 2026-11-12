/**
 * Optional relay for AI providers that refuse direct browser calls (OpenAI,
 * Google Gemini, Groq, Mistral). Deployed by Vercel as a function at /api/llm;
 * the same handler is mounted by the Vite dev and preview servers.
 *
 * - Forwards the request body to an allow-listed provider host and streams
 *   the answer back. It is not an open proxy: hosts and paths are fixed.
 * - The person's API key travels in a request header, is never logged and
 *   never stored.
 * - Claude and OpenRouter accept browser calls, so the app talks to them
 *   directly and never uses this relay.
 */

const ALLOWED_HOSTS = new Set([
  'api.openai.com',
  'generativelanguage.googleapis.com',
  'api.groq.com',
  'api.mistral.ai',
  'openrouter.ai',
  'api.anthropic.com',
]);

/** Only the endpoints the app uses. */
const ALLOWED_PATH = /\/(chat\/completions|models|messages)$/;

const FORWARD_HEADERS = ['authorization', 'x-api-key', 'x-goog-api-key', 'content-type', 'accept', 'anthropic-version', 'anthropic-beta', 'http-referer', 'x-title'];

const MAX_BODY = 2 * 1024 * 1024;

const problem = (status: number, message: string) =>
  new Response(JSON.stringify({ error: { message } }), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function relay(request: Request, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST' && request.method !== 'GET') return problem(405, 'Only GET and POST are relayed.');

  let target: URL;
  try {
    target = new URL(request.headers.get('x-banzir-target') ?? '');
  } catch {
    return problem(400, 'Missing or invalid x-banzir-target header.');
  }
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname) || target.port || target.username || target.password) {
    return problem(403, `The relay does not forward to ${target.hostname || 'this address'}.`);
  }
  if (!ALLOWED_PATH.test(target.pathname)) return problem(403, 'The relay only forwards chat, messages and model-list requests.');

  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  let body: ArrayBuffer | undefined;
  if (request.method === 'POST') {
    body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY) return problem(413, 'Request too large.');
  }

  let upstream: Response;
  try {
    upstream = await fetchImpl(target.toString(), { method: request.method, headers, body, signal: request.signal });
  } catch {
    return problem(502, `Could not reach ${target.hostname}.`);
  }
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' },
  });
}

export default {
  fetch: (request: Request) => relay(request),
};
