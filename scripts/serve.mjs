// Serves dist/ with the headers from vercel.json, to test the security
// policy before deploying. Usage: npm run build && node scripts/serve.mjs [port]
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = new URL('../dist/', import.meta.url).pathname;
const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const port = Number(process.argv[2] || 4174);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
// Vercel sources use path-to-regexp; the patterns in vercel.json only need "(.*)".
const rules = config.headers.map((h) => ({ re: new RegExp(`^${h.source.replace(/\(\.\*\)/g, '.*')}$`), headers: h.headers }));

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = normalize(join(root, path));
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
  for (const r of rules) if (r.re.test(path)) for (const h of r.headers) res.setHeader(h.key, h.value);
  res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`http://localhost:${port}/`));
