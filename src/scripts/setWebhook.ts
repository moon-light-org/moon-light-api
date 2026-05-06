import "dotenv/config";
import { bot, WEBHOOK_PATH } from "../server.js";

function getWebhookBaseUrl(): string {
  const baseUrl = process.env.BACKEND_PUBLIC_URL;
  if (!baseUrl) {
    throw new Error("BACKEND_PUBLIC_URL is required to register Telegram webhook");
  }
  if (!baseUrl.startsWith("https://")) {
    throw new Error("BACKEND_PUBLIC_URL must be HTTPS");
  }
  return baseUrl.replace(/\/+$/, "");
}

async function main() {
  const webhookUrl = `${getWebhookBaseUrl()}${WEBHOOK_PATH}`;
  await bot.telegram.setWebhook(webhookUrl);
  console.log(`Webhook set to: ${webhookUrl}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Failed to set webhook:", message);
  process.exit(1);
});
