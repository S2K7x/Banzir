import type { ReactNode } from 'react';

/**
 * A small, safe renderer for the coach's replies: paragraphs, headings, lists,
 * bold, italics and inline code. It builds React elements and never injects
 * HTML, because model output is untrusted.
 */

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${key}.${i++}`;
    if (t.startsWith('**')) out.push(<strong key={k}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) out.push(<code key={k}>{t.slice(1, -1)}</code>);
    else out.push(<em key={k}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r/g, '').split('\n');
  let i = 0;
  let n = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const key = `b${n++}`;
    const bullet = /^\s*[-*•]\s+/;
    const numbered = /^\s*\d+[.)]\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const re = ordered ? numbered : bullet;
      const items: ReactNode[] = [];
      while (i < lines.length && re.test(lines[i])) {
        items.push(<li key={`${key}.${items.length}`}>{inline(lines[i].replace(re, ''), `${key}.${items.length}`)}</li>);
        i++;
      }
      blocks.push(ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>);
      continue;
    }
    const heading = /^#{1,6}\s+/.exec(line);
    if (heading) {
      blocks.push(
        <p key={key} className="md-h">
          {inline(line.slice(heading[0].length), key)}
        </p>,
      );
      i++;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !bullet.test(lines[i]) && !numbered.test(lines[i]) && !/^#{1,6}\s+/.test(lines[i])) para.push(lines[i++]);
    blocks.push(
      <p key={key}>
        {para.flatMap((l, j) => (j ? [<br key={`${key}.br${j}`} />, ...inline(l, `${key}.${j}`)] : inline(l, `${key}.${j}`)))}
      </p>,
    );
  }
  return <div className="md">{blocks}</div>;
}
