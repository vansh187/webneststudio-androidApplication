/**
 * Hand-rolled relative-time helpers for chat. No date library (the codebase has
 * none — see utils/format.ts). Every function is total: a bad/absent input
 * returns a safe placeholder, never throws.
 */

function toDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function clockTime(d: Date): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return '';
  }
}

function calendarDate(d: Date): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    }).format(d);
  } catch {
    return '';
  }
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** In-bubble timestamp, e.g. "2:45 PM". */
export function messageTime(value?: string | null): string {
  const d = toDate(value);
  return d ? clockTime(d) : '';
}

/** Sticky day separator label, e.g. "Today" / "Yesterday" / "12 Jan". */
export function dayLabel(value?: string | null): string {
  const d = toDate(value);
  if (!d) {
    return '';
  }
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const dayMs = 86400000;
  if (target === today) {
    return 'Today';
  }
  if (target === today - dayMs) {
    return 'Yesterday';
  }
  return calendarDate(d);
}

/** Conversation-list timestamp: time if today, "Yesterday", else a short date. */
export function conversationTime(value?: string | null): string {
  const d = toDate(value);
  if (!d) {
    return '';
  }
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  if (target === today) {
    return clockTime(d);
  }
  if (target === today - 86400000) {
    return 'Yesterday';
  }
  return calendarDate(d);
}

/** True when two ISO strings fall on different calendar days (for separators). */
export function isNewDay(current?: string | null, previous?: string | null): boolean {
  const a = toDate(current);
  const b = toDate(previous);
  if (!a) {
    return false;
  }
  if (!b) {
    return true;
  }
  return startOfDay(a) !== startOfDay(b);
}

/** Human file size, e.g. "482 KB". Never throws. */
export function fileSize(bytes?: number | null): string {
  const n = typeof bytes === 'number' && Number.isFinite(bytes) ? bytes : 0;
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${Math.round(n / 1024)} KB`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
