import { Injectable } from '@nestjs/common';
import { MemoryService } from 'src/memory/memory.service';
import { OpenAiService } from 'src/open-ai/open-ai.service';
import { CLI_INSTRUCTIONS } from './prompts/cli-instructions';
import { TELEGRAM_INSTRUCTIONS } from './prompts/telegram-instructions';
import { BASE_INSTRUCTIONS, STYLE_EXAMPLES } from './prompts/base-instructions';
import { AgentSource, TelegramDecision } from './agent.types';
import { StoredMessage } from 'src/memory/memory.types';
import { parseTelegramDecision } from './utils/parse-telegram-decision';
import { TOOL_DEFINITIONS } from 'src/tools/tool-definitions';
import { ToolsService } from 'src/tools/tools.service';
import type {
  ResponseInput,
  ResponseInputItem,
} from 'openai/resources/responses/responses';
import { ChatMessage, MemoryEntry } from 'src/telegram/chat-storage.types';
import { MEMORY_INSTRUCTIONS } from './prompts/memory_instructions';
import { parseMemoryDecision } from './utils/parse-memory-decision';

type MessageMeta = {
  name?: string;
  username?: string;
};

type HandleMessageParams = {
  model: string;
  temperature?: number;
  userId: string;
  text: string;
  source: AgentSource;
  userMeta?: MessageMeta;
  botMeta?: MessageMeta;
  chatId?: number;
};

@Injectable()
export class AgentService {
  constructor(
    private readonly openAiService: OpenAiService,
    private readonly memoryService: MemoryService,
    private readonly toolsService: ToolsService,
  ) {}

  async handleMemory(
    memories: MemoryEntry[],
    messages: ChatMessage[],
  ): Promise<string[]> {
    const response = await this.openAiService.createResponse({
      model: 'gpt-5-mini',
      instructions: MEMORY_INSTRUCTIONS,
      input: [
        {
          role: 'user',
          content: JSON.stringify({
            existingMemories: memories,
            newMessages: messages,
          }),
        },
      ],
    });

    const decision = parseMemoryDecision(response.output_text);

    return decision.memories;
  }

  async handleMessage(params: HandleMessageParams): Promise<string> {
    this.memoryService.addMessage(params.userId, {
      role: 'user',
      text: params.text,
      meta: params.userMeta,
    });

    let input: ResponseInput = this.getOpenAiMessages(params.userId);
    const instructions = this.buildInstructions(params.source);

    for (let step = 0; step <= 5; step++) {
      const response = await this.openAiService.createResponse({
        model: params.model,
        temperature: params.temperature,
        instructions,
        input,
        tools: TOOL_DEFINITIONS,
      });

      const toolCall = response.output.find(
        (item) => item.type === 'function_call',
      );

      if (!toolCall) {
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

      console.log('Tool call:', toolCall);

      const toolResponse = await this.toolsService.executeTool(
        toolCall.name,
        JSON.parse(toolCall.arguments),
        {
          chatId: params.chatId,
        },
      );

      const previousOutput = response.output as ResponseInputItem[];

      input = [
        ...input,
        ...previousOutput,
        {
          type: 'function_call_output',
          call_id: toolCall.call_id,
          output: JSON.stringify(toolResponse),
        },
      ];

      console.log('Tool response:', toolResponse);
    }

    throw new Error('Tool loop limit reached');
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

${STYLE_EXAMPLES}

${sourceInstructions}
`.trim();
  }
}
