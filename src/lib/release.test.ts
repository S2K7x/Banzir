import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('release checks', () => {
  it('allows exactly the inline scripts of index.html in the security policy', () => {
    const html = read('index.html');
    const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
    const policy = (JSON.parse(read('vercel.json')).headers as { source: string; headers: { key: string; value: string }[] }[])
      .flatMap((h) => h.headers)
      .find((h) => h.key === 'Content-Security-Policy')!.value;
    const scriptSrc = policy.split(';').find((d) => d.trim().startsWith('script-src'))!;
    const hashes = scriptSrc.match(/'sha256-[^']+'/g) ?? [];
    // When the theme script in index.html changes, put its new hash in vercel.json.
    expect(hashes.sort()).toEqual(inline.sort());
    expect(scriptSrc).not.toContain('unsafe-inline');
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it('documents the current version in the changelog', () => {
    const { version } = JSON.parse(read('package.json'));
    expect(read('CHANGELOG.md')).toContain(`## ${version} `);
  });
});
