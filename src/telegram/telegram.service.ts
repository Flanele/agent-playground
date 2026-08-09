import { Injectable } from '@nestjs/common';
import { Context, Input, Telegraf } from 'telegraf';
import { AgentService } from 'src/agent/agent.service';
import chalk from 'chalk';
import { parseTelegramDecision } from 'src/agent/utils/parse-telegram-decision';
import { TelegramEmoji } from 'telegraf/types';
import { ChatStorageService } from './chat-storage.service';
import { ImageInput, TelegramAgentResult } from './telegram.types';

@Injectable()
export class TelegramService {
  private bot: Telegraf;

  constructor(
    private readonly agentService: AgentService,
    private readonly chatStorageService: ChatStorageService,
  ) {
    const token = process.env.BOT_TOKEN;

    if (!token) {
      throw new Error('BOT_TOKEN is missing');
    }

    this.bot = new Telegraf(token, {
      handlerTimeout: 180_000,
    });
  }

  private async handleTelegramResponse(
    ctx: Context,
    result: TelegramAgentResult,
  ): Promise<void> {
    const decision = parseTelegramDecision(result.raw);

    console.log(`${chalk.yellow('TELEGRAM DECISION')}:`, decision);

    if (decision.reaction) {
      try {
        await ctx.telegram.callApi('setMessageReaction', {
          chat_id: ctx.chat!.id,
          message_id: ctx.message!.message_id,
          reaction: [
            {
              type: 'emoji',
              emoji: decision.reaction as TelegramEmoji,
            },
          ],
        });
      } catch (error) {
        console.error(`${chalk.red('REACTION ERROR')}:`, error);
      }
    }

    let sentMessage;

    if (result.artifacts.length > 0) {
      for (const artifact of result.artifacts) {
        await ctx.sendChatAction('upload_photo');

        sentMessage = await ctx.replyWithPhoto(
          Input.fromBuffer(artifact.data, 'generated-image.png'),
          {
            caption: decision.message || undefined,
            // @ts-expect-error legacy Telegram Bot API field
            reply_to_message_id: ctx.message!.message_id,
          },
        );
      }
    } else if (decision.shouldReply && decision.message) {
      sentMessage = await ctx.reply(decision.message, {
        reply_parameters: {
          message_id: ctx.message!.message_id,
        },
      });
    }

    if (!sentMessage || !decision.message) {
      return;
    }

    await this.chatStorageService.saveBotMessage({
      id: sentMessage.message_id,
      chatId: ctx.chat!.id,
      chatType: ctx.chat!.type,
      text: decision.message,
      sentAt: new Date(sentMessage.date * 1000).toISOString(),
      replyToMessageId: ctx.message!.message_id,
      from: {
        id: ctx.botInfo.id,
        name: ctx.botInfo.first_name,
        username: ctx.botInfo.username,
      },
    });
  }

