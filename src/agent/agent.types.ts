export type AgentSource = 'cli' | 'telegram';

export type TelegramDecision = {
  shouldReply: boolean;
  message: string;
  reaction: string | null;
};

export type MemoryDecision = {
  memories: string[];
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
      raw: string;
      artifacts: AgentArtifact[];
    };

export type MessageMeta = {
  name?: string;
  username?: string;
};

export type ImageInput = {
  dataUrl: string;
};

export type HandleMessageParams = {
  model: string;
  temperature?: number;
  userId: string;
  text: string;
  image?: ImageInput;
  source: AgentSource;
  userMeta?: MessageMeta;
  botMeta?: MessageMeta;
  chatId?: number;
};

export type AgentArtifact = {
  type: 'image';
  data: Buffer;
  mimeType: 'image/png';
};
