export type AgentSource = 'cli' | 'telegram';

export type TelegramDecision = {
  shouldReply: boolean;
  message: string;
  reaction: string | null;
};

export type UserMeta = {
  name?: string;
  username?: string;
};

export type AgentResult =
  | {
      source: 'cli';
      text: string;
    }
  | {
      source: 'telegram';
      decision: TelegramDecision;
    };