  private async getTelegramImage(
    ctx: Context,
  ): Promise<ImageInput | undefined> {
    if (!ctx.message || !('photo' in ctx.message)) {
      return undefined;
    }

    const photo = ctx.message.photo.at(-1);

    if (!photo) {
      return undefined;
    }

    const fileUrl = await ctx.telegram.getFileLink(photo.file_id);
    const response = await fetch(fileUrl);

    if (!response.ok) {
      throw new Error(`Failed to download Telegram image: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    return {
      dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`,
    };
  }

  async start() {
    this.bot.use(async (ctx, next) => {
      if (!ctx.message || !ctx.chat || !ctx.from) {
        return next();
      }

      const hasText = 'text' in ctx.message;
      const hasPhoto = 'photo' in ctx.message;

      if (!hasText && !hasPhoto) {
        return next();
      }

      let text: string;

      if (hasText) {
        text = ctx.message.text;
      } else {
        const caption = ctx.message.caption?.trim();

        text = caption
          ? `[Image attached]\nCaption: ${caption}`
          : '[Image attached]';
      }

      const username = ctx.from?.first_name ?? 'unknown';

      console.log(`${chalk.cyan(username)}: ${text}`);

      const result = await this.chatStorageService.saveUserMessage({
        id: ctx.message.message_id,
        chatId: ctx.chat.id,
        chatType: ctx.chat.type,
        text,
        sentAt: new Date(ctx.message.date * 1000).toISOString(),
        replyToMessageId: ctx.message.reply_to_message?.message_id,
        from: {
          id: ctx.from.id,
          name: ctx.from.first_name,
          username: ctx.from.username,
        },
      });

      if (result.shouldExtractMemory) {
        const messages =
          await this.chatStorageService.extractUnprocessedMessages(
            result.chatId,
          );

        const memories = await this.chatStorageService.extractMemories(
          result.chatId,
        );

        console.log('MESSAGES FOR MEMORY:', messages);
        console.log('MEMORIES:', memories);

        const newMemories = await this.agentService.handleMemory(
          memories,
          messages,
        );

        for (const memory of newMemories) {
          await this.chatStorageService.writeMemoryToStorage(
            result.chatId,
            memory,
          );
        }

        await this.chatStorageService.markMemoryExtracted(result.chatId);
      }

      const originalReply = ctx.reply.bind(ctx);

      ctx.reply = async (...args) => {
        const botText = args[0];

        console.log(`${chalk.magenta('BOT')}: ${botText}`);
        return originalReply(...args);
      };

      await next();
    });

    this.bot.on('text', async (ctx, next) => {
      const repliedMessage = ctx.message.reply_to_message;
      const text = ctx.message.text ?? '';

      const isPrivate = ctx.chat.type === 'private';
      const isReplyToBot = repliedMessage?.from?.id === ctx.botInfo.id;
      const isMentioned = text.includes(`@${ctx.botInfo.username}`);

      if (!isPrivate && !isReplyToBot && !isMentioned) {
        return next();
      }

      const typingInterval = setInterval(() => {
        ctx.sendChatAction('typing').catch(console.error);
      }, 4000);

      try {
        await ctx.sendChatAction('typing');

        const result = await this.agentService.handleMessage({
          model: 'gpt-5-mini',
          source: 'telegram',
          temperature: 1.0,
          userId: `telegram:${ctx.chat.id}`,
          text,
          userMeta: {
            name: ctx.from.first_name,
            username: ctx.from.username,
          },
          botMeta: {
            name: ctx.botInfo.first_name,
            username: ctx.botInfo.username,
          },
          chatId: ctx.chat.id,
        });

        if (result.source !== 'telegram') {
          throw new Error('Expected Telegram agent result');
        }

        clearInterval(typingInterval);

        await this.handleTelegramResponse(ctx, result);
      } finally {
        clearInterval(typingInterval);
      }
    });

    this.bot.on('photo', async (ctx) => {
      const repliedMessage = ctx.message.reply_to_message;
      const caption = ctx.message.caption ?? '';

      const isPrivate = ctx.chat.type === 'private';
      const isReplyToBot = repliedMessage?.from?.id === ctx.botInfo.id;
      const isMentioned = caption.includes(`@${ctx.botInfo.username}`);

      if (!isPrivate && !isReplyToBot && !isMentioned) {
        return;
      }

      const typingInterval = setInterval(() => {
        ctx.sendChatAction('typing').catch(console.error);
      }, 4000);

      try {
        await ctx.sendChatAction('typing');

        const image = await this.getTelegramImage(ctx);
        const text = caption || 'Что изображено на этой картинке?';

        const result = await this.agentService.handleMessage({
          model: 'gpt-5-mini',
          source: 'telegram',
          temperature: 1.0,
          userId: `telegram:${ctx.chat.id}`,
          text,
          image,
          userMeta: {
            name: ctx.from.first_name,
            username: ctx.from.username,
          },
          botMeta: {
            name: ctx.botInfo.first_name,
            username: ctx.botInfo.username,
          },
          chatId: ctx.chat.id,
        });

        if (result.source !== 'telegram') {
          throw new Error('Expected Telegram agent result');
        }

        clearInterval(typingInterval);

        await this.handleTelegramResponse(ctx, result);
      } finally {
        clearInterval(typingInterval);
      }
    });

    this.bot.catch((err, ctx) => {
      console.error('BOT ERROR:', err);
      console.error('Update:', ctx.update);
    });

    await this.bot.launch();

    console.log(chalk.green('Telegram bot started'));
  }
}
