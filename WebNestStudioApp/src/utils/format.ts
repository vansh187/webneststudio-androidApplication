export function readTime(wordCount?: number | null) {
  if (!wordCount) {
    return 'quick read';
  }
  return `${Math.max(1, Math.ceil(wordCount / 220))} min read`;
}

export function formatDate(value?: string | null) {
  if (!value) {
    return 'latest';
  }

  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function initials(name?: string | null) {
  return (name || 'WebNest Studio')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
}
