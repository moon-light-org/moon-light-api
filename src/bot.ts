import { Telegraf } from 'telegraf';

export function initBot() {
  const token = process.env.BOT_TOKEN;
  const frontendUrl = process.env.FRONTEND_URL;

  if (!token) throw new Error('BOT_TOKEN missing in .env');
  if (!frontendUrl) throw new Error('FRONTEND_URL missing in .env');

  const bot = new Telegraf(token);

  bot.start(async (ctx) => {
    await ctx.reply('Open the app:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Open Web App', web_app: { url: frontendUrl } }]
        ]
      }
    });
  });

  bot.command('app', async (ctx) => {
    await ctx.reply('Open the app:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Open Web App', web_app: { url: frontendUrl } }]
        ]
      }
    });
  });

  return bot;
}
