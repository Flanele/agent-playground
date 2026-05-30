import { Injectable } from '@nestjs/common';
import { MemoryService } from 'src/memory/memory.service';
import { OpenAiService } from 'src/open-ai/open-ai.service';
import { CLI_INSTRUCTIONS } from './prompts/cli-instructions';
import { TELEGRAM_INSTRUCTIONS } from './prompts/telegram-instructions';
import { BASE_INSTRUCTIONS } from './prompts/base-instructions';
import { AgentSource, TelegramDecision } from './agent.types';
import { StoredMessage } from 'src/memory/memory.types';
import { parseTelegramDecision } from './utils/parse-telegram-decision';

type MessageMeta = {
  name?: string;
  username?: string;
};

type HandleMessageParams = {
  model: string;
  userId: string;
  text: string;
  source: AgentSource;
  userMeta?: MessageMeta;
  botMeta?: MessageMeta;
};

@Injectable()
export class AgentService {
  constructor(
    private readonly openAiService: OpenAiService,
    private readonly memoryService: MemoryService,
  ) {}

  async handleMessage(params: HandleMessageParams): Promise<string> {
    this.memoryService.addMessage(params.userId, {
      role: 'user',
      text: params.text,
      meta: params.userMeta,
    });

    const input = this.getOpenAiMessages(params.userId);
    const instructions = this.buildInstructions(params.source);

    const response = await this.openAiService.createResponse({
      model: params.model,
      instructions,
      input,
    });

    const raw = response.output_text;

    const assistantMemoryText =
      params.source === 'telegram'
        ? this.formatTelegramAssistantMemory(raw)
        : raw;

    this.memoryService.addMessage(params.userId, {
      role: 'assistant',
      text: assistantMemoryText,
      meta: params.botMeta,
    });

    return raw;
  }

  private getOpenAiMessages(userId: string) {
    const context = this.memoryService.getContext(userId);

    return context.messages.map((message) => ({
      role: message.role,
      content: this.formatMessage(message),
    }));
  }

  private formatMessage(message: StoredMessage) {
    const actor = message.role === 'user' ? 'User' : 'Bot';

    return `
${actor}: ${message.meta?.name ?? 'unknown'}
Username: ${
      message.meta?.username ? `@${message.meta.username}` : 'no username'
    }
Message: ${message.text}
`.trim();
  }

  private formatTelegramAssistantMemory(raw: string) {
    const decision = parseTelegramDecision(raw);

    const parts: string[] = [];

    if (decision.reaction) {
      parts.push(`Reaction: ${decision.reaction}`);
    }

    if (decision.shouldReply && decision.message) {
      parts.push(`Message: ${decision.message}`);
    }

    if (parts.length === 0) {
      return 'Action: ignored';
    }

    return parts.join('\n');
  }

  private buildInstructions(source: AgentSource): string {
    const sourceInstructions =
      source === 'telegram' ? TELEGRAM_INSTRUCTIONS : CLI_INSTRUCTIONS;

    return `
${BASE_INSTRUCTIONS}

${sourceInstructions}
`.trim();
  }
}
