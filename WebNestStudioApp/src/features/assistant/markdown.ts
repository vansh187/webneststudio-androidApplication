/**
 * A small Markdown reader for AI replies. It runs on every streamed chunk, so
 * it must accept half-written text: an unclosed code fence is simply a code
 * block that's still growing.
 */

export type MarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet'; text: string; indent: number }
  | { type: 'number'; marker: string; text: string; indent: number }
  | { type: 'quote'; text: string }
  | { type: 'rule' }
  | { type: 'code'; language: string | null; path: string | null; code: string };

export type InlineSpan =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; url: string };

const FENCE = /^\s*(`{3,}|~{3,})(.*)$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^(\s*)[-*+]\s+(.*)$/;
const NUMBERED = /^(\s*)(\d+[.)])\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;

function startsNewBlock(line: string) {
  return (
    !line.trim() ||
    FENCE.test(line) ||
    HEADING.test(line) ||
    BULLET.test(line) ||
    NUMBERED.test(line) ||
    QUOTE.test(line) ||
    RULE.test(line)
  );
}

export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const fence = line.match(FENCE);
    if (fence) {
      // The info string can hold a language and a path: ```python app/main.py
      const [language, ...rest] = fence[2].trim().split(/\s+/).filter(Boolean);
      const closing = new RegExp(`^\\s*${fence[1][0]}{${fence[1].length},}\\s*$`);
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !closing.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({
        type: 'code',
        language: language ?? null,
        path: rest.length ? rest.join(' ') : null,
        code: code.join('\n'),
      });
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() });
      i += 1;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ type: 'rule' });
      i += 1;
      continue;
    }

    const bullet = line.match(BULLET);
    if (bullet) {
      blocks.push({ type: 'bullet', text: bullet[2], indent: bullet[1].length });
      i += 1;
      continue;
    }

    const numbered = line.match(NUMBERED);
    if (numbered) {
      blocks.push({
        type: 'number',
        marker: numbered[2],
        text: numbered[3],
        indent: numbered[1].length,
      });
      i += 1;
      continue;
    }

    if (QUOTE.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i])) {
        quoted.push((lines[i].match(QUOTE) as RegExpMatchArray)[1]);
        i += 1;
      }
      blocks.push({ type: 'quote', text: quoted.join('\n') });
      continue;
    }

    const paragraph = [line];
    i += 1;
    while (i < lines.length && !startsNewBlock(lines[i])) {
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
  }

  return blocks;
}

const INLINE =
  /`([^`\n]+)`|\*\*([^\n]+?)\*\*|__([^\n]+?)__|\*([^*\s][^*\n]*?)\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g;

export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) {
      spans.push({ type: 'text', text: text.slice(last, index) });
    }
    if (match[1] !== undefined) {
      spans.push({ type: 'code', text: match[1] });
    } else if (match[2] !== undefined || match[3] !== undefined) {
      spans.push({ type: 'bold', text: match[2] ?? match[3] });
    } else if (match[4] !== undefined) {
      spans.push({ type: 'italic', text: match[4] });
    } else {
      spans.push({ type: 'link', text: match[5], url: match[6] });
    }
    last = index + match[0].length;
  }
  if (last < text.length) {
    spans.push({ type: 'text', text: text.slice(last) });
  }
  return spans;
}
