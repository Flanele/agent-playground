import { Injectable } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { AgentService } from 'src/agent/agent.service';
import chalk from 'chalk';
import { parseTelegramDecision } from 'src/agent/utils/parse-telegram-decision';
import { TelegramEmoji } from 'telegraf/types';

@Injectable()
export class TelegramService {
  private bot: Telegraf;

  constructor(private readonly agentService: AgentService) {
    const token = process.env.BOT_TOKEN;

    if (!token) {
      throw new Error('BOT_TOKEN is missing');
    }

    this.bot = new Telegraf(token);
  }

  async start() {
    this.bot.use(async (ctx, next) => {
      const username = ctx.from?.first_name ?? 'unknown';
      const text =
        ctx.message && 'text' in ctx.message ? ctx.message.text : undefined;

      if (text) {
        console.log(`${chalk.cyan(username)}: ${text}`);
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
      }, 1000);

      try {
        await ctx.sendChatAction('typing');

        const raw = await this.agentService.handleMessage({
          model: 'gpt-5-mini',
          source: 'telegram',
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
          console.log(`${chalk.magenta('BOT')}: ${decision.message}`);

          await ctx.reply(decision.message, {
            reply_parameters: {
              message_id: ctx.message.message_id,
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
