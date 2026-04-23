import "dotenv/config";
import { createApp } from "./app.js";
import { initBot } from "./bot.js";
import { SupabaseDbService } from "./services/supabaseDb.js";

const port = Number(process.env.PORT || 3000);
const WEBHOOK_PATH = "/tg/webhook";

const db = new SupabaseDbService();
const app = createApp(db);

const bot = initBot();
app.use(bot.webhookCallback(WEBHOOK_PATH));

app.listen(port, async () => {
  console.log(`Backend listening on http://localhost:${port}`);
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) {
    const webhookUrl = `${frontendUrl}${WEBHOOK_PATH}`;
    await bot.telegram.setWebhook(webhookUrl);
    console.log("Webhook set to:", webhookUrl);
  }
});
