import { Injectable } from '@nestjs/common';
import { getCurrentTime } from './utils/get-current-time';
import { ChatStorageService } from 'src/telegram/chat-storage.service';

type ToolContext = {
  chatId?: number;
};

@Injectable()
export class ToolsService {
  constructor(private chatStorageService: ChatStorageService) {}

  async executeTool(name: string, args: unknown, context: ToolContext) {
    switch (name) {
      case 'get_current_time':
        return getCurrentTime(args as Record<string, unknown>);

      case 'get_chat_memories': {
        if (!context || !context.chatId) {
          throw new Error('get_chat_memories requires a Telegram chatId');
        }

        return this.chatStorageService.extractMemories(context.chatId);
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
