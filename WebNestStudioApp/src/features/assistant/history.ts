import type { AssistantChatRequest } from '../../api/assistantStream';

export const MAX_USER_CHARS = 500;
const MAX_HISTORY = 20;

export type AiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'streaming' | 'done' | 'stopped' | 'failed';
  error?: string;
  /** What the failed reply offers: try again, or start over when it's too large. */
  action?: 'retry' | 'newChat';
  cutShort?: boolean;
  provider?: string;
};

/** Counted the way the server counts, so an emoji is one character, not two. */
export function countChars(text: string) {
  return Array.from(text.trim()).length;
}

export function canSendText(text: string) {
  const count = countChars(text);
  return count > 0 && count <= MAX_USER_CHARS;
}

/**
 * The server keeps no history, so each request carries the conversation: the
 * last 20 messages, starting with a user message and with no empty replies.
 */
export function toRequestMessages(messages: AiMessage[]): AssistantChatRequest['messages'] {
  const usable = messages
    .filter(message => message.role === 'user' || message.content.trim().length > 0)
    .map(({ role, content }) => ({ role, content }))
    .slice(-MAX_HISTORY);
  const firstUser = usable.findIndex(message => message.role === 'user');
  return firstUser === -1 ? [] : usable.slice(firstUser);
}
