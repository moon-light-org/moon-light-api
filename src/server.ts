import { createApp } from "./app.js";
import { initBot } from "./bot.js";
import { SupabaseDbService } from "./services/supabaseDb.js";

export const WEBHOOK_PATH = "/tg/webhook";

const db = new SupabaseDbService();
export const app = createApp(db);

export const bot = initBot();
app.use(bot.webhookCallback(WEBHOOK_PATH));
