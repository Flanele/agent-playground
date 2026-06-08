import { Injectable } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { AgentService } from 'src/agent/agent.service';
import chalk from 'chalk';
import { parseTelegramDecision } from 'src/agent/utils/parse-telegram-decision';
import { TelegramEmoji } from 'telegraf/types';
import { ChatStorageService } from './chat-storage.service';

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

    this.bot = new Telegraf(token);
  }

  async start() {
    this.bot.use(async (ctx, next) => {
      if (!ctx.message || !ctx.chat || !ctx.from || !('text' in ctx.message)) {
        return next();
      }

      const text = ctx.message.text;
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

        console.log('MESSAGES FOR MEMORY:', messages);

        await this.chatStorageService.markMemoryExtracted(result.chatId);
      }  // доделать обработку воспоминаний

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
      }, 1000);

      try {
        await ctx.sendChatAction('typing');

        const raw = await this.agentService.handleMessage({
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
        });

        const decision = parseTelegramDecision(raw);

        if (decision.reaction) {
          try {
            await ctx.telegram.callApi('setMessageReaction', {
              chat_id: ctx.chat.id,
              message_id: ctx.message.message_id,
              reaction: [
                {
                  type: 'emoji',
                  emoji: decision.reaction as TelegramEmoji,
                },
              ],
            });

            console.log(
              `${chalk.magenta('BOT')} reacted with ${decision.reaction}`,
            );
          } catch (error) {
            console.error(`${chalk.red('REACTION ERROR')}:`, error);
          }
        }

        if (decision.shouldReply && decision.message) {
          const sentMessage = await ctx.reply(decision.message, {
            reply_parameters: {
              message_id: ctx.message.message_id,
            },
          });

          await this.chatStorageService.saveBotMessage({
            id: sentMessage.message_id,
            chatId: ctx.chat.id,
            chatType: ctx.chat.type,
            text: decision.message,
            sentAt: new Date(sentMessage.date * 1000).toISOString(),
            replyToMessageId: ctx.message.message_id,
            from: {
              id: ctx.botInfo.id,
              name: ctx.botInfo.first_name,
              username: ctx.botInfo.username,
            },
          });
        }
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
