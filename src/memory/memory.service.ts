import { Injectable } from '@nestjs/common';
import { StoredMessage } from './memory.types';

@Injectable()
export class MemoryService {
  private memory = new Map<string, { messages: StoredMessage[] }>();

  getContext(userId: string) {
    return this.memory.get(userId) || { messages: [] };
  }

  addMessage(userId: string, message: StoredMessage) {
    const context = this.getContext(userId);

    context.messages.push(message);

    this.memory.set(userId, context);
  }
}
