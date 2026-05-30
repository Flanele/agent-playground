import { TelegramDecision } from '../agent.types';

export function parseTelegramDecision(raw: string): TelegramDecision {
  try {
    const parsed = JSON.parse(raw) as Partial<TelegramDecision>;

    return {
      shouldReply: Boolean(parsed.shouldReply),
      message: typeof parsed.message === 'string' ? parsed.message : '',
      reaction: typeof parsed.reaction === 'string' ? parsed.reaction : null,
    };
  } catch {
    return {
      shouldReply: true,
      message: raw,
      reaction: null,
    };
  }
}
