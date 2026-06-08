import { Injectable } from '@nestjs/common';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ChatMessage,
  ChatStorage,
  SaveMessageParams,
} from './chat-storage.types';

type SaveMessageResult = {
  shouldExtractMemory: boolean;
  chatId: number;
};

const MEMORY_INTERVAL = 10;

@Injectable()
export class ChatStorageService {
  async saveUserMessage(params: SaveMessageParams) {
    return this.saveMessage({
      ...params,
      from: {
        ...params.from,
        isBot: false,
      },
    });
  }

  async saveBotMessage(params: SaveMessageParams) {
    return this.saveMessage({
      ...params,
      from: {
        ...params.from,
        isBot: true,
      },
    });
  }

  async extractLastMessages(chatId: number, count: number) {
    const filePath = this.getChatFilePath(chatId);
    const data = await this.readChatStorage(filePath);

    return data.messages.slice(-Math.max(0, count));
  }

  async extractUnprocessedMessages(chatId: number) {
    const filePath = this.getChatFilePath(chatId);
    const data = await this.readChatStorage(filePath);

    return data.messages.slice(data.lastMemoryMessageCount);
  }

  async markMemoryExtracted(chatId: number) {
    const filePath = this.getChatFilePath(chatId);
    const data = await this.readChatStorage(filePath);

    data.lastMemoryMessageCount = data.messages.length;

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  async writeMemoryToStorage(chatId: number, memory: string) {
    const filePath = this.getChatFilePath(chatId);
    const data = await this.readChatStorage(filePath);

    data.memories.push({
      content: memory,
      timestamp: new Date().toISOString(),
    });

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  private async saveMessage(message: ChatMessage): Promise<SaveMessageResult> {
    const filePath = this.getChatFilePath(message.chatId);

    await fs.mkdir(path.dirname(filePath), {
      recursive: true,
    });

    const data = await this.readChatStorage(filePath);

    data.messages.push(message);

    const shouldExtractMemory =
      data.messages.length - data.lastMemoryMessageCount >= MEMORY_INTERVAL;

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

    return {
      shouldExtractMemory,
      chatId: message.chatId,
    };
  }

  private async readChatStorage(filePath: string): Promise<ChatStorage> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');

      return JSON.parse(fileContent) as ChatStorage;
    } catch {
      return {
        messages: [],
        memories: [],
        lastMemoryMessageCount: 0,
      };
    }
  }

  private getChatFilePath(chatId: number) {
    return path.join(process.cwd(), 'data', 'chats', `telegram_${chatId}.json`);
  }
}
