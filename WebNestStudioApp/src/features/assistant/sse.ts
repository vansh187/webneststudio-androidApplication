export type SseEvent = { type: string; data: any };

/** Text can split anywhere between chunks, so this holds partial events. */
export function createSseParser(onEvent: (event: SseEvent) => void) {
  let buffer = '';
  let heldReturn = '';
  const dispatch = (block: string) => {
    let type = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) {
        continue;
      }
      const colon = line.indexOf(':');
      const field = colon === -1 ? line : line.slice(0, colon);
      const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');
      if (field === 'event') {
        type = value;
      } else if (field === 'data') {
        data.push(value);
      }
    }
    if (!data.length) {
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(data.join('\n'));
    } catch {
      // Skip a broken event. The stream's own end or error event still arrives.
      return;
    }
    onEvent({ type, data: parsed });
  };
  return {
    feed(text: string) {
      let incoming = heldReturn + text;
      heldReturn = '';
      if (incoming.endsWith('\r')) {
        heldReturn = '\r';
        incoming = incoming.slice(0, -1);
      }
      buffer += incoming.replace(/\r\n?/g, '\n');
      let end = buffer.indexOf('\n\n');
      while (end !== -1) {
        dispatch(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
        end = buffer.indexOf('\n\n');
      }
    },
    flush() {
      if (buffer.trim()) {
        dispatch(buffer);
      }
      buffer = '';
    },
  };
}
