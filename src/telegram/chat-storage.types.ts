export type MessageAuthor = {
  id: number;
  name?: string;
  username?: string;
  isBot: boolean;
};

export type ChatMessage = {
  id: number;
  chatId: number;
  chatType: string;
  text: string;
  sentAt: string;
  replyToMessageId?: number;
  from: MessageAuthor;
};

export type SaveMessageParams = {
  id: number;
  chatId: number;
  chatType: string;
  text: string;
  sentAt: string;
  replyToMessageId?: number;
  from: Omit<MessageAuthor, 'isBot'>;
};

export type ChatStorage = {
  messages: ChatMessage[];
  memories: MemoryEntry[];
  lastMemoryMessageCount: number;
};

export type MemoryEntry = {
  content: string;
  timestamp: string;
};
